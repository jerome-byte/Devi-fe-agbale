# Frontend ɖevi ƒe agbalẽ

Application web (Next.js 16, installable en PWA) du prototype : espace agent de santé, espace garderie, tableau de bord de pilotage et téléphone WhatsApp simulé pour écouter les vocaux en éwé.

## Lancer en local

```bash
cd apps/frontend
npm install
npm run dev        # http://localhost:3000
```

`npm run dev` et `npm run build` lancent d'abord `scripts/sync-voix.mjs`, qui copie depuis la racine du dépôt :

- les audios `.ogg` de `voix/audio/messages/` vers `public/voix/` (dossier ignoré par git) ;
- `voix/audio/messages/index_messages.json` vers `src/data/` ;
- `donnees_sante/calendrier_pev.csv`, converti en `src/data/calendrier_pev.json` ;
- `donnees_sante/oms_poids_age_filles.csv` et `_garcons.csv`, convertis en `src/data/oms_poids_age.json`.

Si Jérôme régénère les audios ou si Gerson met à jour le calendrier, il suffit de relancer `npm run sync`.

## Les pages

| Route | Pour qui | Ce qu'on y fait |
|---|---|---|
| `/` | Jury, public | Présentation du projet, vocaux à écouter |
| `/connexion` | Tous | Choix d'un compte de démo (agent, éducatrice, pilotage) |
| `/agent` | Agent | Liste priorisée : à appeler, vaccins du jour, 7 jours, réponses 1 / 2 |
| `/inscription` | Agent | Inscription en 3 écrans, QR, calendrier, message de bienvenue |
| `/scan` | Agent, éducatrice | Scan caméra (html5-qrcode), saisie du code, cartes de démo |
| `/enfant/[id]` | Agent, éducatrice | Carnet : vaccin prérempli, pesée, courbe OMS, journal, avance rapide, téléphone de la mère |
| `/carte/[id]` | Agent | Carte QR recto verso, à imprimer |
| `/enfants` | Agent, éducatrice | Recherche et filtres |
| `/garderie` | Éducatrice | Arrivées du jour, pesées, dépistages, actes manquants |
| `/pilotage` | Pilotage | Couverture, abandons, actes manquants, par zone (données anonymes) |
| `/pilotage/annonces` | Pilotage | Annonces vocales ciblées |
| `/messages` | Agent, pilotage | Journal des messages avec lecteur audio |

Le bouton « Parcours de démo » (barre latérale ou en haut sur mobile) ouvre les 5 étapes de la démo, chacune avec le bon compte.

## Organisation du code

```
src/
├── app/                 pages (App Router), groupe (app) = écrans connectés
├── components/          interface : coquille, carnet, téléphone WhatsApp, lecteur audio, courbe OMS
├── data/                fichiers générés par sync-voix (ne pas modifier à la main)
└── lib/
    ├── pev.ts           calendrier vaccinal et statut de chaque rendez-vous
    ├── oms.ts           poids pour l'âge (LMS OMS), seuils et stagnation de regles_croissance.md
    ├── regles.ts        alertes et score de priorité
    ├── voix.ts          choix de l'audio selon message, prénom et centre
    ├── indicateurs.ts   chiffres du tableau de bord
    ├── seed.ts          environ 300 enfants fictifs, calculés à partir de la date du jour
    └── store.ts         état de la démo (zustand, sauvegardé dans le navigateur)
```

## Deux modes de données

| Mode | Quand | Données |
|---|---|---|
| **Local** | aucune variable Supabase | Enfants fictifs dans le navigateur (`localStorage`). « Réinitialiser la démo » recharge le jeu de données. |
| **Base** | `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` définies (voir `.env.example`) | Les tables de Cherif dans Supabase, relues toutes les 15 secondes. |

En mode base :

- **lecture** directe dans Supabase avec la clé publique (`lib/base.ts`) ; seuls les enfants des deux centres qui ont des audios (Bè-Kpota, Sylvanus Olympio) sont affichés ;
- **écriture** par le backend FastAPI, via la route serveur `app/api/backend/[...chemin]/route.ts` qui ajoute le jeton `BACKEND_TOKEN` : inscription, vaccins, pesées, acte de naissance, boutons de démo, réponse « 1 » / « 2 » du téléphone simulé ;
- les boutons de démo (J-2, veille, jour J, manqué) envoient de **vrais** messages WhatsApp aux numéros autorisés par le backend ;
- restent dans le navigateur, faute de table : nom de famille, présences à la garderie, dépistages, annonces de `/pilotage`.

À l'inscription d'un enfant de plus de 14 jours, l'agent coche les vaccins déjà faits d'après le carnet papier. Sans cela, l'enfant apparaîtrait en retard et recevrait des relances par erreur.

Les calculs de référence (dates, z-scores, alertes) sont ceux de la base. `lib/oms.ts` et `lib/regles.ts` appliquent les mêmes règles (`donnees_sante/regles_croissance.md`) pour l'affichage et le mode local.

Déploiement : `apps/docs/`.

## Crédits

Photos sous licence Creative Commons, listées sur la page `/credits`.
