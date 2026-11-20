"""Écritures de l'application (agent de santé, éducatrice).

L'application lit Supabase directement, en lecture seule. Toutes ses écritures passent
par ici, avec la connexion serveur : la base peut rester fermée à la clé publique (RLS).
Les calculs (dates de rendez-vous, z-score, statut, tendance) restent ceux de la base.
"""

from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field

from .envoi import envoyer_lot
from .securite import admin

router = APIRouter(prefix="/app", dependencies=[Depends(admin)])

LANGUES = {"ewe": "ewe", "mina": "mina", "kabiye": "kabiye", "francais": "fr", "fr": "fr"}


class Dose(BaseModel):
    code: str  # vaccine_code de la base (BCG, PENTA...)
    dose: int


class DoseFaite(Dose):
    date: date


class Inscription(BaseModel):
    prenom: str = Field(min_length=1)
    sexe: Literal["F", "M"]
    naissance: date
    centre: str  # clé du catalogue audio : be_kpota | sylvanus_olympio
    tuteur_nom: str
    telephone: str
    langue: str = "ewe"
    acte_naissance: bool
    vaccins_faits: list[DoseFaite] = []
    poids_kg: float | None = None
    taille_cm: float | None = None


class Vaccination(BaseModel):
    doses: list[Dose]
    date: date


class Pesee(BaseModel):
    date: date
    poids_kg: float = Field(gt=0, lt=40)
    taille_cm: float | None = Field(default=None, gt=20, lt=140)


class Acte(BaseModel):
    valeur: bool


SQL_DOSE_FAITE = """
update appointments a set status = 'done', done_at = %(date)s
from vaccine_schedule s
where s.id = a.schedule_id and a.child_id = %(enfant)s
  and s.vaccine_code = %(code)s and s.dose = %(dose)s
"""


async def _id_centre(conn, catalogue, cle: str) -> int:
    lignes = await (await conn.execute("select id, name from health_centers order by id")).fetchall()
    for ligne in lignes:
        if catalogue.centre_cle(ligne["name"]) == cle:
            return ligne["id"]
    raise HTTPException(422, f"centre « {cle} » absent de la table health_centers")


async def _centre_de(conn, utilisateur: UUID | None) -> int | None:
    """Centre de l'agent connecté (transmis par le relais de l'application)."""
    if not utilisateur:
        return None
    p = await (
        await conn.execute("select center_id from profiles where id = %s and role = 'agent'", (utilisateur,))
    ).fetchone()
    return p["center_id"] if p else None


@router.post("/enfants", status_code=201)
async def inscrire(
    request: Request,
    corps: Inscription,
    taches: BackgroundTasks,
    utilisateur: Annotated[UUID | None, Header(alias="x-devi-utilisateur")] = None,
):
    s = request.app.state
    async with s.pool.connection() as conn, conn.transaction():
        # Un agent inscrit toujours dans son propre centre, y compris un centre créé par le pilotage.
        centre_id = await _centre_de(conn, utilisateur) or await _id_centre(conn, s.catalogue, corps.centre)
        # Le déclencheur de la base crée le calendrier vaccinal de l'enfant.
        enfant = await (
            await conn.execute(
                """insert into children (first_name, birth_date, sex, center_id, has_birth_certificate, zone_id, created_by)
                   values (%s, %s, %s, %s, %s, (select zone_id from health_centers where id = %s),
                           (select id from profiles where id = %s))
                   returning id""",
                (corps.prenom, corps.naissance, corps.sexe, centre_id, corps.acte_naissance, centre_id, utilisateur),
            )
        ).fetchone()
        enfant_id = enfant["id"]
        tuteur = await (
            await conn.execute(
                """insert into guardians (child_id, name, phone, language, channel_pref, is_primary, consent_at)
                   values (%s, %s, %s, %s, 'whatsapp', true, now()) returning id""",
                (enfant_id, corps.tuteur_nom, corps.telephone, LANGUES.get(corps.langue, "ewe")),
            )
        ).fetchone()
        # Vaccins déjà faits (carnet papier) : sans eux, l'enfant serait « en retard » dès l'inscription.
        for d in corps.vaccins_faits:
            await conn.execute(SQL_DOSE_FAITE, {"enfant": enfant_id, "code": d.code, "dose": d.dose, "date": d.date})
        if corps.poids_kg:
            await conn.execute(
                "insert into weigh_ins (child_id, measured_at, weight_kg, height_cm) values (%s, current_date, %s, %s)",
                (enfant_id, corps.poids_kg, corps.taille_cm),
            )
        await conn.execute(
            """insert into messages (child_id, guardian_id, template_code, channel, language, scheduled_for, status)
               values (%s, %s, 'WELCOME', 'whatsapp', %s, now(), 'scheduled')""",
            (enfant_id, tuteur["id"], LANGUES.get(corps.langue, "ewe")),
        )
        # La base décide du reste (acte de naissance...). Lookback 0 : pas de relance
        # « vaccin manqué » le jour même de l'inscription pour un retard ancien.
        await conn.execute("select * from run_rules(current_date, %s, false, 0)", (enfant_id,))

    taches.add_task(envoyer_lot, s.pool, s.catalogue, s.client, s.settings)
    return {"id": str(enfant_id)}


@router.post("/enfants/{enfant_id}/vaccins")
async def vacciner(request: Request, enfant_id: UUID, corps: Vaccination):
    async with request.app.state.pool.connection() as conn, conn.transaction():
        for d in corps.doses:
            await conn.execute(SQL_DOSE_FAITE, {"enfant": enfant_id, "code": d.code, "dose": d.dose, "date": corps.date})
    return {"ok": True}


@router.post("/enfants/{enfant_id}/pesees", status_code=201)
async def peser(request: Request, enfant_id: UUID, corps: Pesee):
    async with request.app.state.pool.connection() as conn, conn.transaction():
        # Une seule mesure par jour : une nouvelle saisie corrige celle du jour.
        await conn.execute(
            "delete from weigh_ins where child_id = %s and measured_at = %s", (enfant_id, corps.date)
        )
        # z-score, statut et tendance sont calculés par le déclencheur de la base.
        ligne = await (
            await conn.execute(
                """insert into weigh_ins (child_id, measured_at, weight_kg, height_cm) values (%s, %s, %s, %s)
                   returning z_score, status, trend""",
                (enfant_id, corps.date, corps.poids_kg, corps.taille_cm),
            )
        ).fetchone()
    return ligne


@router.patch("/enfants/{enfant_id}/acte")
async def acte(request: Request, enfant_id: UUID, corps: Acte):
    async with request.app.state.pool.connection() as conn:
        await conn.execute(
            """update children set has_birth_certificate = %s,
                      birth_cert_resolved_at = case when %s then current_date end
               where id = %s""",
            (corps.valeur, corps.valeur, enfant_id),
        )
    return {"ok": True}


@router.post("/messages/{message_id}/ecoute")
async def ecoute(request: Request, message_id: UUID):
    async with request.app.state.pool.connection() as conn:
        await conn.execute(
            "update messages set status = 'listened' where id = %s and status in ('sent', 'delivered')",
            (message_id,),
        )
    return {"ok": True}
