"""Comptes créés par le pilotage : mot de passe provisoire et en-têtes de la clé d'administration."""

import re

import pytest
from fastapi import HTTPException

from app.comptes import AuthAdmin, NouveauCompte, NouvelleStructure, mot_de_passe_provisoire


def test_mot_de_passe_provisoire_lisible_et_unique():
    mots = {mot_de_passe_provisoire() for _ in range(200)}
    assert len(mots) == 200
    for m in mots:
        assert re.fullmatch(r"[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}", m)
        assert not set("0O1lI") & set(m)


def test_cle_secrete_sans_bearer():
    auth = AuthAdmin("https://x.supabase.co/", "sb_secret_abc")
    assert auth.base == "https://x.supabase.co/auth/v1/admin/users"
    assert auth.entetes == {"apikey": "sb_secret_abc"}


def test_ancienne_cle_service_role_avec_bearer():
    auth = AuthAdmin("https://x.supabase.co", "eyJhbGciOi.jwt.sig")
    assert auth.entetes["authorization"] == "Bearer eyJhbGciOi.jwt.sig"


def test_cle_absente_refusee():
    with pytest.raises(HTTPException) as e:
        AuthAdmin("https://x.supabase.co", "")
    assert e.value.status_code == 503


def test_saisies_nettoyees():
    c = NouveauCompte(nom="  Kossi   Mensah ", email=" Kossi.Mensah@Exemple.TG ", role="agent", structure_id=1)
    assert (c.nom, c.email) == ("Kossi Mensah", "kossi.mensah@exemple.tg")
    assert NouvelleStructure(type="centre", nom="  Centre   de Bè ", zone_id=1).nom == "Centre de Bè"
    with pytest.raises(ValueError):
        NouveauCompte(nom="Kossi", email="pas-un-mail", role="agent", structure_id=1)
    with pytest.raises(ValueError):
        NouveauCompte(nom="Kossi", email="k@exemple.tg", role="pilotage", structure_id=1)
