"""Étape 2 du circuit : lire les messages « à envoyer » écrits par la base et les envoyer.

La base (moteur run_rules de Cherif) décide quel message part et quand.
Ici on ne fait qu'envoyer, puis noter le résultat sur la ligne.
"""

import logging
from dataclasses import dataclass, field

from psycopg_pool import AsyncConnectionPool

from .catalogue import AudioIntrouvable, Catalogue
from .config import Settings, chiffres
from .whatsapp import ClientWhatsApp, ErreurWhatsApp

log = logging.getLogger("devi.envoi")

# Un message à la fois, verrouillé pendant l'envoi : deux boucles ne peuvent pas l'envoyer deux fois.
SQL_PROCHAIN = r"""
select m.id, m.template_code, m.attempts, g.phone, c.first_name, hc.name as centre
from messages m
join children c on c.id = m.child_id
left join health_centers hc on hc.id = c.center_id
join lateral (
  select g.phone from guardians g
  where (m.guardian_id is not null and g.id = m.guardian_id)
     or (m.guardian_id is null and g.child_id = m.child_id and g.is_primary)
  limit 1
) g on true
where m.status = 'scheduled'
  and not m.is_simulated
  and coalesce(m.scheduled_for, now()) <= now()
  and coalesce(m.scheduled_for, now()) >= now() - make_interval(hours => %(retard_h)s)
  and (%(autorises)s::text[] is null or regexp_replace(g.phone, '\D', '', 'g') = any(%(autorises)s::text[]))
  and m.id <> all(%(deja_vus)s::uuid[])
order by m.scheduled_for nulls first
limit 1
for update of m skip locked
"""

SQL_ENVOYE = """
update messages
set status = 'sent', sent_at = now(), wa_message_id = %(wa_id)s, audio_url = %(audio)s,
    is_simulated = %(simulation)s, attempts = attempts + 1, error = null
where id = %(id)s
"""

SQL_ECHEC = """
update messages
set status = %(statut)s, attempts = attempts + 1, error = %(erreur)s
where id = %(id)s
"""


@dataclass
class Rapport:
    envoyes: int = 0
    echecs: int = 0
    reportes: int = 0
    details: list[dict] = field(default_factory=list)


async def envoyer_lot(
    pool: AsyncConnectionPool,
    catalogue: Catalogue,
    client: ClientWhatsApp,
    settings: Settings,
    maximum: int = 50,
) -> Rapport:
    rapport = Rapport()
    deja_vus: list = []
    params = {"retard_h": settings.retard_max_h, "autorises": settings.liste_autorises}

    for _ in range(maximum):
        async with pool.connection() as conn, conn.transaction():
            ligne = await (await conn.execute(SQL_PROCHAIN, {**params, "deja_vus": deja_vus})).fetchone()
            if ligne is None:
                break
            deja_vus.append(ligne["id"])
            detail = {"id": str(ligne["id"]), "code": ligne["template_code"]}

            try:
                audio = catalogue.resoudre(ligne["template_code"], ligne["first_name"], ligne["centre"])
                telephone = chiffres(ligne["phone"])
                wa_id = await client.envoyer_audio(telephone, audio.chemin)
                if audio.boutons:
                    # Les réponses « 1 » / « 2 » citent le message à boutons : c'est lui qu'on garde.
                    wa_id = await client.envoyer_boutons(telephone, audio.texte, audio.boutons)
            except AudioIntrouvable as e:
                await conn.execute(SQL_ECHEC, {"id": ligne["id"], "statut": "failed", "erreur": str(e)})
                rapport.echecs += 1
                rapport.details.append({**detail, "resultat": "échec", "erreur": str(e)})
                log.warning("message %s non envoyé : %s", ligne["id"], e)
                continue
            except ErreurWhatsApp as e:
                abandon = e.definitive or ligne["attempts"] + 1 >= settings.tentatives_max
                statut = "failed" if abandon else "scheduled"
                await conn.execute(SQL_ECHEC, {"id": ligne["id"], "statut": statut, "erreur": str(e)})
                if abandon:
                    rapport.echecs += 1
                else:
                    rapport.reportes += 1
                rapport.details.append({**detail, "resultat": "échec" if abandon else "reporté", "erreur": str(e)})
                log.warning("message %s : %s", ligne["id"], e)
                continue

            await conn.execute(
                SQL_ENVOYE,
                {"id": ligne["id"], "wa_id": wa_id, "audio": audio.relatif, "simulation": client.simulation},
            )
            rapport.envoyes += 1
            rapport.details.append({**detail, "resultat": "envoyé", "audio": audio.relatif})
            log.info("message %s (%s) envoyé", ligne["id"], ligne["template_code"])

    return rapport
