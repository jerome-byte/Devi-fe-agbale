# Tableau de bord — ɖevi ƒe agbalẽ

Application Next.js du **tableau de bord de pilotage** du programme ɖevi ƒe agbalẽ
(Hack4Children 2026, UNICEF Togo). Elle affiche des indicateurs agrégés par zone
pour l'UNICEF, le ministère et les districts : couverture vaccinale, abandons,
actes de naissance, écoute des messages vocaux, croissance et alertes.

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
| `npm run db:init` | applique `01`, `02`, `04` puis le seed `03`, dans le bon ordre |

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
└── dashboard/
    ├── page.tsx            état, chargement des données, composition de l'écran
    └── components.tsx      composants de présentation (aucune requête réseau)
lib/
└── dashboard.ts            client Supabase et lecture des vues
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

À exécuter dans le **SQL Editor** de Supabase, dans cet ordre. Les vues doivent
être créées avant le seed, qui insère des lignes dont dépendent les alertes.

### Tables principales

| Table | Rôle |
|---|---|
| `zones`, `health_centers`, `daycares` | découpage géographique |
| `vaccine_schedule` | calendrier PEV du Togo (23 doses, 9 contacts) |
| `children` | carnet de l'enfant, `qr_token` sans donnée personnelle |
| `guardians` | responsable légal, langue, canal préféré |
| `appointments` | rendez-vous vaccinaux, statut `planned` / `done` / `missed` |
| `weigh_ins` | pesées, z-score et tendance |
| `messages` | journal des messages vocaux et réponses |
| `alerts` | alertes ouvertes, acquittées ou résolues |
| `profiles` | comptes par rôle (`agent`, `educatrice`, `pilotage`, `admin`) |

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

Si le pooler par défaut n'est pas le bon, ajouter dans `.env.local` :

```ini
SUPABASE_POOLER_HOST=aws-1-eu-west-1.pooler.supabase.com
```

#### Pourquoi pas la connexion directe

`db.<project-ref>.supabase.co` n'écoute qu'en IPv6 et échoue sur la plupart des
réseaux locaux. Le pooler IPv4 (`aws-1-eu-west-1.pooler.supabase.com:5432`)
accepte les scripts multi-instructions et les transactions.

#### Avec `psql`, si vous l'avez

```powershell
psql "postgresql://postgres.<project-ref>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" `
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
SUPABASE_POOLER_HOST=aws-1-eu-west-1.pooler.supabase.com
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

Puis recharger `sql/03_seed_demo.sql` dans le SQL Editor. Le script supprime
d'abord les enfants `is_demo` : il est rejouable sans doublon.

### Droits

- Les vues sont accessibles en lecture à la clé publishable : `02_views.sql`
  accorde `select` à `anon` et `authenticated` sur les vues agrégées.
- Les tables brutes ne doivent pas être exposées au rôle pilotage : garder les
  politiques RLS activées et les `grant` commentés en bas de `02_views.sql`.
- Le tableau de bord n'effectue aucune écriture.

---

## 6. Design system

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

## 7. Vérifications

```powershell
npm run lint
npm run build
```

Les deux commandes passent sur la version courante. Le rendu a été contrôlé dans
un navigateur à 1440 px, 834 px et 390 px de large, sans débordement horizontal.

---

## 8. Déploiement sur Vercel

1. Importer le dépôt GitHub, choisir le dossier racine `devi-dashboard`.
2. Framework détecté : Next.js. Build : `npm run build`.
3. Ajouter `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans
   les variables d'environnement du projet Vercel (Production et Preview).
4. Déployer. Aucune autre configuration n'est nécessaire : la page est générée
   statiquement et lit Supabase côté navigateur.

---

## 9. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `'next' n'est pas reconnu` | `node_modules` incomplet | `npm install` dans `devi-dashboard` |
| Page vide ou 404 sur `/` | mauvais dossier de travail | lancer depuis `devi-dashboard`, la racine redirige vers `/dashboard` |
| `Impossible de charger les indicateurs` | variables absentes ou vues non créées | vérifier `.env.local`, puis `sql/02_views.sql` |
| `division by zero` dans `v_kpis` | tables vides | recharger `sql/03_seed_demo.sql` |
| `psql` ne se connecte pas | connexion directe en IPv6 | utiliser le pooler `aws-1-eu-west-1.pooler.supabase.com` |
| Les alertes ne bougent pas | moteur de règles non exécuté | `select * from run_rules();` dans le SQL Editor |

---

## 10. Limites connues

- `who_weight_for_age` est vide : les z-scores du seed viennent de médianes
  approchées, en attendant les tables LMS officielles.
- Les `messages.audio_url` suivent la convention `audio/<langue>/<modèle>_C<contact>.mp3`,
  alors que les fichiers livrés sont nommés `bienvenue.ogg`, `manque_3j.ogg`,
  `acte_naissance__<Prénom>.ogg`. Le futur journal des messages aura besoin d'une
  table de correspondance.
- Le journal des messages, les boutons d'avance rapide et l'affichage détaillé du
  score de risque restent à brancher sur l'interface.
