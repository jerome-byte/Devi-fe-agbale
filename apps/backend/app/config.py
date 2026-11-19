"""Configuration lue dans les variables d'environnement (ou le fichier .env)."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

# apps/backend/app/config.py -> racine du dépôt (contient voix/ et donnees_sante/)
RACINE_DEPOT = Path(__file__).resolve().parents[3]


def chiffres(telephone: str) -> str:
    """Numéro réduit à ses chiffres, au format attendu par WhatsApp (ex. 22890000000)."""
    return "".join(c for c in telephone if c.isdigit())


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str

    whatsapp_mode: Literal["simulation", "live"] = "simulation"
    whatsapp_token: str = ""
    whatsapp_phone_number_id: str = ""
    whatsapp_app_secret: str = ""
    whatsapp_verify_token: str = ""
    whatsapp_api_version: str = "v21.0"

    destinataires_autorises: str = ""
    admin_token: str = ""

    voix_racine: Path = RACINE_DEPOT
    envoi_intervalle_s: int = 30
    regles_intervalle_s: int = 0
    # Un rappel prévu il y a plus longtemps n'est plus envoyé (une « veille » envoyée le surlendemain n'a pas de sens).
    retard_max_h: int = 24
    tentatives_max: int = 3

    @property
    def simulation(self) -> bool:
        return self.whatsapp_mode == "simulation"

    @property
    def liste_autorises(self) -> list[str] | None:
        numeros = [chiffres(n) for n in self.destinataires_autorises.split(",")]
        numeros = [n for n in numeros if n]
        return numeros or None

    def verifier(self) -> None:
        if self.whatsapp_mode == "live":
            manquants = [
                nom
                for nom in ("whatsapp_token", "whatsapp_phone_number_id", "whatsapp_app_secret", "whatsapp_verify_token")
                if not getattr(self, nom)
            ]
            if manquants:
                raise RuntimeError(f"Mode live : variables manquantes {', '.join(m.upper() for m in manquants)}")


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
