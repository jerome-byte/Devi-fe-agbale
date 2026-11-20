"""Backend ɖevi ƒe agbalẽ : envoi WhatsApp des messages décidés par la base, et webhook des réponses.

Circuit (voix/README_voix.md) :
1. la base (run_rules, Cherif) écrit une ligne `messages` en statut « scheduled » ;
2. ce backend l'envoie sur WhatsApp et la passe à « sent » ;
3. le webhook reçoit la réponse « 1 » / « 2 » et met en file reponse_vient / reponse_empechement ;
4. la base alerte l'agent et le tableau de bord affiche le journal.
"""

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from dataclasses import asdict
from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool
from pydantic import BaseModel

from .catalogue import Catalogue
from .comptes import router as router_comptes
from .config import Settings, chiffres, get_settings
from .envoi import envoyer_lot
from .routes_app import router as router_app
from .securite import admin
from .reponses import Reponse, lire_evenements, signature_valide, traiter_accuse, traiter_reponse
from .whatsapp import ClientMeta, ClientSimulation

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s : %(message)s")
log = logging.getLogger("devi")


async def _boucle(nom: str, intervalle_s: int, action) -> None:
    while True:
        try:
            await action()
        except Exception:  # la boucle ne doit jamais s'arrêter sur une erreur ponctuelle
            log.exception("boucle %s : erreur", nom)
        await asyncio.sleep(intervalle_s)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    settings.verifier()

    # prepare_threshold=None : compatible avec le pooler de Supabase.
    pool = AsyncConnectionPool(
        settings.database_url,
        kwargs={"row_factory": dict_row, "autocommit": True, "prepare_threshold": None},
        min_size=1,
        max_size=5,
        open=False,
    )
    await pool.open()

    client = (
        ClientSimulation()
        if settings.simulation
        else ClientMeta(settings.whatsapp_token, settings.whatsapp_phone_number_id, settings.whatsapp_api_version)
    )
    app.state.settings = settings
    app.state.pool = pool
    app.state.catalogue = Catalogue(settings.voix_racine)
    app.state.client = client
    log.info("mode %s, destinataires autorisés : %s", settings.whatsapp_mode, settings.filtre_destinataires or "tous")

    taches = []
    if settings.envoi_intervalle_s > 0:
        taches.append(asyncio.create_task(_boucle("envoi", settings.envoi_intervalle_s, lambda: envoyer(app))))
    if settings.regles_intervalle_s > 0:
        taches.append(asyncio.create_task(_boucle("règles", settings.regles_intervalle_s, lambda: run_rules(app))))

    yield

    for t in taches:
        t.cancel()
    if isinstance(client, ClientMeta):
        await client.fermer()
    await pool.close()


app = FastAPI(title="ɖevi ƒe agbalẽ — backend", lifespan=lifespan)
app.include_router(router_app)
app.include_router(router_comptes)


async def envoyer(app: FastAPI):
    s = app.state
    return await envoyer_lot(s.pool, s.catalogue, s.client, s.settings)


async def run_rules(app: FastAPI, jour: date | None = None) -> list[dict]:
    async with app.state.pool.connection() as conn:
        if jour is None:
            cur = await conn.execute("select rule, n from run_rules()")
        else:
            cur = await conn.execute("select rule, n from run_rules(%s::date)", (jour,))
        return await cur.fetchall()


# ---------- Santé -------------------------------------------------------------


@app.get("/sante")
async def sante(request: Request):
    async with request.app.state.pool.connection() as conn:
        await conn.execute("select 1")
    return {"ok": True, "mode": request.app.state.settings.whatsapp_mode}


# ---------- Webhook WhatsApp --------------------------------------------------


@app.get("/webhook/whatsapp", response_class=PlainTextResponse)
async def verifier_webhook(
    request: Request,
    mode: Annotated[str | None, Query(alias="hub.mode")] = None,
    jeton: Annotated[str | None, Query(alias="hub.verify_token")] = None,
    challenge: Annotated[str | None, Query(alias="hub.challenge")] = None,
):
    attendu = request.app.state.settings.whatsapp_verify_token
    if mode == "subscribe" and attendu and jeton == attendu and challenge:
        return challenge
    raise HTTPException(403, "vérification refusée")


