# Tableau de bord — ɖevi ƒe agbalẽ

Application Next.js du **tableau de bord de pilotage** du programme ɖevi ƒe agbalẽ
(Hack4Children 2026, UNICEF Togo). Elle affiche des indicateurs agrégés par zone
pour l'UNICEF, le ministère et les districts : couverture vaccinale, abandons,
actes de naissance, écoute des messages vocaux, croissance et alertes.
Un second écran, le **journal des messages**, permet d'écouter chaque vocal du
parcours sans téléphone.

Le rôle « pilotage » ne lit **que des vues agrégées** : aucune donnée nominative
(prénom, téléphone, QR) ne transite par cette application.

---

## 1. Ce que montre l'écran

| Bloc | Contenu | Source |
|---|---|---|
| Bandeau démo | nombre d'enfants fictifs | `v_demo_banner` |
| Huit indicateurs | enfants suivis, couverture, abandon Penta 1→3, actes manquants, écoute, alertes, croissance, risque élevé | `v_kpis` |
| Couverture par zone | barres avec seuils à 70 % et 85 % | `v_zone_summary` |
| Alertes ouvertes | répartition par type | `v_alerts_summary` |
| Où agir en priorité | tableau zones × quatre signaux | `v_penta_dropout`, `v_birth_cert`, `v_message_engagement`, `v_growth_by_zone` |
| Évolution sur 12 mois | courbe mensuelle | `v_coverage_trend` |
| Journal des messages | six vocaux du parcours et 60 derniers messages avec lecteur | `v_message_log` et catalogue audio |

L'écran se rafraîchit toutes les 30 secondes et le bouton **Actualiser** force
une relecture immédiate.

---

## 2. Stack

- **Next.js 16** (App Router, Turbopack) et **React 19**
- **TypeScript**
- **Tailwind CSS 4** avec des jetons de couleur définis dans `app/globals.css`
- **@supabase/supabase-js** pour lire les vues
- **Atkinson Hyperlegible** via `next/font/google` (lisibilité, malvoyance)

---

## 3. Démarrage

Prérequis : **Node.js 20.9 ou plus récent** (testé avec Node 24) et npm.

```powershell
cd devi-dashboard
npm install
copy .env.example .env.local
# renseigner les deux variables dans .env.local
npm run dev
```

Ouvrir <http://localhost:3000> : la racine redirige vers `/dashboard`.

### Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | build de production + vérification TypeScript |
| `npm run start` | sert le build de production |
| `npm run lint` | ESLint (config Next + TypeScript) |
| `npm run db:sql -- <fichier>` | exécute un fichier SQL sur Supabase (voir plus bas) |
| `npm run db:init` | applique `01`, `02`, `04`, le seed `03`, puis charge les référentiels de `donnees_sante/` |
| `npm run db:reference` | recharge seulement le calendrier PEV et les tables OMS |
| `npm run audio:sync` | copie les 99 `.ogg` dans `public/` et régénère `lib/catalogue.json` |

### Variables d'environnement

| Variable | Où la trouver | Remarque |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase, Project Settings, API, Project URL | publique |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase, Project Settings, API, clé `publishable` | publique, protégée par RLS |

Ces deux valeurs sont exposées au navigateur par construction : elles ne donnent
accès qu'à ce que les politiques RLS et les droits sur les vues autorisent.
Le fichier `.env.local` et le mot de passe de la base (`supabase_passwoed.txt`)
sont ignorés par git et ne doivent jamais être commités.

---

## 4. Comment le code fonctionne

```
app/
├── layout.tsx              racine HTML, police, métadonnées, CSS global
├── page.tsx                redirige / vers /dashboard
├── globals.css             jetons de couleur, focus, styles d'impression
├── dashboard/
│   ├── page.tsx            état, chargement des données, composition de l'écran
│   └── components.tsx      composants de présentation (aucune requête réseau)
└── journal/
    ├── layout.tsx          métadonnées de l'onglet
    └── page.tsx            journal des messages et lecteur audio
lib/
├── dashboard.ts            client Supabase et lecture des vues
├── audio-catalog.ts        correspondance template → audio, prénoms et centres
└── catalogue.json          catalogue audio généré depuis voix/
public/audio/messages/      99 .ogg servis à /journal
```

