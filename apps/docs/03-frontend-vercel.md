# 3. Mettre le frontend en ligne sur Vercel

L'application (`apps/frontend`, Next.js 16) se déploie sur Vercel. Elle lit Supabase directement et passe par le backend Render pour écrire.

Durée : 15 minutes environ.

Il faut :

- le backend en ligne (guide 1) et la valeur de son `ADMIN_TOKEN` ;
- l'adresse du projet Supabase et sa clé publique.

Comme pour Render, Vercel doit être autorisé sur le compte GitHub qui possède le dépôt. Si ce n'est pas le tien, Jérôme doit valider l'accès.

## Étape 1 : récupérer les clés Supabase

Dans Supabase, **Project Settings > API Keys** (ou **Data API**, selon la version de l'interface) :

- **Project URL** : `https://abcd1234.supabase.co`, pour `NEXT_PUBLIC_SUPABASE_URL` ;
- la clé **anon public** (`eyJ...`) ou la nouvelle clé **publishable** (`sb_publishable_...`), pour `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Ne jamais utiliser la clé `service_role` (ou `secret`) dans le frontend : elle passe outre toutes les règles de sécurité et serait visible dans le navigateur.

## Étape 2 : importer le projet

1. Se connecter sur vercel.com avec GitHub.
2. **Add New > Project**, puis **Import** en face du dépôt `Devi-fe-agbale`.
3. Dans l'écran de configuration :

| Champ | Valeur |
|---|---|
| Project Name | `devi-fe-agbale` |
| Framework Preset | `Next.js` (détecté seul) |
| Root Directory | `apps/frontend` (bouton **Edit**) |
| Build Command | laisser la valeur par défaut |
| Output Directory | laisser la valeur par défaut |
| Install Command | laisser la valeur par défaut |

`npm run build` lance d'abord `scripts/sync-voix.mjs`, qui copie les audios de `voix/` et les tables de `donnees_sante/` dans l'application. Ces dossiers sont à la racine du dépôt, en dehors de `apps/frontend`. Vercel les rend accessibles tant que l'option **Include files outside the root directory in the Build Step** reste activée (c'est le cas par défaut, dans **Settings > Build and Deployment > Root Directory**).

## Étape 3 : variables d'environnement

Toujours dans l'écran de configuration, section **Environment Variables** :

| Clé | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL de l'étape 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé publique de l'étape 1 |
| `BACKEND_URL` | `https://devi-backend.onrender.com` (sans `/` final) |
| `BACKEND_TOKEN` | la même valeur que `ADMIN_TOKEN` sur Render |

Les deux premières commencent par `NEXT_PUBLIC_` : elles sont écrites dans le code envoyé au navigateur au moment de la construction. Après les avoir modifiées, il faut redéployer.

`BACKEND_URL` et `BACKEND_TOKEN` ne sont lues que par le serveur Next (route `app/api/backend/[...chemin]/route.ts`). Le navigateur ne voit jamais le jeton.

Sans les deux variables Supabase, l'application démarre en mode local : enfants fictifs dans le navigateur, aucun message réel. Pratique pour une présentation sans réseau.

## Étape 4 : déployer

Cliquer sur **Deploy**. La construction prend 1 à 2 minutes. Dans le journal, la ligne `[sync-voix] 99 audios .ogg ...` confirme que les audios ont été copiés.

Vercel donne une adresse du type `https://devi-fe-agbale.vercel.app`.

## Étape 5 : vérifier

1. Ouvrir `https://devi-fe-agbale.vercel.app/connexion` et entrer comme agent de santé.
2. La liste des enfants affiche ceux de la base (centres Bè-Kpota et Sylvanus Olympio). Si elle affiche les enfants fictifs habituels, les variables Supabase n'ont pas été prises en compte : redéployer.
3. Inscrire un enfant de test avec le numéro d'un téléphone de l'équipe. Il doit apparaître dans la table `children` de Supabase.
4. Ouvrir `/confidentialite` : la page sert à Meta (guide 2, étape 10).

## Étape 6 : branche de production

**Settings > Git > Production Branch** : `master`. Chaque push sur `master` met à jour le site. Les autres branches (`mounix`, `features/dashboard`) reçoivent une adresse de prévisualisation à chaque push, sans toucher au site principal.

## En cas de problème

Les erreurs de lecture ou d'écriture s'affichent dans un bandeau rouge en haut de l'application.

| Message | Cause |
|---|---|
| `BACKEND_URL ou BACKEND_TOKEN non configuré` | variables absentes sur Vercel : les ajouter puis redéployer |
| `Backend (401) : jeton invalide` | `BACKEND_TOKEN` différent de `ADMIN_TOKEN` sur Render |
| `backend injoignable` | le service Render dort : attendre une minute et recommencer |
| `Lecture des enfants : column weigh_ins.height_cm does not exist` | `apps/backend/sql/07_app.sql` n'a pas été passé |
| `Lecture des enfants : permission denied` | la sécurité (RLS) est activée sans droit de lecture pour `anon` : Cherif doit ajouter une règle `select` pour ce rôle |
| `centre « sylvanus_olympio » absent de la table health_centers` | le seed de Cherif n'a pas encore ce centre |
| Construction : `[sync-voix] dossier voix introuvable` | option « Include files outside the root directory » désactivée (étape 2) |

## Lancer la même chose en local

```bash
cd apps/frontend
cp .env.example .env.local    # remplir les 4 variables
npm install
npm run dev
```

Avec le backend local sur le port 8000 (`apps/backend/README.md`), mettre `BACKEND_URL=http://localhost:8000`.
