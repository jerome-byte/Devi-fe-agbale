"""Administration du district : structures (hôpital, centre de santé, garderie) et comptes.

Réservé au pilotage. Le relais de l'application (apps/frontend, /api/backend) vérifie
le rôle avant d'appeler ces routes, et transmet l'identifiant de l'utilisateur connecté
dans l'en-tête `x-devi-utilisateur`.

Les comptes sont créés dans Supabase Auth avec la clé d'administration
(SUPABASE_SERVICE_ROLE_KEY). Cette clé ne vit que sur le serveur du backend :
le navigateur ne la voit jamais.

Règles :
- le pilotage crée des comptes d'agent (rattachés à un hôpital ou un centre de santé)
  et d'éducatrice (rattachés à une garderie) ;
- un mot de passe provisoire est généré ici et renvoyé une seule fois ;
- un compte désactivé ne peut plus se connecter (Supabase Auth) et ne lit plus rien
  dans la base (profiles.active, voir sql/07_comptes_structures.sql) ;
- les comptes de pilotage et d'administration ne se gèrent pas depuis ces pages.
"""

import secrets
from typing import Annotated, Literal
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from .securite import admin

router = APIRouter(prefix="/admin", dependencies=[Depends(admin)])

TypeStructure = Literal["hopital", "centre", "garderie"]
RoleGere = Literal["agent", "educatrice"]

# Lettres et chiffres sans ambiguïté à la lecture (pas de 0/O, 1/l/I).
ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"
BANNI = "876000h"  # environ 100 ans : désactivation jusqu'à réactivation


def mot_de_passe_provisoire() -> str:
    """Ex. « Kp7m-x3Rt-9hWq » : 12 caractères aléatoires, lisibles à voix haute."""
    return "-".join("".join(secrets.choice(ALPHABET) for _ in range(4)) for _ in range(3))


# ---------- Supabase Auth (API d'administration) ------------------------------


class AuthAdmin:
    def __init__(self, url: str, cle: str):
        if not url or not cle:
            raise HTTPException(503, "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY non configuré sur le backend")
        self.base = url.rstrip("/") + "/auth/v1/admin/users"
        # Nouvelles clés secrètes (sb_secret_...) : en-tête apikey seul.
        # Ancienne clé service_role (JWT) : apikey et Authorization.
        self.entetes = {"apikey": cle}
        if not cle.startswith("sb_"):
            self.entetes["authorization"] = f"Bearer {cle}"

    async def _appel(self, methode: str, chemin: str = "", corps: dict | None = None) -> dict:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.request(methode, self.base + chemin, headers=self.entetes, json=corps)
        if r.status_code >= 400:
            try:
                info = r.json()
                detail = info.get("msg") or info.get("message") or info.get("error_description") or info.get("error") or r.text
            except ValueError:
                detail = r.text
            if r.status_code == 422 and "already" in str(detail).lower():
                raise HTTPException(409, "un compte existe déjà avec cet e-mail")
            raise HTTPException(502, f"Supabase Auth ({r.status_code}) : {detail}")
        return r.json() if r.content else {}

    async def creer(self, email: str, mot_de_passe: str, nom: str) -> str:
        u = await self._appel(
            "POST", "", {"email": email, "password": mot_de_passe, "email_confirm": True, "user_metadata": {"full_name": nom}}
        )
        return u["id"]

    async def supprimer(self, uid: str) -> None:
        await self._appel("DELETE", f"/{uid}")

    async def bannir(self, uid: str, oui: bool) -> None:
        await self._appel("PUT", f"/{uid}", {"ban_duration": BANNI if oui else "none"})

    async def changer_mot_de_passe(self, uid: str, mot_de_passe: str) -> None:
        await self._appel("PUT", f"/{uid}", {"password": mot_de_passe})


def auth_admin(request: Request) -> AuthAdmin:
    s = request.app.state.settings
    return AuthAdmin(s.supabase_url, s.supabase_service_role_key)


Utilisateur = Annotated[UUID | None, Header(alias="x-devi-utilisateur")]


# ---------- Zones -------------------------------------------------------------


class NouvelleZone(BaseModel):
    nom: str = Field(min_length=2, max_length=80)
    commune: str | None = Field(default=None, max_length=80)

    @field_validator("nom", "commune", mode="before")
    @classmethod
    def propre(cls, v):
        if isinstance(v, str):
            v = " ".join(v.split())
            return v or None
        return v


