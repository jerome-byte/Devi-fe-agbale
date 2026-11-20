# Backend ɖevi ƒe agbalẽ (FastAPI)

Envoie sur WhatsApp les messages décidés par la base, et reçoit les réponses des familles.
C'est l'étape « Blaise » du circuit décrit dans `voix/README_voix.md` :

1. **La base décide** (Cherif) : `run_rules` écrit une ligne dans `messages`, statut `scheduled`.
2. **Le backend envoie** : il trouve le bon `.ogg` dans `index_messages.json` (selon le prénom et le centre), l'envoie, ajoute les boutons « 1 » / « 2 » pour `manque_3j`, puis passe la ligne à `sent`.
3. **Le backend reçoit la réponse** : webhook WhatsApp. « 1 » ou « 2 » est enregistré dans `response_key`, puis `reponse_vient` ou `reponse_empechement` part aussitôt. Les accusés « distribué » et « lu » mettent à jour le statut (`delivered`, `listened`).
4. **La base alerte** (Cherif) : une réponse « 2 » doit créer l'alerte pour l'agent de santé.

Le backend ne calcule aucune règle. La seule source de vérité est la base de Cherif.

## Lancer

```bash
cd apps/backend
cp .env.example .env        # remplir DATABASE_URL et ADMIN_TOKEN
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Dans la base, une seule fois après les scripts de Cherif (`01`, `02`, `04`, `03`) :

```bash
psql "$DATABASE_URL" -f sql/05_whatsapp.sql     # colonnes wa_message_id, error, attempts
psql "$DATABASE_URL" -f sql/06_demo_envoi.sql   # boutons de démo avec envoi réel
psql "$DATABASE_URL" -f sql/07_app.sql          # taille mesurée à la pesée (height_cm)
```

Déploiement sur Render et branchement de WhatsApp : `apps/docs/`.

## Modes

| `WHATSAPP_MODE` | Effet |
|---|---|
| `simulation` (par défaut) | Aucun appel à Meta. Les messages passent à `sent` avec `is_simulated = true`. Pour répéter la démo sans compte WhatsApp. |
| `live` | Envoi réel. Il faut `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET` et `WHATSAPP_VERIFY_TOKEN`. |

**`DESTINATAIRES_AUTORISES`** : avec le vrai WhatsApp (`WHATSAPP_MODE=live`), seuls ces numéros reçoivent des messages. Les 300 enfants du seed ont de faux numéros : en démo, mettre ici uniquement les téléphones de l'équipe. En simulation, la liste est ignorée : tous les messages sont « envoyés » et s'affichent dans le téléphone simulé de l'application.

Garde-fous :
- un rappel prévu il y a plus de 24 h n'est plus envoyé ;
- après 3 échecs temporaires (réseau, limite de débit), le message passe à `failed` ;
- un prénom ou un centre sans audio enregistré met le message à `failed`, avec la raison dans `error`.

## Routes

| Route | Rôle |
|---|---|
| `GET /sante` | Vérifie la connexion à la base |
| `GET /webhook/whatsapp` | Vérification du webhook par Meta (`hub.verify_token`) |
| `POST /webhook/whatsapp` | Réponses et accusés WhatsApp (signature `X-Hub-Signature-256` vérifiée) |
| `POST /admin/envoyer` | Envoie tout de suite les messages dus |
| `POST /admin/regles?jour=2026-11-20` | Lance `run_rules` puis envoie |
| `POST /admin/demo/{child_id}/{J-2\|J-1\|J0\|MISSED_3\|MISSED_7}` | Avance rapide **avec envoi réel** |
| `POST /admin/demo/{child_id}/reset` | Remet l'enfant à zéro entre deux répétitions |
| `GET /admin/messages?statut=failed` | Journal des derniers messages |
| `POST /simulation/reponse` `{"telephone": "...", "cle": 2}` | Simule la maman qui touche « 2 » (mode simulation) |
| `POST /app/enfants` | Inscription : enfant, tuteur, vaccins déjà faits, première pesée, message de bienvenue |
| `POST /app/enfants/{id}/vaccins` | Doses faites ce jour |
| `POST /app/enfants/{id}/pesees` | Pesée (et taille) ; renvoie le z-score et le statut calculés par la base |
| `PATCH /app/enfants/{id}/acte` | Acte de naissance obtenu ou non |
| `POST /app/messages/{id}/ecoute` | Vocal écouté dans le téléphone simulé |

### Structures et comptes (pilotage)

| Route | Rôle |
|---|---|
| `POST /admin/zones` | Nouvelle zone : `nom`, `commune` (facultatif) |
| `GET /admin/structures` | Zones, hôpitaux, centres de santé et garderies, avec leur nombre de comptes et d'enfants |
| `POST /admin/structures` | Nouvelle structure : `type` (`hopital`, `centre`, `garderie`), `nom`, `zone_id`, `centre_id` (garderie) |
| `GET /admin/comptes` | Comptes des agents et des éducatrices |
| `POST /admin/comptes` | Nouveau compte : `nom`, `email`, `role` (`agent`, `educatrice`), `structure_id` ; renvoie le mot de passe provisoire, une seule fois |
| `PATCH /admin/comptes/{id}` | `{"actif": false}` désactive le compte (plus de connexion, plus de lecture), `true` le réactive |
| `POST /admin/comptes/{id}/mot-de-passe` | Nouveau mot de passe provisoire |

Ces routes créent les comptes dans Supabase Auth avec `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`, qui ne vivent que sur le serveur du backend. Dans l'application, seul le rôle pilotage peut les appeler. Exécuter d'abord `sql/07_comptes_structures.sql`.

Les routes `/app` servent l'application (`apps/frontend`), qui les appelle par sa route serveur `/api/backend`. Les routes `/app`, `/admin` et `/simulation` exigent l'en-tête `Authorization: Bearer <ADMIN_TOKEN>`. La documentation interactive est sur `/docs`.

## Brancher WhatsApp (mode live)

1. Sur developers.facebook.com, créer une app « Business » et ajouter le produit WhatsApp. Le numéro de test fourni suffit pour la démo : ajouter les téléphones de l'équipe comme destinataires autorisés.
2. Récupérer le jeton, l'identifiant du numéro (`Phone number ID`) et la clé secrète de l'app (`App secret`).
3. Exposer le backend en HTTPS (`cloudflared tunnel --url http://localhost:8000`, ou un hébergement), puis déclarer `https://…/webhook/whatsapp` comme URL de webhook avec `WHATSAPP_VERIFY_TOKEN`, et s'abonner au champ `messages`.

