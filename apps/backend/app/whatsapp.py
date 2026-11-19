"""Envoi par l'API WhatsApp Cloud (Meta), ou simulation sans appel réseau."""

import logging
import time
import uuid
from pathlib import Path
from typing import Protocol

import httpx

log = logging.getLogger("devi.whatsapp")

# Un média téléversé reste valable 30 jours chez Meta ; on le réutilise 25 jours.
DUREE_MEDIA_S = 25 * 24 * 3600


class ErreurWhatsApp(Exception):
    def __init__(self, message: str, definitive: bool):
        super().__init__(message)
        self.definitive = definitive  # True : inutile de réessayer (numéro invalide, jeton refusé...)


class ClientWhatsApp(Protocol):
    simulation: bool

    async def envoyer_audio(self, telephone: str, chemin: Path) -> str: ...

    async def envoyer_boutons(self, telephone: str, texte: str, boutons: list[str]) -> str: ...


class ClientSimulation:
    """Ne contacte pas Meta : journalise et renvoie un faux identifiant."""

    simulation = True

    async def envoyer_audio(self, telephone: str, chemin: Path) -> str:
        log.info("[simulation] audio %s -> %s", chemin.name, telephone)
        return f"sim-{uuid.uuid4()}"

    async def envoyer_boutons(self, telephone: str, texte: str, boutons: list[str]) -> str:
        log.info("[simulation] boutons %s -> %s", "/".join(boutons), telephone)
        return f"sim-{uuid.uuid4()}"


class ClientMeta:
    simulation = False

    def __init__(self, token: str, phone_number_id: str, version: str, http: httpx.AsyncClient | None = None):
        self.base = f"https://graph.facebook.com/{version}/{phone_number_id}"
        self.http = http or httpx.AsyncClient(timeout=30)
        self.http.headers["Authorization"] = f"Bearer {token}"
        self._medias: dict[Path, tuple[str, float]] = {}

    async def fermer(self) -> None:
        await self.http.aclose()

    @staticmethod
    def _verifier(reponse: httpx.Response) -> dict:
        if reponse.is_success:
            return reponse.json()
        try:
            erreur = reponse.json().get("error", {})
            detail = erreur.get("message", reponse.text)
            if erreur.get("code") == 131047:
                detail = (
                    "fenêtre de 24 h fermée : ce numéro doit d'abord écrire au numéro WhatsApp du projet (131047)"
                )
        except ValueError:
            detail = reponse.text
        # 4xx (sauf 429, limite de débit) : la requête elle-même est refusée, réessayer ne sert à rien.
        definitive = 400 <= reponse.status_code < 500 and reponse.status_code != 429
        raise ErreurWhatsApp(f"Meta {reponse.status_code} : {detail}", definitive)

    async def _media(self, chemin: Path) -> str:
        en_cache = self._medias.get(chemin)
        if en_cache and time.time() - en_cache[1] < DUREE_MEDIA_S:
            return en_cache[0]
        try:
            reponse = await self.http.post(
                f"{self.base}/media",
                data={"messaging_product": "whatsapp", "type": "audio/ogg"},
                files={"file": (chemin.name, chemin.read_bytes(), "audio/ogg")},
            )
        except httpx.HTTPError as e:
            raise ErreurWhatsApp(f"téléversement impossible : {e}", definitive=False) from e
        media_id = self._verifier(reponse)["id"]
        self._medias[chemin] = (media_id, time.time())
        return media_id

    async def _message(self, telephone: str, contenu: dict) -> str:
        payload = {"messaging_product": "whatsapp", "recipient_type": "individual", "to": telephone, **contenu}
        try:
            reponse = await self.http.post(f"{self.base}/messages", json=payload)
        except httpx.HTTPError as e:
            raise ErreurWhatsApp(f"envoi impossible : {e}", definitive=False) from e
        return self._verifier(reponse)["messages"][0]["id"]

    async def envoyer_audio(self, telephone: str, chemin: Path) -> str:
        media_id = await self._media(chemin)
        return await self._message(telephone, {"type": "audio", "audio": {"id": media_id}})

    async def envoyer_boutons(self, telephone: str, texte: str, boutons: list[str]) -> str:
        # Les boutons portent exactement « 1 » et « 2 », comme dans le vocal (voix/README_voix.md).
        return await self._message(
            telephone,
            {
                "type": "interactive",
                "interactive": {
                    "type": "button",
                    "body": {"text": texte[:1024]},
                    "action": {
                        "buttons": [{"type": "reply", "reply": {"id": b, "title": b}} for b in boutons]
                    },
                },
            },
        )