@router.post("/zones", status_code=201)
async def creer_zone(request: Request, corps: NouvelleZone):
    """Nouvelle zone (quartier ou aire de santé) du district."""
    async with request.app.state.pool.connection() as conn, conn.transaction():
        if await (await conn.execute("select 1 from zones where lower(name) = lower(%s)", (corps.nom,))).fetchone():
            raise HTTPException(409, "une zone porte déjà ce nom")
        await conn.execute("lock table zones in share row exclusive mode")
        ligne = await (
            await conn.execute(
                """insert into zones (id, name, commune, prefecture)
                   values ((select coalesce(max(id), 0) + 1 from zones), %s, %s, 'Golfe') returning id""",
                (corps.nom, corps.commune),
            )
        ).fetchone()
    return {"id": ligne["id"], "nom": corps.nom}


# ---------- Structures --------------------------------------------------------


class NouvelleStructure(BaseModel):
    type: TypeStructure
    nom: str = Field(min_length=3, max_length=120)
    zone_id: int
    centre_id: int | None = None  # garderie : centre de santé partenaire

    @field_validator("nom", mode="before")
    @classmethod
    def propre(cls, v):
        return " ".join(v.split()) if isinstance(v, str) else v


SQL_STRUCTURES = """
select * from (
select case when h.kind = 'hopital' then 'hopital' else 'centre' end as type,
       h.id, h.name as nom, h.zone_id, z.name as zone, null::int as centre_id, null::text as centre,
       (select count(*) from profiles p where p.center_id = h.id and p.role = 'agent') as comptes,
       (select count(*) from children c where c.center_id = h.id) as enfants
from health_centers h left join zones z on z.id = h.zone_id
union all
select 'garderie', d.id, d.name, d.zone_id, z.name, d.center_id, h.name,
       (select count(*) from profiles p where p.daycare_id = d.id and p.role = 'educatrice'),
       (select count(*) from children c where c.daycare_id = d.id)
from daycares d left join zones z on z.id = d.zone_id left join health_centers h on h.id = d.center_id
) s
order by case type when 'hopital' then 1 when 'centre' then 2 else 3 end, nom
"""


@router.get("/structures")
async def lister_structures(request: Request):
    async with request.app.state.pool.connection() as conn:
        zones = await (await conn.execute("select id, name as nom from zones order by name")).fetchall()
        structures = await (await conn.execute(SQL_STRUCTURES)).fetchall()
    return {"zones": zones, "structures": structures}


@router.post("/structures", status_code=201)
async def creer_structure(request: Request, corps: NouvelleStructure):
    async with request.app.state.pool.connection() as conn, conn.transaction():
        if not await (await conn.execute("select 1 from zones where id = %s", (corps.zone_id,))).fetchone():
            raise HTTPException(422, "zone inconnue")
        table = "daycares" if corps.type == "garderie" else "health_centers"
        doublon = await (
            await conn.execute(f"select 1 from {table} where lower(name) = lower(%s)", (corps.nom,))
        ).fetchone()
        if doublon:
            raise HTTPException(409, "une structure porte déjà ce nom")
        # Identifiants entiers sans séquence dans le schéma : verrou, puis max + 1.
        await conn.execute(f"lock table {table} in share row exclusive mode")
        if corps.type == "garderie":
            if corps.centre_id is not None and not await (
                await conn.execute("select 1 from health_centers where id = %s", (corps.centre_id,))
            ).fetchone():
                raise HTTPException(422, "centre de santé partenaire inconnu")
            ligne = await (
                await conn.execute(
                    """insert into daycares (id, name, zone_id, center_id)
                       values ((select coalesce(max(id), 0) + 1 from daycares), %s, %s, %s) returning id""",
                    (corps.nom, corps.zone_id, corps.centre_id),
                )
            ).fetchone()
        else:
            ligne = await (
                await conn.execute(
                    """insert into health_centers (id, name, zone_id, kind)
                       values ((select coalesce(max(id), 0) + 1 from health_centers), %s, %s, %s) returning id""",
                    (corps.nom, corps.zone_id, corps.type),
                )
            ).fetchone()
    return {"type": corps.type, "id": ligne["id"], "nom": corps.nom}


# ---------- Comptes -----------------------------------------------------------


class NouveauCompte(BaseModel):
    nom: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=200, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    role: RoleGere
    structure_id: int

    @field_validator("email", mode="before")
    @classmethod
    def minuscules(cls, v):
        return v.strip().lower() if isinstance(v, str) else v

    @field_validator("nom", mode="before")
    @classmethod
    def propre(cls, v):
        return " ".join(v.split()) if isinstance(v, str) else v


