# 1. Mettre le backend en ligne sur Render

Le backend (`apps/backend`) tourne sur Render comme un « Web Service » Python. On le déploie d'abord en mode `simulation` : aucun message ne part chez Meta tant que le guide 2 n'est pas fait.

Durée : 20 minutes environ.

## Avant de commencer

- Un accès en écriture à la base Supabase du projet.
- Un compte GitHub qui voit le dépôt `jerome-byte/Devi-fe-agbale`.
- Pour relier Render au dépôt, il faut installer l'application GitHub de Render sur le compte qui possède le dépôt. Si tu n'es pas propriétaire, demande à Jérôme de le faire, ou de t'ajouter comme administrateur du dépôt.

## Étape 1 : préparer la base

Les scripts de Cherif (`01_schema.sql`, `02_views.sql`, `04_rules.sql`, `03_seed_demo.sql`) doivent déjà être passés. Il reste trois petits scripts du backend.

1. Ouvrir le projet sur supabase.com, puis **SQL Editor > New query**.
2. Coller le contenu de `apps/backend/sql/05_whatsapp.sql`, cliquer sur **Run**.
3. Recommencer avec `apps/backend/sql/06_demo_envoi.sql`, puis `apps/backend/sql/07_app.sql`.

Les trois scripts peuvent être relancés sans risque : ils n'ajoutent que des colonnes et des fonctions.

## Étape 2 : récupérer la chaîne de connexion

1. Dans Supabase, cliquer sur **Connect** en haut de la page du projet.
2. Choisir l'onglet **Connection string**, type **URI**, méthode **Session pooler**. La connexion directe passe par IPv6, que Render ne gère pas ; le pooler passe par IPv4.
3. Copier la chaîne. Elle ressemble à :
   `postgresql://postgres.abcd1234:[YOUR-PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:5432/postgres`
4. Remplacer `[YOUR-PASSWORD]` par le mot de passe de la base. S'il contient `@`, `:`, `/` ou `#`, il faut l'encoder : `@` devient `%40`, `:` devient `%3A`, `/` devient `%2F`, `#` devient `%23`.

Mot de passe perdu : **Project Settings > Database > Reset database password**. Prévenir Cherif, son script `db:init` utilise le même.

## Étape 3 : créer le service

1. Se connecter sur render.com avec GitHub.
2. **New > Web Service**, puis choisir le dépôt `Devi-fe-agbale`.
3. Remplir le formulaire :

| Champ | Valeur |
|---|---|
| Name | `devi-backend` (l'adresse sera `https://devi-backend.onrender.com`) |
| Language | `Python 3` |
| Branch | `master` (ou `mounix` pour tester avant la fusion) |
| Region | `Frankfurt (EU Central)`, la plus proche de Lomé |
| Root Directory | **laisser vide** |
| Build Command | `pip install -r apps/backend/requirements.txt` |
| Start Command | `cd apps/backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Instance Type | `Free` pour tester (voir la remarque plus bas) |

Le champ Root Directory reste vide parce que le backend lit les audios dans `voix/audio/messages/`, à la racine du dépôt. Avec `apps/backend` comme Root Directory, Render rendrait ce dossier invisible.

## Étape 4 : variables d'environnement

Dans le même formulaire, section **Environment Variables**, ajouter :

| Clé | Valeur |
|---|---|
| `PYTHON_VERSION` | `3.12.8` |
| `DATABASE_URL` | la chaîne de l'étape 2 |
| `ADMIN_TOKEN` | une valeur longue et aléatoire (`openssl rand -hex 24`) ; la noter, Vercel en aura besoin |
| `WHATSAPP_MODE` | `simulation` |
| `DESTINATAIRES_AUTORISES` | les numéros de l'équipe, chiffres seulement, indicatif compris, séparés par des virgules (ex. `22890112233,22891445566`) |
| `ENVOI_INTERVALLE_S` | `30` |
| `REGLES_INTERVALLE_S` | `3600` si la base n'a pas de pg_cron pour `run_rules`, sinon `0` |

`DESTINATAIRES_AUTORISES` est le garde-fou de la démo. Les 300 enfants du seed ont de faux numéros, et le backend n'écrit qu'aux numéros de cette liste. Vide, il écrirait à tout le monde.

## Étape 5 : réglages avancés

Ouvrir la section **Advanced** :

- **Health Check Path** : `/sante`.
- **Build Filters**, Included Paths : `apps/backend/**` et `voix/**`. Sans ce filtre, chaque modification du frontend redéploie aussi le backend.
- **Auto-Deploy** : `On Commit`.

Cliquer sur **Deploy Web Service**. La première construction prend 2 à 3 minutes.

## Étape 6 : vérifier

```bash
curl https://devi-backend.onrender.com/sante
# {"ok":true,"mode":"simulation"}
```

Puis la liste des derniers messages (remplacer le jeton) :

```bash
curl -H "Authorization: Bearer <ADMIN_TOKEN>" https://devi-backend.onrender.com/admin/messages?limite=5
```

La documentation interactive de toutes les routes est sur `https://devi-backend.onrender.com/docs`.

## L'offre gratuite s'endort

Sur l'offre `Free`, Render arrête le service après 15 minutes sans requête. Conséquences :

- la première requête suivante attend environ une minute ;
- pendant le sommeil, la boucle d'envoi ne tourne pas : un message prévu reste en attente jusqu'au réveil ;
- Meta réessaie un webhook resté sans réponse, donc les réponses « 1 » et « 2 » finissent par arriver, avec du retard.

Pour le jour de la démo, deux solutions :

- passer le service en `Starter` (payant, au mois) dans **Settings > Instance Type**, puis revenir en `Free` après ;
- ou ouvrir `https://devi-backend.onrender.com/sante` cinq minutes avant de commencer, puis faire une action toutes les dix minutes.

## En cas de problème

| Symptôme | Cause probable |
|---|---|
| Échec au démarrage, `database_url Field required` | `DATABASE_URL` absente ou mal nommée |
| `password authentication failed` | mot de passe faux, ou caractère spécial non encodé (étape 2) |
| `Network is unreachable` vers Supabase | chaîne de connexion directe au lieu du Session pooler |
| `function demo_envoyer does not exist` | `06_demo_envoi.sql` n'a pas été passé |
| `column "wa_message_id" does not exist` | `05_whatsapp.sql` n'a pas été passé |
| Messages en `failed` avec `pas d'audio pour le prénom` | l'enfant n'a pas un des 10 prénoms enregistrés par Jérôme |

Les journaux sont dans l'onglet **Logs** du service.

## Mettre à jour les dépendances

Après un changement dans `apps/backend/pyproject.toml` :

```bash
cd apps/backend
uv lock
uv export --no-dev --no-hashes --no-emit-project -o requirements.txt
```

Puis committer `uv.lock` et `requirements.txt`.