### Flux de données

1. `page.tsx` appelle `loadDashboard()` au montage, puis toutes les 30 secondes.
2. `loadDashboard()` lance neuf requêtes en parallèle, une par vue, et renvoie un
   objet unique typé (`DashboardData`).
3. Les composants de `components.tsx` reçoivent cet objet et ne font que le
   mettre en forme. Aucun composant ne parle à Supabase directement.
4. En cas d'erreur, l'écran conserve les dernières données affichées et ajoute un
   bandeau avec le détail technique et un bouton **Réessayer**.
5. Pendant le premier chargement, un squelette reprend la forme des blocs pour
   éviter les sauts de mise en page.

### Ajouter ou modifier un indicateur

1. Ajouter la colonne dans la vue SQL correspondante (`sql/02_views.sql`).
2. Compléter le type dans `lib/dashboard.ts`.
3. Ajouter l'entrée dans `buildKpis()` (`app/dashboard/page.tsx`) ou dans le
   composant concerné.

### Conventions d'affichage

- Nombres et pourcentages au format français (`74,9 %`, espace insécable avant `%`).
- Chiffres en `tabular-nums` pour que les colonnes restent alignées.
- Aucune couleur ne porte seule une information : les niveaux sont aussi écrits
  dans les libellés accessibles (`aria-label`).

---

## 5. Base de données Supabase

Le projet Supabase est déjà créé et contient le schéma, les vues et le jeu de
démonstration. Tout le SQL vit dans `../sql/` (à la racine du dépôt).

### Ordre d'application

| Ordre | Fichier | Contenu |
|---|---|---|
| 1 | `sql/01_schema.sql` | tables, calendrier PEV, index |
| 2 | `sql/02_views.sql` | vues `v_*` du tableau de bord |
| 3 | `sql/04_rules.sql` | moteur de règles, déclencheurs, boutons de démo |
| 4 | `sql/03_seed_demo.sql` | 300 enfants fictifs et leur suivi |
| 5 | `scripts/load-reference.mjs` | calendrier PEV et tables OMS depuis `donnees_sante/`, recalcul des z-scores |