class EtatCompte(BaseModel):
    actif: bool


SQL_COMPTES = """
select p.id, p.full_name as nom, p.email, p.role, p.active as actif, p.created_at as cree_le,
       case when p.role = 'educatrice' then 'garderie'
            when h.kind = 'hopital' then 'hopital'
            when p.center_id is not null then 'centre' end as type_structure,
       coalesce(d.name, h.name) as structure, coalesce(p.daycare_id, p.center_id) as structure_id,
       u.last_sign_in_at as derniere_connexion
from profiles p
left join health_centers h on h.id = p.center_id
left join daycares d on d.id = p.daycare_id
left join auth.users u on u.id = p.id
where p.role in ('agent', 'educatrice')
order by p.active desc, coalesce(d.name, h.name), p.full_name
"""


async def _compte_gere(conn, uid: UUID) -> dict:
    """Le compte doit exister et être un agent ou une éducatrice."""
    p = await (await conn.execute("select id, role from profiles where id = %s", (uid,))).fetchone()
    if not p:
        raise HTTPException(404, "compte introuvable")
    if p["role"] not in ("agent", "educatrice"):
        raise HTTPException(403, "ce compte ne se gère pas depuis cette page")
    return p


@router.get("/comptes")
async def lister_comptes(request: Request):
    async with request.app.state.pool.connection() as conn:
        return await (await conn.execute(SQL_COMPTES)).fetchall()


@router.post("/comptes", status_code=201)
async def creer_compte(request: Request, corps: NouveauCompte, utilisateur: Utilisateur = None):
    auth = auth_admin(request)
    pool = request.app.state.pool

    # 1. La structure doit correspondre au rôle.
    async with pool.connection() as conn:
        if corps.role == "educatrice":
            s = await (await conn.execute("select name from daycares where id = %s", (corps.structure_id,))).fetchone()
            if not s:
                raise HTTPException(422, "une éducatrice se rattache à une garderie existante")
        else:
            s = await (await conn.execute("select name from health_centers where id = %s", (corps.structure_id,))).fetchone()
            if not s:
                raise HTTPException(422, "un agent se rattache à un hôpital ou un centre de santé existant")
        if await (await conn.execute("select 1 from profiles where lower(email) = %s", (corps.email,))).fetchone():
            raise HTTPException(409, "un compte existe déjà avec cet e-mail")

    # 2. Compte de connexion (Supabase Auth), puis profil. Si le profil échoue, on annule.
    mot_de_passe = mot_de_passe_provisoire()
    uid = await auth.creer(corps.email, mot_de_passe, corps.nom)
    try:
        async with pool.connection() as conn, conn.transaction():
            createur = None
            if utilisateur and await (await conn.execute("select 1 from profiles where id = %s", (utilisateur,))).fetchone():
                createur = utilisateur
            await conn.execute(
                """insert into profiles (id, full_name, role, center_id, daycare_id, email, active, created_by)
                   values (%s, %s, %s, %s, %s, %s, true, %s)""",
                (
                    uid,
                    corps.nom,
                    corps.role,
                    corps.structure_id if corps.role == "agent" else None,
                    corps.structure_id if corps.role == "educatrice" else None,
                    corps.email,
                    createur,
                ),
            )
    except Exception:
        await auth.supprimer(uid)
        raise

    return {"id": uid, "email": corps.email, "nom": corps.nom, "structure": s["name"], "mot_de_passe": mot_de_passe}


@router.patch("/comptes/{uid}")
async def changer_etat(request: Request, uid: UUID, corps: EtatCompte):
    auth = auth_admin(request)
    async with request.app.state.pool.connection() as conn:
        await _compte_gere(conn, uid)
    # D'abord la connexion (Supabase Auth), puis la base : en cas d'échec, rien n'est à moitié fait.
    await auth.bannir(str(uid), not corps.actif)
    async with request.app.state.pool.connection() as conn:
        await conn.execute("update profiles set active = %s where id = %s", (corps.actif, uid))
    return {"id": str(uid), "actif": corps.actif}


@router.post("/comptes/{uid}/mot-de-passe")
async def reinitialiser(request: Request, uid: UUID):
    auth = auth_admin(request)
    async with request.app.state.pool.connection() as conn:
        await _compte_gere(conn, uid)
    mot_de_passe = mot_de_passe_provisoire()
    await auth.changer_mot_de_passe(str(uid), mot_de_passe)
    return {"id": str(uid), "mot_de_passe": mot_de_passe}
