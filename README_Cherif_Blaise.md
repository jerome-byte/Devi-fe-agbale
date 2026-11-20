# Pour Cherif et Blaise : ce qui a changé depuis la fusion, et ce qui reste

De Jérôme, le 20 novembre 2026. À lire avant de reprendre le travail sur le dépôt.

## 1. Avant de commencer

```bash
git checkout master
git pull origin master
git fetch --prune
```

- Les branches `mounix` (Blaise, PR #4) et `features/dashboard` (Cherif, PR #1, puis vos corrections de l'issue du 19 novembre) sont **fusionnées dans `master`** et **supprimées sur GitHub** depuis le 20 novembre. Tout leur travail est dans `master` : rien n'est perdu. `git fetch --prune` retire de votre ordinateur les références à ces branches supprimées.
- Si vous avez encore une branche locale `mounix` ou `features/dashboard`, elle ne sert plus : `git branch -D mounix` (ou `git branch -D features/dashboard`). Si vous y aviez des changements jamais poussés, prévenez-moi avant de la supprimer.
- Pour une nouvelle tâche, partez de `master` à jour et créez une branche par sujet, par exemple `git checkout -b finale/appel-vocal`. On fusionne ensuite par pull request.
- Après le `pull` : `npm install` dans `apps/frontend` et dans `scripts/`.
- **Tout ce qui touche la base est déjà appliqué sur Supabase**. Il n'y a rien à rejouer.
- Backend en local : ajoutez dans `apps/backend/.env` les deux nouvelles variables `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` (voir `.env.example`). Elles servent seulement aux pages Structures et Comptes. Sur Render, elles sont déjà réglées.
- Rappels : aucun secret dans git (`.env`, clés, mots de passe), uniquement des données fictives. Pour le prototype, tout passe par WhatsApp.

## 2. Ce qui a changé dans le dépôt

| Avant | Maintenant |
|---|---|
| `devi-dashboard/` (interface de tableau de bord séparée) | Supprimé. Le tableau de bord est l'**espace Pilotage** de l'application (`apps/frontend`). |
| Scripts de la base dans `devi-dashboard/scripts/` | Dans **`scripts/`** à la racine (`npm run db:init`, `db:reference`, `gerson:check`) |
| Documents en vrac à la racine | `docs/` (plan, dossier de candidature, rapport pour Gerson) et `donnees_sante/sources/` (documents d'origine de Gerson) |
| Audios `.wav` et `.ogg` | `.ogg` seulement. Les `.wav` sont ignorés par git. |
| Anciens logos et icônes | Seule la version `-v2` reste (`public/logo-marque-v2.png`, `public/icons/*-v2.png`) |

## 3. Blaise : ce qui a changé dans l'application et le backend

### Application (`apps/frontend`)
- **Couleurs et logo** : palette bleu nuit (`primary-900 #102b49`, barre latérale sombre), nouveau logo, logo plus grand sur la page d'accueil.
- **Connexion** : une page de connexion par rôle (agent, garderie, pilotage). Si une session est déjà ouverte, la page renvoie directement vers l'accueil du rôle.
- **Pilotage** : vos écrans branchés sur les calculs de Cherif. Deux pages nouvelles :
  - **Structures** : liste des hôpitaux, centres de santé et garderies ; création d'une structure. On peut créer une zone depuis le même formulaire.
  - **Comptes** : création d'un compte agent ou éducatrice rattaché à sa structure, désactivation et réactivation, nouveau mot de passe, **suppression définitive** (menu ⋯ du compte, avec confirmation). Un compte désactivé ne peut plus rien lire, même avec une session encore ouverte. Un compte supprimé disparaît ; les enfants, vaccins et pesées qu'il a saisis restent, sans auteur.
- **Inscription** : l'enfant est inscrit directement dans le centre de l'agent connecté.
- **Application installable** sur téléphone :
  - `manifest.ts`, avec le nom court « ɖevi gbalẽ » sous l'icône ;
  - `public/sw.js` ;
  - message d'installation (`installer-app.tsx`) au premier lancement ;
  - icône d'onglet (`favicon.ico` et `icon.png`).

  L'application installée s'ouvre sur l'accueil.
- **Menu Messages** :
  - retiré du Pilotage (l'ancienne adresse renvoie vers le tableau de bord) ;
  - chez l'agent, il ouvre directement les réponses des familles.

  Les listes d'enfants affichent « Cliquez sur un enfant pour voir son dossier ».
- **Réinitialiser la démo** (menu du compte) : remet à zéro dans la base les enfants avancés dans le temps pendant la démo (`admin/demo/{id}/reset`). Les messages et alertes de ces enfants sont effacés, les rendez-vous manqués repassent à « prévu », les vaccins faits restent faits.
- **Scan QR corrigé**. Avec la base, les identifiants sont des UUID en minuscules : l'ancien code les passait en majuscules et ne trouvait jamais l'enfant. Maintenant :
  - le scan accepte le QR, un lien qui contient le code, ou un code tapé à la main, sans tenir compte des majuscules ;
  - un **code court** de 8 caractères (ex. `0D49633F`) s'affiche sous le QR de la carte et de l'écran d'inscription (`codeCarte()` dans `lib/utils.ts`) ;
  - la caméra ne pointe plus deux fois le même enfant ;
  - le message d'erreur dit « pas dans votre garderie » ou « pas dans votre centre ».

  Testé en ligne avec les deux rôles.
- **Flèche « ← Retour »** en haut de toutes les pages (dans `EntetePage`, `components/ui.tsx`). Elle est masquée sur les accueils Agent, Garderie et Pilotage.
- **Bulle d'aide `Aide`** (`components/ui.tsx`), nouvelle : une icône ⓘ qui ouvre une petite explication au survol de la souris ou au toucher sur téléphone. Elle n'est pas coupée par un tableau qui défile. Pour l'instant, elle sert au score de risque du Pilotage ; vous pouvez la réutiliser ailleurs : `<Aide>texte</Aide>`.
- **Pilotage** : nouvelle carte « Enfants à risque élevé » et nouvelle colonne « Risque élevé » dans le tableau des zones (voir la partie Cherif). Sur téléphone, la 5e carte prend toute la largeur.

### Backend (`apps/backend`)
- `app/comptes.py` (nouveau) : routes `/admin/zones`, `/admin/structures` et `/admin/comptes`, dont `POST /admin/comptes/{id}/supprimer`. La suppression détache d'abord le compte (`children.created_by`, `appointments.recorded_by`, `weigh_ins.recorded_by`, `profiles.created_by`), puis supprime le profil et le compte Supabase Auth dans une même transaction. La clé d'administration de Supabase reste sur le serveur. Avec les nouvelles clés `sb_secret_…`, elle passe dans l'en-tête `apikey` seulement. Tests : `tests/test_comptes.py`.
- `DESTINATAIRES_AUTORISES` ne s'applique plus qu'en mode `live`. En simulation, tous les messages s'affichent dans le téléphone simulé (`Settings.filtre_destinataires`).
- `catalogue.py` : les codes PESEE, CROISSANCE et VITAMINE_A sont reliés à leurs audios. DEPARASITAGE attend son enregistrement.
- `sql/06_demo_envoi.sql` : `demo_reset_envoi` ne remet à « prévu » que les rendez-vous manqués.
- `tests/test_integration.py` sait tourner contre le backend en ligne.

## 4. Cherif : ce qui a changé dans la base et les données

- **`sql/07_comptes_structures.sql`** (nouveau, déjà appliqué) :
  - `health_centers.kind` distingue hôpital et centre ; le CHU Sylvanus Olympio est classé hôpital ;
  - `profiles` gagne `email`, `active`, `created_at` et `created_by` ;
  - `mon_role()`, `mon_centre()` et `ma_garderie()` ne renvoient plus rien pour un compte désactivé, donc la sécurité par rôle le bloque.
- **`sql/04_rules.sql`** : nouvelle alerte `reply_unavailable`. Quand la mère répond « 2 » (empêchement), l'agent de son centre est prévenu, par le déclencheur `messages_reponse_empechement`.
- **Sylvanus Olympio** est dans la zone de **Hanoukopé** (seed et `seed/generate_seed.py`).
- **Données en ligne** :
  - un doublon de Kossi Amouzou a été supprimé ; on garde Kossi Amouzou (code `0D49633F`) pour la démo ;
  - Les présences de la garderie ne sont **pas** dans la base : elles restent dans le navigateur de l'éducatrice (`fusionnerLocal` dans `lib/base.ts`) et s'effacent quand on se déconnecte. Pendant la démo, l'éducatrice reste donc connectée sur le même appareil.
- **Votre score de risque est maintenant dans le Pilotage**, sans aucun nom :
  - nouvelle vue **`v_risk_by_zone`** dans `sql/02_views.sql`, déjà créée sur Supabase. Elle compte par zone les enfants à risque élevé (score de 10 ou plus) et moyen (5 à 9), avec la zone 0 pour le total. `v_child_risk` reste fermée au navigateur ;
  - une carte « Enfants à risque élevé » en haut du tableau de bord (81 enfants sur 304, soit 27 %) et une colonne « Risque élevé » dans le tableau des zones (Baguida en tête, avec 30 enfants sur 39). L'icône ⓘ ouvre une bulle d'aide qui explique le calcul ;
  - sans Supabase, l'application calcule le même score dans le navigateur (`scoreRisque()` dans `lib/indicateurs.ts`), sans la distance.

  Si vous changez les poids ou le seuil de 10, changez aussi `scoreRisque()` et `SEUIL_RISQUE`.

## 5. Ce qui reste à faire pour le prototype

Dépôt sur U-Events **le 22 novembre au plus tard** (clôture le 23 novembre à 00 h).

### Blaise
1. **Brancher le vrai WhatsApp (Meta)**, le 21 novembre, en suivant `apps/docs/02-whatsapp-meta.md`. Sur Render :
   - `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` ;
   - webhook `https://devi-backend-5r52.onrender.com/webhook/whatsapp` ;
   - `DESTINATAIRES_AUTORISES` = les numéros de l'équipe seulement ;
   - puis `WHATSAPP_MODE=live`.

   Faites ensuite un essai complet sur un téléphone de l'équipe : vocal reçu, réponse 1 et réponse 2. Si Meta n'est pas prêt à temps, la démo se fait avec le téléphone simulé, qui marche déjà.
2. **Essai sur un vrai téléphone Android**, le 21 novembre : installer l'application, scanner une carte imprimée avec la caméra, en garderie et en centre de santé.

### Cherif
1. Corriger les calculs si Gerson signale une erreur dans `docs/verification_gerson_20nov.md` (21 nov.).
2. M'envoyer 3 ou 4 chiffres du tableau de bord et du score de risque pour le PDF : couverture Penta 3, taux d'abandon, enfants à risque élevé, enfants sans acte de naissance (21 nov.).
3. Après la répétition : vérifier que les chiffres du Pilotage reviennent à la normale avec « Réinitialiser la démo ».
4. **Supports du dépôt U-Events** (21 nov. au soir, détails dans l'issue #7) :
   - 1 à 5 captures d'écran (PNG, JPEG ou WEBP, 4 Mo au plus chacune), une par étape du parcours ;
   - une courte vidéo facultative (30 à 45 secondes, MP4 ou WEBM, 4 Mo au plus) ;
   - les notes du dépôt (4 000 caractères au plus) : lien de démonstration, identifiants des trois comptes de démonstration, lien de la vidéo longue s'il y en a une.

   Données fictives uniquement. Dépose les fichiers dans `docs/depot/` par une pull request, ou envoie-les-moi.

### Jérôme (pour info)
- Enregistrer l'audio du déparasitage.
- Faire la présentation PDF, avec tes captures, ta vidéo et tes notes.
- Faire le dépôt sur U-Events.

### Toute l'équipe
- **22 novembre** : répétition complète du parcours de démonstration en ligne (inscription, vocal de bienvenue, avance rapide, rendez-vous manqué et réponse, scan au centre, tableau de bord), puis « Réinitialiser la démo ».

Une question ou un souci : ouvrez une issue GitHub en me taguant.
