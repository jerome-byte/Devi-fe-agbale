import hashlib
import hmac
import json

import httpx
import pytest

from app.catalogue import AudioIntrouvable, Catalogue
from app.config import RACINE_DEPOT
from app.reponses import Accuse, Reponse, lire_evenements, signature_valide
from app.whatsapp import ClientMeta, ErreurWhatsApp

catalogue = Catalogue(RACINE_DEPOT)


# ---------- Catalogue ----------


@pytest.mark.parametrize(
    "code, prenom, centre, attendu",
    [
        ("WELCOME", "Kofi", None, "voix/audio/messages/bienvenue.ogg"),
        ("J-2", None, None, "voix/audio/messages/rappel_j2.ogg"),
        ("J-1", "Ama", "Centre de santé de Bè-Kpota", "voix/audio/messages/rappel_veille__Ama__be_kpota.ogg"),
        ("J0", "kossi", "CHU Sylvanus Olympio", "voix/audio/messages/rappel_jour_j__Kosi__sylvanus_olympio.ogg"),
        ("MISSED_3", "Yao", None, "voix/audio/messages/manque_3j.ogg"),
        ("BIRTH_CERT", "Akossiwa", None, "voix/audio/messages/acte_naissance__Akosiwa.ogg"),
        ("reponse_vient", None, None, "voix/audio/messages/reponse_vient.ogg"),
    ],
)
def test_resolution_audio(code, prenom, centre, attendu):
    audio = catalogue.resoudre(code, prenom, centre)
    assert audio.relatif == attendu
    assert audio.chemin.is_file()


def test_manque_3j_a_les_boutons_1_et_2():
    assert catalogue.resoudre("MISSED_3", None, None).boutons == ["1", "2"]
    assert catalogue.resoudre("J-2", None, None).boutons == []


@pytest.mark.parametrize(
    "code, prenom, centre",
    [
        ("J-1", "Enyonam", "Centre de santé de Bè-Kpota"),  # prénom sans audio
        ("J-1", "Ama", "Centre de santé de Hanoukopé"),  # centre sans audio
        ("INCONNU", None, None),
    ],
)
def test_audio_introuvable(code, prenom, centre):
    with pytest.raises(AudioIntrouvable):
        catalogue.resoudre(code, prenom, centre)


# ---------- Webhook ----------


def _payload(messages=(), statuses=()):
    return {"entry": [{"changes": [{"value": {"messages": list(messages), "statuses": list(statuses)}}]}]}


def test_lecture_bouton_texte_et_accuses():
    reponses, accuses = lire_evenements(
        _payload(
            messages=[
                {"from": "22890000001", "type": "interactive", "context": {"id": "wamid.A"},
                 "interactive": {"type": "button_reply", "button_reply": {"id": "2", "title": "2"}}},
                {"from": "22890000002", "type": "text", "text": {"body": " 1 "}},
                {"from": "22890000003", "type": "text", "text": {"body": "bonjour"}},
                {"from": "22890000004", "type": "audio", "audio": {"id": "x"}},
            ],
            statuses=[
                {"id": "wamid.B", "status": "read"},
                {"id": "wamid.C", "status": "failed", "errors": [{"title": "Numéro invalide"}]},
                {"id": "wamid.D", "status": "deleted"},
            ],
        )
    )
    assert reponses == [Reponse("22890000001", 2, "wamid.A"), Reponse("22890000002", 1, None)]
    assert accuses == [Accuse("wamid.B", "listened"), Accuse("wamid.C", "failed", "Numéro invalide")]


def test_signature():
    corps = b'{"a":1}'
    sig = "sha256=" + hmac.new(b"secret", corps, hashlib.sha256).hexdigest()
    assert signature_valide("secret", corps, sig)
    assert not signature_valide("autre", corps, sig)
    assert not signature_valide("secret", corps, None)


# ---------- Client Meta (sans réseau) ----------


async def test_client_meta_televerse_une_fois_puis_envoie():
    appels = []

    def repondre(requete: httpx.Request) -> httpx.Response:
        appels.append(requete)
        if requete.url.path.endswith("/media"):
            return httpx.Response(200, json={"id": "MEDIA1"})
        return httpx.Response(200, json={"messages": [{"id": f"wamid.{len(appels)}"}]})

    client = ClientMeta("JETON", "123", "v21.0", httpx.AsyncClient(transport=httpx.MockTransport(repondre)))
    audio = catalogue.resoudre("MISSED_3", None, None)
    await client.envoyer_audio("22890000001", audio.chemin)
    await client.envoyer_audio("22890000002", audio.chemin)
    wa_id = await client.envoyer_boutons("22890000001", audio.texte, audio.boutons)

    chemins = [r.url.path for r in appels]
    assert chemins == ["/v21.0/123/media", "/v21.0/123/messages", "/v21.0/123/messages", "/v21.0/123/messages"]
    assert appels[0].headers["authorization"] == "Bearer JETON"
    assert json.loads(appels[1].content)["audio"] == {"id": "MEDIA1"}
    boutons = json.loads(appels[3].content)["interactive"]["action"]["buttons"]
    assert [b["reply"]["title"] for b in boutons] == ["1", "2"]
    assert wa_id == "wamid.4"


@pytest.mark.parametrize("code, definitive", [(400, True), (429, False), (500, False)])
async def test_client_meta_erreurs(code, definitive):
    client = ClientMeta(
        "J", "1", "v21.0",
        httpx.AsyncClient(transport=httpx.MockTransport(
            lambda r: httpx.Response(code, json={"error": {"message": "refusé"}}))),
    )
    with pytest.raises(ErreurWhatsApp) as e:
        await client.envoyer_boutons("228", "t", ["1"])
    assert e.value.definitive is definitive
