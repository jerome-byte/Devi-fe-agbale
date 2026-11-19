"""Étape 3 du circuit : ce que WhatsApp renvoie au webhook.

- Réponse de la famille « 1 » / « 2 » à `manque_3j` : enregistrée sur la ligne MISSED_3,
  puis `reponse_vient` ou `reponse_empechement` est mis en file d'envoi.
- Accusés (distribué, lu, échec) : mettent à jour le statut de la ligne.
"""

import hashlib
import hmac
import logging
from dataclasses import dataclass

from psycopg_pool import AsyncConnectionPool

from .catalogue import REPONSES
from .config import chiffres

log = logging.getLogger("devi.reponses")


@dataclass(frozen=True)
class Reponse:
    telephone: str
    cle: int
    contexte: str | None = None  # id WhatsApp du message auquel la famille répond


@dataclass(frozen=True)
class Accuse:
    wa_message_id: str
    statut: str  # statut de notre table messages
    erreur: str | None = None


# Statuts WhatsApp -> statuts de la table messages (Cherif)
STATUTS = {"sent": "sent", "delivered": "delivered", "read": "listened", "played": "listened", "failed": "failed"}


def signature_valide(secret: str, corps: bytes, entete: str | None) -> bool:
    if not entete or not entete.startswith("sha256="):
        return False
    attendu = hmac.new(secret.encode(), corps, hashlib.sha256).hexdigest()
    return hmac.compare_digest(attendu, entete.removeprefix("sha256="))


def _cle(message: dict) -> int | None:
    """Bouton touché (« 1 » / « 2 »), ou chiffre tapé en texte."""
    match message.get("type"):
        case "interactive":
            valeur = message.get("interactive", {}).get("button_reply", {}).get("id")
        case "button":
            valeur = message.get("button", {}).get("payload") or message.get("button", {}).get("text")
        case "text":
            valeur = message.get("text", {}).get("body")
        case _:
            valeur = None
    valeur = (valeur or "").strip()
    return int(valeur) if valeur in ("1", "2") else None


def lire_evenements(payload: dict) -> tuple[list[Reponse], list[Accuse]]:
    reponses: list[Reponse] = []
    accuses: list[Accuse] = []
    for entree in payload.get("entry", []):
        for changement in entree.get("changes", []):
            valeur = changement.get("value", {})
            for message in valeur.get("messages", []):
                cle = _cle(message)
                if cle is None:
                    log.info("message entrant ignoré (type %s)", message.get("type"))
                    continue
                reponses.append(
                    Reponse(chiffres(message.get("from", "")), cle, message.get("context", {}).get("id"))
                )
            for statut in valeur.get("statuses", []):
                notre_statut = STATUTS.get(statut.get("status", ""))
                if notre_statut is None:
                    continue
                erreurs = statut.get("errors") or []
                erreur = "; ".join(e.get("title") or e.get("message", "") for e in erreurs) or None
                accuses.append(Accuse(statut["id"], notre_statut, erreur))
    return reponses, accuses


# Dernière relance MISSED_3 envoyée à ce numéro ; celle citée par la réponse passe en premier.
SQL_REPONSE = r"""
with cible as (
  select m.id
  from messages m
  join guardians g on g.id = m.guardian_id
  where m.template_code = 'MISSED_3'
    and m.status in ('sent', 'delivered', 'listened')
    and regexp_replace(g.phone, '\D', '', 'g') = %(tel)s
    and m.sent_at >= now() - interval '30 days'
  order by (m.wa_message_id is not distinct from %(contexte)s::text) desc, m.sent_at desc
  limit 1
  for update of m
)
update messages m
set response_key = %(cle)s, responded_at = now()
from cible
where m.id = cible.id
returning m.id, m.child_id, m.guardian_id, m.appointment_id, m.language
"""

# Une seule réponse « vient » / « empêchement » par rendez-vous (contrainte unique de la table).
SQL_FILE_REPONSE = """
insert into messages (child_id, guardian_id, appointment_id, template_code, channel, language,
                      scheduled_for, status)
values (%(child_id)s, %(guardian_id)s, %(appointment_id)s, %(code)s, 'whatsapp', %(language)s,
        now(), 'scheduled')
on conflict (appointment_id, template_code, channel) do nothing
"""

# On ne revient jamais en arrière (un « distribué » tardif n'efface pas un « lu »).
SQL_ACCUSE = """
update messages
set status = %(statut)s, error = coalesce(%(erreur)s, error)
where wa_message_id = %(wa_id)s
  and status <> 'listened'
  and (%(statut)s::text = 'failed'
       or array_position(array['scheduled','sent','delivered','listened'], status)
          < array_position(array['scheduled','sent','delivered','listened'], %(statut)s::text))
"""


async def traiter_reponse(pool: AsyncConnectionPool, reponse: Reponse) -> dict | None:
    async with pool.connection() as conn, conn.transaction():
        ligne = await (
            await conn.execute(
                SQL_REPONSE, {"tel": reponse.telephone, "cle": reponse.cle, "contexte": reponse.contexte}
            )
        ).fetchone()
        if ligne is None:
            log.info("réponse %s de %s : aucune relance MISSED_3 en attente", reponse.cle, reponse.telephone)
            return None
        code = REPONSES[reponse.cle]
        await conn.execute(SQL_FILE_REPONSE, {**ligne, "code": code})
    log.info("réponse %s enregistrée pour le message %s", reponse.cle, ligne["id"])
    return {"message_id": str(ligne["id"]), "child_id": str(ligne["child_id"]), "reponse": reponse.cle, "renvoi": code}


async def traiter_accuse(pool: AsyncConnectionPool, accuse: Accuse) -> None:
    async with pool.connection() as conn:
        await conn.execute(
            SQL_ACCUSE, {"wa_id": accuse.wa_message_id, "statut": accuse.statut, "erreur": accuse.erreur}
        )
