"""Comptes créés par le pilotage : mot de passe provisoire, clé d'administration, suppression."""

import asyncio
import re
from contextlib import asynccontextmanager
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app import comptes
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


# ---------- Suppression d'un compte -------------------------------------------

class _Curseur:
    def __init__(self, ligne):
        self.ligne = ligne

    async def fetchone(self):
        return self.ligne


class _Connexion:
    def __init__(self, role):
        self.role = role
        self.requetes = []

    async def execute(self, sql, params=None):
        self.requetes.append(" ".join(sql.split()))
        if sql.startswith("select id, role from profiles"):
            return _Curseur({"id": params[0], "role": self.role} if self.role else None)
        return _Curseur(None)

    @asynccontextmanager
    async def transaction(self):
        yield


class _Pool:
    def __init__(self, conn):
        self.conn = conn

    @asynccontextmanager
    async def connection(self):
        yield self.conn


class _Auth:
    def __init__(self, echec=False):
        self.supprimes = []
        self.echec = echec

    async def supprimer(self, uid):
        if self.echec:
            raise HTTPException(502, "Supabase Auth (500) : erreur")
        self.supprimes.append(uid)


def _requete(conn):
    return SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(pool=_Pool(conn))))


def test_suppression_detache_les_donnees_puis_supprime(monkeypatch):
    auth = _Auth()
    monkeypatch.setattr(comptes, "auth_admin", lambda request: auth)
    conn, uid = _Connexion("agent"), uuid4()
    r = asyncio.run(comptes.supprimer_compte(_requete(conn), uid, uuid4()))
    assert r == {"id": str(uid), "supprime": True}
    assert auth.supprimes == [str(uid)]
    sql = conn.requetes
    for table, colonne in comptes.LIENS_COMPTE:
        assert f"update {table} set {colonne} = null where {colonne} = %s" in sql
    assert sql[-1] == "delete from profiles where id = %s"


def test_suppression_refusee_pour_soi_meme_et_le_pilotage(monkeypatch):
    monkeypatch.setattr(comptes, "auth_admin", lambda request: _Auth())
    uid = uuid4()
    with pytest.raises(HTTPException) as e:
        asyncio.run(comptes.supprimer_compte(_requete(_Connexion("agent")), uid, uid))
    assert e.value.status_code == 403
    with pytest.raises(HTTPException) as e:
        asyncio.run(comptes.supprimer_compte(_requete(_Connexion("pilotage")), uuid4(), uuid4()))
    assert e.value.status_code == 403
    with pytest.raises(HTTPException) as e:
        asyncio.run(comptes.supprimer_compte(_requete(_Connexion(None)), uuid4(), uuid4()))
    assert e.value.status_code == 404


def test_echec_de_supabase_auth_remonte(monkeypatch):
    monkeypatch.setattr(comptes, "auth_admin", lambda request: _Auth(echec=True))
    with pytest.raises(HTTPException) as e:
        asyncio.run(comptes.supprimer_compte(_requete(_Connexion("educatrice")), uuid4(), uuid4()))
    assert e.value.status_code == 502
