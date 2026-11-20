"""Catalogue des audios (voix/audio/messages/index_messages.json).

Fait correspondre un `template_code` de la base (Cherif) au bon fichier .ogg,
selon le prénom de l'enfant et son centre de santé. Le chemin vient toujours
du champ `ogg` du catalogue : on ne reconstruit jamais le nom à la main.
"""

import json
import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

# Codes de la base -> id du catalogue (voix/README_voix.md, « Correspondance avec les codes de la base »).
# Les autres messages (pesee, croissance, reponse_vient...) utilisent directement leur id.
CODES_BASE = {
    "WELCOME": "bienvenue",
    "J-2": "rappel_j2",
    "J-1": "rappel_veille",
    "J0": "rappel_jour_j",
    "MISSED_3": "manque_3j",
    "BIRTH_CERT": "acte_naissance",
    "PESEE": "pesee",
    "CROISSANCE": "croissance",
    # Rappel individuel vitamine A : l'annonce de campagne, en attendant un audio dédié.
    "VITAMINE_A": "annonce_vitamine_a",
    # DEPARASITAGE : pas encore d'audio enregistré.
}

# Réponse de la famille -> message renvoyé
REPONSES = {1: "reponse_vient", 2: "reponse_empechement"}


class AudioIntrouvable(Exception):
    """Aucun audio enregistré pour ce message, ce prénom ou ce centre."""


def normaliser(texte: str) -> str:
    sans_accents = "".join(
        c for c in unicodedata.normalize("NFKD", texte) if not unicodedata.combining(c)
    )
    return re.sub(r"[^a-z0-9]+", " ", sans_accents.lower()).strip()


@dataclass(frozen=True)
class Audio:
    message_id: str
    chemin: Path  # chemin absolu du .ogg
    relatif: str  # chemin depuis la racine du dépôt, tel que dans le catalogue
    texte: str  # texte éwé (corps du message à boutons)
    boutons: list[str] = field(default_factory=list)


class Catalogue:
    def __init__(self, racine: Path):
        self.racine = racine
        fichier = racine / "voix" / "audio" / "messages" / "index_messages.json"
        data = json.loads(fichier.read_text(encoding="utf-8"))
        self.messages: dict[str, dict] = {m["id"]: m for m in data["messages"]}
        self.centres: dict[str, str] = data["centres"]

    @staticmethod
    def id_message(template_code: str) -> str:
        return CODES_BASE.get(template_code, template_code)

    def centre_cle(self, nom_centre: str | None) -> str | None:
        """« Centre de santé de Bè-Kpota » -> « be_kpota »."""
        if not nom_centre:
            return None
        nom = normaliser(nom_centre)
        for cle, libelle in self.centres.items():
            if normaliser(libelle) in nom or normaliser(cle) in nom:
                return cle
        return None

    def resoudre(self, template_code: str, prenom: str | None, nom_centre: str | None) -> Audio:
        message_id = self.id_message(template_code)
        message = self.messages.get(message_id)
        if message is None:
            raise AudioIntrouvable(f"message « {template_code} » absent du catalogue")

        variables = set(message["variables"])
        candidats = message["audios"]
        if "prenom" in variables:
            p = normaliser(prenom or "")
            candidats = [a for a in candidats if p in {normaliser(o) for o in a["orthographes"]}]
            if not candidats:
                raise AudioIntrouvable(f"« {message_id} » : pas d'audio pour le prénom {prenom!r}")
        if "centre" in variables:
            cle = self.centre_cle(nom_centre)
            candidats = [a for a in candidats if a["centre"] == cle]
            if not candidats:
                raise AudioIntrouvable(f"« {message_id} » : pas d'audio pour le centre {nom_centre!r}")
        if not candidats:
            raise AudioIntrouvable(f"« {message_id} » : aucun audio")

        relatif = candidats[0]["ogg"]
        chemin = self.racine / relatif
        if not chemin.is_file():
            raise AudioIntrouvable(f"fichier manquant : {relatif}")
        return Audio(
            message_id=message_id,
            chemin=chemin,
            relatif=relatif,
            texte=message["modele_ewe"],
            boutons=[b["bouton"] for b in message["boutons"]],
        )