@app.post("/webhook/whatsapp")
async def webhook(request: Request, taches: BackgroundTasks):
    settings: Settings = request.app.state.settings
    corps = await request.body()
    if settings.whatsapp_app_secret and not signature_valide(
        settings.whatsapp_app_secret, corps, request.headers.get("x-hub-signature-256")
    ):
        raise HTTPException(401, "signature invalide")
    if not settings.whatsapp_app_secret and not settings.simulation:
        raise HTTPException(503, "WHATSAPP_APP_SECRET non configuré")

    try:
        reponses, accuses = lire_evenements(json.loads(corps))
    except ValueError:
        raise HTTPException(400, "JSON invalide")

    pool = request.app.state.pool
    traitees = [r for r in [await traiter_reponse(pool, rep) for rep in reponses] if r]
    for accuse in accuses:
        await traiter_accuse(pool, accuse)
    if traitees:
        # Envoyer tout de suite reponse_vient / reponse_empechement, sans attendre la boucle.
        taches.add_task(envoyer, request.app)
    return {"reponses": len(traitees), "accuses": len(accuses)}


# ---------- Administration (démo, tableau de bord) ----------------------------


@app.post("/admin/envoyer", dependencies=[Depends(admin)])
async def admin_envoyer(request: Request):
    """Envoie maintenant tous les messages dus."""
    return asdict(await envoyer(request.app))


@app.post("/admin/regles", dependencies=[Depends(admin)])
async def admin_regles(request: Request, jour: date | None = None, envoyer_ensuite: bool = True):
    """Lance le moteur de règles de la base (run_rules), puis envoie ce qu'il a décidé."""
    regles = await run_rules(request.app, jour)
    rapport = asdict(await envoyer(request.app)) if envoyer_ensuite else None
    return {"regles": regles, "envoi": rapport}


@app.get("/admin/messages", dependencies=[Depends(admin)])
async def admin_messages(
    request: Request,
    statut: Literal["scheduled", "sent", "delivered", "listened", "failed"] | None = None,
    limite: int = 50,
):
    async with request.app.state.pool.connection() as conn:
        cur = await conn.execute(
            """
            select m.id, m.template_code, m.channel, m.status, m.scheduled_for, m.sent_at,
                   m.response_key, m.responded_at, m.error, m.attempts, m.audio_url, m.is_simulated,
                   c.first_name, g.phone
            from messages m
            join children c on c.id = m.child_id
            left join guardians g on g.id = m.guardian_id
            where %(statut)s::text is null or m.status = %(statut)s::text
            order by coalesce(m.sent_at, m.scheduled_for) desc nulls last
            limit %(limite)s
            """,
            {"statut": statut, "limite": min(limite, 500)},
        )
        return await cur.fetchall()


Evenement = Literal["J-2", "J-1", "J0", "MISSED_3", "MISSED_7"]


@app.post("/admin/demo/{child_id}/reset", dependencies=[Depends(admin)])
async def admin_demo_reset(request: Request, child_id: UUID):
    """Remet l'enfant à zéro entre deux répétitions (sql/06_demo_envoi.sql)."""
    async with request.app.state.pool.connection() as conn:
        await conn.execute("select demo_reset_envoi(%s)", (child_id,))
    return {"ok": True}


@app.post("/admin/demo/{child_id}/{evenement}", dependencies=[Depends(admin)])
async def admin_demo(request: Request, child_id: UUID, evenement: Evenement):
    """Avance rapide de la démo, avec envoi réel sur WhatsApp (sql/06_demo_envoi.sql)."""
    async with request.app.state.pool.connection() as conn:
        cur = await conn.execute("select * from demo_envoyer(%s, %s)", (child_id, evenement))
        regles = await cur.fetchall()
    return {"regles": regles, "envoi": asdict(await envoyer(request.app))}


# ---------- Simulation : la famille touche « 1 » ou « 2 » sans passer par Meta --


class ReponseSimulee(BaseModel):
    telephone: str
    cle: Literal[1, 2]


@app.post("/simulation/reponse", dependencies=[Depends(admin)])
async def simuler_reponse(request: Request, corps: ReponseSimulee):
    if not request.app.state.settings.simulation:
        raise HTTPException(409, "disponible seulement en mode simulation")
    resultat = await traiter_reponse(request.app.state.pool, Reponse(chiffres(corps.telephone), corps.cle))
    if resultat is None:
        raise HTTPException(404, "aucune relance MISSED_3 envoyée à ce numéro")
    rapport = await envoyer(request.app)
    return {**resultat, "envoi": asdict(rapport)}
