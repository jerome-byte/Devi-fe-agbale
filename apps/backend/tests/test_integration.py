"""Circuit complet sur un vrai Postgres (TEST_DATABASE_URL), sans appel à Meta.

    docker run -d --name devi-pg -e POSTGRES_PASSWORD=test -p 54329:5432 postgres:16
    TEST_DATABASE_URL=postgresql://postgres:test@localhost:54329/postgres uv run pytest
"""

import os
from pathlib import Path

import pytest
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from app.catalogue import Catalogue
from app.config import RACINE_DEPOT, Settings
from app.envoi import envoyer_lot
from app.reponses import Accuse, Reponse, traiter_accuse, traiter_reponse

URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not URL, reason="TEST_DATABASE_URL non défini")

ICI = Path(__file__).parent
AMA, ENYONAM, KODJO = "22890000001", "22890000002", "22890000003"


class FauxClient:
    simulation = True

    def __init__(self):
        self.envois: list[tuple[str, str]] = []

    async def envoyer_audio(self, telephone, chemin):
        self.envois.append((telephone, chemin.name))
        return f"wamid.audio{len(self.envois)}"

    async def envoyer_boutons(self, telephone, texte, boutons):
        self.envois.append((telephone, "boutons:" + "/".join(boutons)))
        return f"wamid.boutons{len(self.envois)}"


@pytest.fixture
async def pool():
    pool = AsyncConnectionPool(URL, kwargs={"row_factory": dict_row, "autocommit": True}, open=False)
    await pool.open()
    async with pool.connection() as conn:
        await conn.execute((ICI / "schema_test.sql").read_text())
        await conn.execute((ICI.parent / "sql" / "05_whatsapp.sql").read_text())
        await conn.execute(
            """
            insert into health_centers values (1, 'Centre de santé de Bè-Kpota'), (2, 'Centre de santé de Hanoukopé');
            insert into children (id, first_name, center_id) values
              ('00000000-0000-0000-0000-00000000000a', 'Ama', 1),
              ('00000000-0000-0000-0000-00000000000b', 'Enyonam', 1),
              ('00000000-0000-0000-0000-00000000000c', 'Kodjo', 2);
            insert into guardians (id, child_id, phone) values
              ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', '+228 90 00 00 01'),
              ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', '+22890000002'),
              ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000c', '+22890000003');
            insert into appointments (id, child_id) values
              ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-00000000000a');
            insert into messages (child_id, guardian_id, appointment_id, template_code, channel, scheduled_for) values
              -- Ama : veille du vaccin, puis relance après un vaccin manqué (canal voice chez Cherif)
              ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', null, 'J-1', 'whatsapp', now() - interval '2 hours'),
              ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a9', 'MISSED_3', 'voice', now() - interval '1 hour'),
              -- Ama : rappel trop ancien, puis rappel futur : aucun des deux ne part
              ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', null, 'J-2', 'whatsapp', now() - interval '3 days'),
              ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', null, 'J0', 'whatsapp', now() + interval '1 day'),
              -- Enyonam : prénom sans audio enregistré
              ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', null, 'J-1', 'whatsapp', now()),
              -- Kodjo : numéro hors liste autorisée (guardian_id vide -> tuteur principal)
              ('00000000-0000-0000-0000-00000000000c', null, null, 'J-2', 'whatsapp', now());
            """
        )
    yield pool
    await pool.close()


async def _statuts(pool):
    async with pool.connection() as conn:
        cur = await conn.execute(
            "select c.first_name, m.template_code, m.status, m.response_key, m.error, m.audio_url "
            "from messages m join children c on c.id = m.child_id order by c.first_name, m.template_code"
        )
        return {(r["first_name"], r["template_code"]): r for r in await cur.fetchall()}


async def test_circuit_complet(pool):
    settings = Settings(database_url=URL, destinataires_autorises=f"{AMA},{ENYONAM}")
    client = FauxClient()
    catalogue = Catalogue(RACINE_DEPOT)

    # 1. Envoi
    rapport = await envoyer_lot(pool, catalogue, client, settings)
    assert (rapport.envoyes, rapport.echecs, rapport.reportes) == (2, 1, 0)
    assert client.envois == [
        (AMA, "rappel_veille__Ama__be_kpota.ogg"),
        (AMA, "manque_3j.ogg"),
        (AMA, "boutons:1/2"),
    ]
    s = await _statuts(pool)
    assert s[("Ama", "J-1")]["status"] == "sent"
    assert s[("Ama", "J-1")]["audio_url"] == "voix/audio/messages/rappel_veille__Ama__be_kpota.ogg"
    assert s[("Ama", "MISSED_3")]["status"] == "sent"
    assert s[("Ama", "J-2")]["status"] == "scheduled"  # trop ancien
    assert s[("Ama", "J0")]["status"] == "scheduled"  # futur
    assert s[("Enyonam", "J-1")]["status"] == "failed"
    assert "Enyonam" in s[("Enyonam", "J-1")]["error"]
    assert s[("Kodjo", "J-2")]["status"] == "scheduled"  # non autorisé

    # Un deuxième passage n'envoie rien de plus
    assert (await envoyer_lot(pool, catalogue, client, settings)).envoyes == 0

    # 2. La maman d'Ama touche « 2 » en réponse au message à boutons
    resultat = await traiter_reponse(pool, Reponse(AMA, 2, "wamid.boutons3"))
    assert resultat["renvoi"] == "reponse_empechement"
    # WhatsApp renvoie parfois le même événement : pas de doublon
    await traiter_reponse(pool, Reponse(AMA, 2, "wamid.boutons3"))
    rapport = await envoyer_lot(pool, catalogue, client, settings)
    assert rapport.envoyes == 1
    assert client.envois[-1] == (AMA, "reponse_empechement.ogg")
    s = await _statuts(pool)
    assert s[("Ama", "MISSED_3")]["response_key"] == 2
    assert s[("Ama", "reponse_empechement")]["status"] == "sent"

    # Réponse d'un numéro sans relance : ignorée
    assert await traiter_reponse(pool, Reponse(ENYONAM, 1)) is None

    # 3. Accusés : « lu » puis un « distribué » en retard ne fait pas reculer le statut
    await traiter_accuse(pool, Accuse("wamid.boutons3", "listened"))
    await traiter_accuse(pool, Accuse("wamid.boutons3", "delivered"))
    assert (await _statuts(pool))[("Ama", "MISSED_3")]["status"] == "listened"