Le plus simple : `npm run db:init`, qui applique les quatre fichiers puis charge
les référentiels de `donnees_sante/`. Sinon, exécuter les fichiers dans cet ordre
dans le SQL Editor (le seed `03` est trop volumineux pour l'éditeur web).

### Tables principales

| Table | Rôle |
|---|---|
| `zones`, `health_centers`, `daycares` | découpage géographique |
| `vaccine_schedule` | calendrier PEV du Togo (23 doses, 9 contacts), métadonnées du CSV validé |
| `who_weight_for_age` | tables OMS poids pour l'âge (61 mois × 2 sexes, LMS + écarts-types) |
| `who_height_for_age` | tables OMS taille pour l'âge (0-24 et 24-60 mois, 2 sexes) |
| `who_bmi_for_age` | tables OMS IMC pour l'âge (mêmes bandes) |
| `vitamin_a_schedule` | calendrier vitamine A et déparasitage (17 lignes) |
| `children` | carnet de l'enfant, `qr_token` sans donnée personnelle |
| `guardians` | responsable légal, langue, canal préféré |
| `appointments` | rendez-vous vaccinaux, statut `planned` / `done` / `missed` |
| `weigh_ins` | pesées, z-score, tendance et statut OMS (`normal`, `a_surveiller`, `a_orienter`) |
| `messages` | journal des messages vocaux et réponses |
| `alerts` | alertes ouvertes, acquittées ou résolues |
| `profiles` | comptes par rôle (`agent`, `educatrice`, `pilotage`, `admin`) |

Les codes vaccins sont ceux du calendrier validé par Gerson : `BCG`, `VPO`,
`PENTA`, `PNEUMO`, `ROTA`, `VPI`, `VAP`, `RR`, `VAA`, `MENA`. Les libellés longs
restent dans `label_fr`.

État des référentiels : 23 doses, 122 lignes OMS poids, 124 lignes taille, 124 lignes
IMC, 17 lignes vitamine A / déparasitage. 3 769 pesées et 3 788 statuts recalculés.

### Règles de croissance

Appliquées par le déclencheur `trg_weigh_in_compute` à chaque pesée, et
recalculées sur l'historique par `npm run db:reference`. Les seuils s'appliquent
aux **trois indicateurs** (poids, taille, IMC) et le statut retenu est le plus
grave :

| Situation | Statut / alerte |
|---|---|
| z-score ≥ −2 et ≤ +2 | `normal` |
| z-score < −2 (poids, taille ou IMC) | `a_surveiller`, alerte `growth_surveiller` |
| z-score < −3 (poids, taille ou IMC) | `a_orienter`, alerte `growth_orient` prioritaire |
| IMC > +2 (surpoids) | `a_surveiller`, alerte `growth_surveiller` |
| poids identique ou en baisse après au moins un mois, ou chute d'au moins une ligne de z | tendance `stagnation` ou `chute`, alerte `growth_stagnation` |

Le z-score est calculé avec les colonnes `L`, `M`, `S` de la table OMS du sexe et
de l'âge en mois révolus. Taille et IMC utilisent la bande 0-2 avant 24 mois et
2-5 à partir de 24 mois. `weigh_ins.status_indicator` indique l'indicateur en
cause (`poids`, `taille` ou `imc`). L'application n'affiche jamais de diagnostic :
seulement « à surveiller » ou « à orienter ».

### Vues lues par le tableau de bord

| Vue | Usage |
|---|---|
| `v_kpis` | les huit indicateurs en une ligne |
| `v_demo_banner` | nombre d'enfants de démonstration |
| `v_zone_summary` | couverture et niveau par zone |
| `v_penta_dropout` | abandon Penta 1→3 |
| `v_birth_cert` | actes de naissance manquants |
| `v_message_engagement` | messages envoyés et écoutés |
| `v_growth_by_zone` | stagnation et insuffisance pondérale |
| `v_coverage_trend` | couverture mensuelle sur 12 mois |
| `v_alerts_summary` | alertes par zone et par type |
| `calendrier_vaccinal` | vue de compatibilité : calendrier avec les colonnes des notices (`contact`, `age_libelle`, `vaccin_nom`, `dose`…) |
| `oms_reference` | vue de compatibilité : les trois indicateurs (`poids_age`, `taille_age`, `imc_age`), LMS et écarts-types, avec la bande |
| `v_message_log` | journal des messages (prénom fictif, centre, template, statut, dates, réponse) |

Toutes les vues sont recalculées à chaque lecture : avec 300 enfants, la latence
reste négligeable et les chiffres sont toujours à jour.

### Exécuter du SQL sur Supabase

Trois méthodes, selon la taille du fichier.

| Méthode | Quand l'utiliser | Limite |
|---|---|---|
| SQL Editor (interface web) | corrections ponctuelles, petites requêtes | refuse les gros fichiers comme le seed (1,6 Mo, près de 12 000 lignes) |
| Script du projet (`npm run db:sql`) | `01_schema.sql`, `02_views.sql`, `04_rules.sql`, `03_seed_demo.sql` | aucune limite pratique, tout passe par une connexion directe |
| `psql` | si PostgreSQL est installé sur la machine | identique, mais nécessite `psql` |

#### Méthode recommandée : le script du projet

Le script lit `.env.local` pour l'URL du projet, récupère le mot de passe dans
`supabase_passwoed.txt` (ou dans la variable `SUPABASE_DB_PASSWORD`) et se
connecte au pooler IPv4.

```powershell
cd devi-dashboard

# 1. Structure et vues
npm run db:sql -- ../sql/01_schema.sql
npm run db:sql -- ../sql/02_views.sql

# 2. Moteur de règles
npm run db:sql -- ../sql/04_rules.sql

# 3. Données de démonstration (le fichier volumineux)
npm run db:sql -- ../sql/03_seed_demo.sql
```

Chaque fichier est exécuté tel quel, avec un compte rendu du nombre de lignes et
de la durée. En cas d'erreur, le numéro de ligne est affiché et les traitements
suivants sont arrêtés. Le seed est rejouable : il supprime d'abord les enfants
`is_demo` avant de réinsérer.

Si le pooler par défaut n'est pas le bon, ajouter dans `.env.local` l'hôte
affiché par le script (exemple pour le projet actuel) :

```ini
SUPABASE_POOLER_HOST=aws-1-eu-central-2.pooler.supabase.com
```

#### Pourquoi pas la connexion directe

`db.<project-ref>.supabase.co` n'écoute qu'en IPv6 et échoue sur la plupart des
réseaux locaux. Le pooler IPv4 (`aws-1-<région>.pooler.supabase.com:5432`)
accepte les scripts multi-instructions et les transactions. Le projet actuel est
sur `aws-1-eu-central-2`.

#### Avec `psql`, si vous l'avez

```powershell
psql "postgresql://postgres.<project-ref>@<pooler-host>:5432/postgres" `
  -f ../sql/03_seed_demo.sql
```

Le mot de passe est demandé à la connexion. Il est conservé localement dans
`supabase_passwoed.txt` (ignoré par git).

#### Découper le seed pour le SQL Editor

Si vous devez absolument passer par l'interface web, découpez
`sql/03_seed_demo.sql` en blocs se terminant par un point-virgule, en gardant
`begin;` dans le premier bloc et `commit;` dans le dernier, et exécutez les blocs
dans l'ordre. C'est fastidieux ; le script du projet fait la même chose en une
commande.

### Basculer sur un autre projet Supabase

1. Remplacer dans `.env.local` l'URL et la clé publishable du nouveau projet.
2. Déposer le mot de passe de la base dans `supabase_passwoed.txt`, ou renseigner
   `SUPABASE_DB_PASSWORD` dans `.env.local`.
3. Appliquer tout le schéma d'un coup :

```powershell
cd devi-dashboard
npm run db:init
```

Le script détecte seul la région du pooler en essayant les régions Supabase
courantes, puis affiche celle qui a répondu. S'il ne trouve pas, ajouter dans
`.env.local` :

```ini
SUPABASE_POOLER_HOST=aws-1-eu-central-2.pooler.supabase.com
```

`db:init` est rejouable sur une base déjà remplie : les tables utilisent
`if not exists`, les vues sont remplacées, les fonctions et déclencheurs sont
recréés, et le seed supprime d'abord les enfants `is_demo`.

### Régénérer les données de démonstration

Le seed est daté relativement à aujourd'hui : il faut le régénérer juste avant
une démo ou des captures, sinon les rappels « J-2 » et les rendez-vous manqués
sont décalés.

```powershell
python seed/generate_seed.py               # écrit sql/03_seed_demo.sql, as_of = aujourd'hui
python seed/generate_seed.py --n 300 --seed 4 --as-of 2026-11-20
```

Puis recharger le seed et recalculer les référentiels :

```powershell
cd devi-dashboard
npm run db:init
```

`db:init` supprime d'abord les enfants `is_demo` : il est rejouable sans doublon.

### Droits

- `02_views.sql` accorde `select` à `anon` et `authenticated` sur les vues
  agrégées et sur les vues de compatibilité.
- L'application ne lit que ces vues. Les tables brutes ne sont pas utilisées par
  le tableau de bord ; si le projet est partagé au-delà de l'équipe, activer RLS
  sur les tables sensibles.
- Le tableau de bord n'effectue aucune écriture.

---

## 6. Journal des messages

Page `/journal` : les vocaux du parcours, écoutables sans téléphone.

### Ce que montre l'écran

- **Parcours de Kossi** : les six messages clés (bienvenue, J-2, veille, jour J,
  rendez-vous manqué, acte de naissance), avec le texte français, le texte éwé,
  la durée et un lecteur. Cette section est indépendante des données : elle
  montre toujours les variantes `Kosi` / `Bè-Kpota`.
- **Journal** : les 60 derniers messages de `v_message_log`, avec la date, le
  statut, le prénom fictif, le centre, le canal, la réponse 1 / 2 et le lecteur.
- Filtres : type de message et case « Avec audio ».
- Une ligne sans variante audio affiche « Audio non disponible pour ce prénom ou
  ce centre ».

### Comment l'audio est choisi

1. `template_code` de la base → `id` du catalogue (`WELCOME` → `bienvenue`,
   `MISSED_3` → `manque_3j`, etc., table complète dans `voix/README_voix.md`).
2. Normalisation du prénom (`Kossi` → `Kosi`, `Kodjo` → `Kodzo`,
   `Akossiwa` → `Akosiwa`) et du centre (`Bè-Kpota` → `be_kpota`).
3. Sélection de la variante qui correspond aux variables du message : aucune,
   prénom seul, ou prénom + centre.
4. Les textes `{prenom}` et `{centre}` sont remplacés dans les versions française
   et éwé.

### Mettre à jour les audios

```powershell
cd devi-dashboard
npm run audio:sync
```

Le script copie les 99 `.ogg` dans `public/audio/messages/` (2,8 Mo) et régénère
`lib/catalogue.json` depuis `voix/audio/messages/index_messages.json`, avec des
chemins `/audio/messages/...`. Il tourne aussi automatiquement avant `dev` et
`build` (`predev`, `prebuild`). Le dossier copié est ignoré par git : les
binaires ne sont pas dupliqués dans le dépôt.

### Limites

- Le catalogue ne couvre que **10 prénoms et 2 centres** : beaucoup de lignes du
  journal n'ont donc pas d'audio. Le parcours de Kossi, lui, est complet.
- Le moteur `run_rules` écrit encore des chemins `.mp3` dans
  `messages.audio_url`. Le journal ne les utilise pas ; il faudra aligner le
  moteur sur le catalogue dans une prochaine passe.

## 7. Design system

Le style reprend les codes d'un rapport de situation institutionnel : hairlines,
angles droits, aucune ombre, un seul accent graphique.

| Jeton | Valeur | Usage |
|---|---|---|
| `--color-canvas` | `#F3F7FA` | fond de page |
| `--color-surface` | `#FFFFFF` | panneaux |
| `--color-ink` | `#0B2B4A` | titres et chiffres |
| `--color-muted` | `#56677A` | texte secondaire |
| `--color-line` | `#DBE5EE` | hairlines |
| `--color-unicef` | `#1CABE2` | règle haute, courbe, marqueurs |
| `--color-deep` | `#0E4C92` | boutons, liens, accents texte |
| `--color-good` | `#1B7F5A` | zone au-dessus de 85 % |
| `--color-warn` | `#96660F` | zone entre 70 et 85 % |
| `--color-bad` | `#A83737` | zone sous 70 % |

Le bleu UNICEF `#1CABE2` a un contraste trop faible sur blanc : il sert
uniquement de couleur graphique, jamais de couleur de texte. Les textes utilisent
`ink`, `muted` ou `deep`.

Règles de composition : pas d'arrondi, pas d'ombre, une seule famille
typographique, des chiffres tabulaires, et des seuils écrits en clair sous les
graphiques. Les styles d'impression masquent le bouton d'actualisation pour
permettre une sortie PDF propre.

---

## 8. Vérifications

```powershell
npm run lint
npm run build
```

Les deux commandes passent sur la version courante. Le tableau de bord a été
contrôlé dans un navigateur à 1440 px, 834 px et 390 px de large, sans
débordement horizontal. Le journal a été vérifié dans le navigateur (rendu,
lecteurs, absence d'erreur) : `/journal` répond en 200, un fichier `.ogg` répond
en `200 audio/ogg`, 60 messages s'affichent et les six lecteurs du parcours sont
présents.

---

## 9. Déploiement sur Vercel

1. Importer le dépôt GitHub, choisir le dossier racine `devi-dashboard`.
2. Framework détecté : Next.js. Build : `npm run build`.
3. Ajouter `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans
   les variables d'environnement du projet Vercel (Production et Preview).
4. Déployer. Aucune autre configuration n'est nécessaire : la page est générée
   statiquement et lit Supabase côté navigateur.

Le build lance `audio:sync`, qui lit `../voix/audio/messages`. Le dossier `voix/`
doit donc être présent dans le dépôt (c'est le cas). Si vous déployez uniquement
`devi-dashboard`, lancez `npm run audio:sync` puis retirez
`/public/audio/messages/` du `.gitignore` pour versionner la copie.

---

## 10. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `'next' n'est pas reconnu` | `node_modules` incomplet | `npm install` dans `devi-dashboard` |
| Page vide ou 404 sur `/` | mauvais dossier de travail | lancer depuis `devi-dashboard`, la racine redirige vers `/dashboard` |
| `Impossible de charger les indicateurs` | variables absentes ou vues non créées | vérifier `.env.local`, puis `sql/02_views.sql` |
| `division by zero` dans `v_kpis` | tables vides | recharger `sql/03_seed_demo.sql` |
| `psql` ne se connecte pas | connexion directe en IPv6 | utiliser le pooler affiché par le script (projet actuel : `aws-1-eu-central-2`) |
| Les alertes ne bougent pas | moteur de règles non exécuté | `select * from run_rules();` dans le SQL Editor |
| `relation "v_message_log" does not exist` | vue non créée | `npm run db:sql -- ../sql/02_views.sql` |
| Audio en 404 dans le journal | copie absente | `npm run audio:sync` |
| « Audio non disponible » partout | prénom ou centre hors catalogue | le catalogue couvre 10 prénoms et 2 centres |

---

## 11. Limites connues

- **Tables OMS taille et IMC** : seules les tables de poids pour l'âge sont
  chargées. Les 8 fichiers taille/IMC et le calendrier vitamine A sont attendus
  pour la finale ; `weigh_ins` n'a pas encore de colonne `height_cm`.
- **Taille et IMC** : les tables sont chargées et le calcul est actif, mais le
  seed ne contient pas de taille. Les indicateurs taille/IMC s'appliqueront aux
  mesures saisies dans l'application ; la vérification Gerson du 20 novembre doit
  inclure des tailles.
- **Vitamine A et déparasitage** : le calendrier est chargé, mais les rappels
  correspondants ne sont pas encore produits par `run_rules`.
- **Couverture audio** : 10 prénoms et 2 centres seulement. Les messages dont le
  prénom ou le centre n'est pas couvert affichent « audio non disponible ».
- **Moteur de messages** : `run_rules` écrit encore des chemins `.mp3` dans
  `messages.audio_url` et n'envoie pas encore de message `pesee` mensuel ni de
  message `croissance` à la famille.
- **Tableau de bord** : la couverture par vaccin et par dose, les doses en retard
  par centre, la séparation « à surveiller / à orienter » et les mesures à jour
  ne sont pas encore affichées.
- **Vérification Gerson** : les 3 enfants de test du 20 novembre restent à
  préparer et à envoyer.
- **Score de risque** : `v_child_risk` existe mais n'est pas détaillé dans
  l'interface ; les boutons `demo_fast_forward` sont dans la base, pas à l'écran.