Ces clés restent dans le `.env` du serveur : jamais dans l'application ni dans git.

## Tests

```bash
uv run pytest                                   # tests unitaires
docker run -d --name devi-pg -e POSTGRES_PASSWORD=test -p 54329:5432 postgres:16
TEST_DATABASE_URL=postgresql://postgres:test@localhost:54329/postgres uv run pytest   # + circuit complet
```

## À régler avec Cherif

- `sql/05_whatsapp.sql`, `sql/06_demo_envoi.sql` et `sql/07_app.sql` sont à appliquer après ceux de Cherif (`scripts/`, `npm run db:sql`).
- `demo_fast_forward` crée des messages simulés, déjà « envoyés » : rien ne part sur WhatsApp. Pour la démo, utiliser `demo_envoyer` (ou `POST /admin/demo/...`).
- `MISSED_3` est créé avec le canal `voice` : le backend l'envoie quand même sur WhatsApp, mais le canal doit être `whatsapp` pour le prototype.
- La colonne `audio_url` reçoit le vrai chemin `.ogg` au moment de l'envoi, à la place du chemin `.mp3` calculé par la base.
- L'alerte agent après une réponse « 2 » n'existe pas encore (pas de type d'alerte prévu) : à ajouter côté base, par exemple avec un déclencheur sur `response_key = 2`.
- Les tables restent sans RLS. L'application n'écrit plus avec la clé publique : toutes ses écritures passent par le backend. Cherif peut donc activer la RLS avec des droits en lecture seule pour `anon`.
- Le seed n'a pas de centre Sylvanus Olympio : l'inscription dans ce centre renvoie une erreur tant qu'il n'est pas dans `health_centers`.
