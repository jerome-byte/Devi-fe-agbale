# Intégration dans la plateforme — guide développeur

Ce document explique comment brancher la plateforme (pages déjà prêtes) sur la
base Supabase, le moteur de règles et les audios du projet **ɖevi ƒe agbalẽ**
(Hack4Children 2026, UNICEF Togo). Il décrit ce qui existe, ce qu'il faut appeler,
et dans quel ordre.

À lire avec :

- `devi-dashboard/README.md` : l'application de pilotage (écrans, design, scripts).
- `sql/README.md` : l'ordre d'application du SQL et les référentiels.
- `voix/README_voix.md` : le catalogue audio et le circuit WhatsApp.
- `donnees_sante/README_Cherif.md` : les règles médicales et les calculs.

---

## 1. Architecture

```
┌─────────────────────┐        ┌──────────────────────┐
│ Plateforme (agent,  │        │ Dashboard (pilotage, │
│ éducatrice)         │        │ journal, alertes)    │
│ pages déjà prêtes   │        │ devi-dashboard/      │
└─────────┬───────────┘        └──────────┬───────────┘
          │  supabase-js (clé publishable)│
          ▼                               ▼
┌──────────────────────────────────────────────────────┐
│ Supabase : Postgres + vues + fonctions RPC           │
│  tables (RLS) · vues agrégées · run_rules · alertes  │
└─────────┬────────────────────────────────────────────┘
          │ service role (serveur uniquement)
          ▼
┌──────────────────────────────────────────────────────┐
│ Backend WhatsApp (route serveur / worker)            │
│  lit messages à envoyer, envoie l'audio, webhook 1/2 │
└──────────────────────────────────────────────────────┘
```

Règles de base :

- **Le navigateur ne parle jamais à une table brute.** Il lit des vues et appelle
  des fonctions RPC. Les écritures passent par des RPC ou par le serveur.
- La clé **publishable** peut être exposée. La clé **service role** et le mot de
  passe Postgres restent côté serveur.
- Les données sont **fictives** pour le prototype.

---

## 2. Environnement

| Variable | Où | Usage |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | client et serveur |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API Keys → publishable | client |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API Keys → secret | serveur uniquement |
| `SUPABASE_DB_PASSWORD` | Project Settings → Database | scripts SQL |
| `SUPABASE_POOLER_HOST` | Supabase → Connect → Session pooler | scripts SQL |

Projet actuel : `https://wcbzjukgelmztvluxrsn.supabase.co`, pooler
`aws-1-eu-central-2.pooler.supabase.com`.

La connexion directe `db.<ref>.supabase.co` est en IPv6 seul : utiliser le pooler
pour tout script SQL.

---

## 3. Modèle de données

Toutes les tables sont dans le schéma `public`.

### Référentiels

| Table | Colonnes utiles |
|---|---|
| `vaccine_schedule` | `id`, `vaccine_code`, `dose`, `label_fr`, `age_days`, `contact_no`, `contact_label`, `short_name`, `dose_label`, `diseases`, `source`, `status` |
| `who_weight_for_age` | `sex` (`F`/`M`), `age_months` (0-60), `l`, `m`, `s`, `sd3neg`…`sd3` |
| `who_height_for_age` | idem + `band` (`0-2` ou `2-5`) |
| `who_bmi_for_age` | idem + `band` |
| `vitamin_a_schedule` | `produit` (`vitamine_a`/`deparasitage`), `age_mois`, `dose`, `lieu` |
| `zones`, `health_centers`, `daycares` | découpage géographique |

### Acteurs et suivi

| Table | Colonnes utiles |
|---|---|
| `profiles` | `id` (= `auth.users.id`), `full_name`, `role` (`agent`, `educatrice`, `pilotage`, `admin`), `center_id`, `daycare_id` |
| `children` | `id`, `qr_token`, `first_name`, `birth_date`, `sex`, `center_id`, `daycare_id`, `zone_id`, `has_birth_certificate`, `birth_cert_resolved_at`, `distance_km`, `is_demo`, `created_by` |
| `guardians` | `id`, `child_id`, `name`, `phone`, `language` (`ewe`, `mina`, `kabiye`, `fr`), `channel_pref` (`whatsapp`/`voice`), `is_primary` |
| `appointments` | `id`, `child_id`, `schedule_id`, `due_date`, `status` (`planned`/`done`/`missed`), `done_at` |
| `weigh_ins` | `id`, `child_id`, `measured_at`, `weight_kg`, `height_cm`, `age_months`, `z_score`, `height_z`, `bmi`, `bmi_z`, `trend`, `status`, `status_indicator` |
| `messages` | `id`, `child_id`, `guardian_id`, `appointment_id`, `template_code`, `channel`, `language`, `scheduled_for`, `sent_at`, `status`, `audio_url`, `response_key`, `responded_at`, `is_simulated` |
| `alerts` | `id`, `child_id`, `appointment_id`, `type`, `target_role`, `center_id`, `status`, `created_at`, `resolved_at` |

### Contraintes à connaître

- `children.qr_token` est unique et généré automatiquement (`encode(gen_random_bytes(9),'hex')`).
- Un enfant ne peut avoir qu'un rendez-vous par vaccin/dose : `unique (child_id, schedule_id)`.
- Un message est unique par rendez-vous, modèle et canal.
- Une seule alerte ouverte par enfant, type et rendez-vous.
- `is_demo` distingue les 300 enfants fictifs.

### RLS et droits

- Le SQL active RLS sur **toutes les tables** (`alter table … enable row level
  security` dans `01_schema.sql`), **sans politique** : la clé publishable ne lit
  pas les tables brutes.
- Les **vues** sont accordées à `anon` et `authenticated` (elles contournent RLS
  car elles appartiennent au propriétaire).
- Les fonctions du moteur sont `security definer` et exécutables par `anon` et
  `authenticated` (démo).
- **Conséquence pour la plateforme** : une écriture directe dans `children`,
  `weigh_ins`, `appointments` ou `alerts` avec la clé publishable sera refusée.
  Deux options :
  1. **Recommandé** : authentification Supabase + politiques RLS par rôle
     (`profiles.role`), puis écritures avec la session de l'agent.
  2. **Rapide** : écritures côté serveur (route handler ou server action) avec la
     clé service role, après vérification du rôle.

---

## 4. Vues disponibles

### Pour le pilotage

| Vue | Contenu |
|---|---|
| `v_kpis` | 8 indicateurs en une ligne |
| `v_zone_summary` | couverture et niveau par zone |
| `v_penta_dropout` | abandon Penta 1→3 |
| `v_birth_cert` | actes de naissance manquants |
| `v_message_engagement` | messages envoyés / écoutés |
| `v_growth_by_zone` | stagnation, insuffisance pondérale, `a_surveiller`, `a_orienter` |
| `v_coverage_trend` | couverture mensuelle sur 12 mois |
| `v_alerts_summary` | alertes par zone et type |
| `v_demo_banner` | nombre d'enfants fictifs |

### Pour les écrans de la plateforme

| Vue | Contenu |
|---|---|
| `calendrier_vaccinal` | `contact`, `age_libelle`, `age_valeur`, `age_unite`, `vaccin_code`, `vaccin_nom`, `dose`, `maladies`, `source`, `statut` |
| `oms_reference` | `indicateur` (`poids_age`, `taille_age`, `imc_age`), `sexe`, `mois`, `l`, `m`, `s`, `sd3neg`…`sd3`, `bande` |
| `v_message_log` | journal : `id`, `child_id`, `first_name`, `center_id`, `center_name`, `zone`, `template_code`, `channel`, `status`, `language`, `scheduled_for`, `sent_at`, `response_key`, `is_simulated` |
| `v_alerts_list` | alertes individuelles : `id`, `child_id`, `first_name`, `zone_id`, `zone`, `center_id`, `center_name`, `type`, `status`, `target_role`, `created_at`, `resolved_at` |
| `v_demo_child` | enfant de démo : `id`, `first_name`, `birth_date`, `center_id`, `center_name`, `zone` |
| `v_health_centers` | liste des centres : `id`, `name`, `zone_id`, `zone` (inscription) |
| `v_zones` | liste des zones : `id`, `name`, `commune`, `prefecture` |
| `v_daycares` | liste des garderies : `id`, `name`, `zone_id`, `center_id` |

Exemple :

```ts
const { data } = await supabase
  .from("calendrier_vaccinal")
  .select("*")
  .order("contact");
```

---

## 5. Fonctions RPC

Toutes s'appellent avec `supabase.rpc(...)`.

### `run_rules`

```ts
const { data, error } = await supabase.rpc("run_rules");
// data: [{ rule: "rappel J-2", n: 1 }, ...]
```

Signature SQL :
`run_rules(p_as_of date default current_date, p_child_id uuid default null, p_simulated boolean default false, p_lookback_days int default 60)`
→ `table(rule text, n int)`.

- Idempotent : peut tourner à chaque heure.
- Crée les messages `J-2`, `J-1`, `J0`, `MISSED_3`, l'alerte `missed_7d`,
  `birth_cert_missing`, `growth_stagnation`, `growth_surveiller`, `growth_orient`.
- En production : appel serveur (cron) plutôt que navigateur.

### `demo_fast_forward`

```ts
const { data } = await supabase.rpc("demo_fast_forward", {
  p_child_id: childId,
  p_event: "J-2", // "J-2" | "J-1" | "J0" | "MISSED_3" | "MISSED_7"
});
```

Simule la date par rapport au prochain rendez-vous de l'enfant et exécute le
moteur pour lui. Retourne `table(simulated_date date, rule text, n int)`.

### `demo_reset_child`

```ts
await supabase.rpc("demo_reset_child", { p_child_id: childId });
```

Supprime les messages et alertes de l'enfant, remet les rendez-vous manqués à
`planned`. Les rendez-vous `done` sont conservés.

### `ack_alert` / `resolve_alert`

```ts
await supabase.rpc("ack_alert", { p_id: alertId });
await supabase.rpc("resolve_alert", { p_id: alertId });
```

`ack_alert` : `open` → `acknowledged`. `resolve_alert` : `open`/`acknowledged` →
`resolved` avec `resolved_at = now()`.

### Enfant de démonstration

```ts
const { data: child } = await supabase
  .from("v_demo_child")
  .select("*")
  .maybeSingle();
```

---

## 6. Codes et conventions

### Vaccins

`BCG`, `VPO`, `PENTA`, `PNEUMO`, `ROTA`, `VPI`, `VAP`, `RR`, `VAA`, `MENA`.
23 doses, 9 contacts, de la naissance à 15 mois. `dose` vaut `0` pour VPO 0, `1`
pour BCG / VAA / MENA (affiché « unique » dans le calendrier).

### Messages

| `template_code` | `id` du catalogue audio | Variables |
|---|---|---|
| `WELCOME` | `bienvenue` | aucune |
| `J-2` | `rappel_j2` | aucune |
| `J-1` | `rappel_veille` | prénom + centre |
| `J0` | `rappel_jour_j` | prénom + centre |
| `MISSED_3` | `manque_3j` | aucune (+ boutons 1 / 2) |
| `BIRTH_CERT` | `acte_naissance` | prénom |
| `PESEE` | `pesee` | prénom |
| `CROISSANCE` | `croissance` | prénom |
| `NUTRITION_1` | `nutrition_1` | aucune |
| `DEPISTAGE` | `depistage` | prénom |
| `ORIENTATION` | `orientation` | prénom |
| `VITAMINE_A` | `annonce_vitamine_a` | aucune |
| `DEPARASITAGE` | pas encore d'audio | aucune |

Statuts d'un message : `scheduled` → `sent` → `delivered` → `listened`, ou
`failed`. Canaux : `whatsapp` (prototype) et `voice` (finale). `response_key` :
1 = viendra, 2 = empêchement, 3 = autre.

### Alertes

`missed_7d`, `growth_stagnation`, `growth_surveiller`, `growth_orient`,
`birth_cert_missing`, `screening_due`, `referral`.
Statuts : `open`, `acknowledged`, `resolved`.

### Croissance

- z-score OMS : `z = ((mesure / M)^L − 1) / (L × S)`.
- `status` : `normal`, `a_surveiller` (z < −2 ou IMC > +2), `a_orienter` (z < −3).
- `status_indicator` : `poids`, `taille` ou `imc` (le plus grave des trois).
- `trend` : `ok`, `stagnation`, `chute` (poids identique ou en baisse après un
  mois, ou chute d'une ligne de z).
- Taille et IMC : table `0-2` avant 24 mois, `2-5` à partir de 24 mois.

---

## 7. Audio

- Source : `voix/audio/messages/*.ogg` (WhatsApp) et `*.wav` (lecture).
- Catalogue : `voix/audio/messages/index_messages.json`, avec pour chaque message
  la liste des variantes (`prenom`, `centre`, `ogg`, `wav`, `duree_s`).
- L'application copie les `.ogg` dans `public/audio/messages/` via
  `npm run audio:sync` (lancé aussi avant `dev` et `build`).
- Résolution côté application : `lib/audio-catalog.ts` normalise le prénom
  (`Kossi` → `Kosi`) et le centre (`Bè-Kpota` → `be_kpota`).
- **Ne pas reconstruire un nom de fichier à la main** : partir de l'`id` du
  catalogue et prendre le champ `ogg`.
- WhatsApp : téléverser le `.ogg` (endpoint médias) puis envoyer un message
  `audio` avec l'id du média. Pour `MISSED_3`, envoyer ensuite un message
  interactif avec les boutons « 1 » et « 2 ».
- `messages.audio_url` est vide : le backend résout le fichier depuis le
  catalogue (`template_code` + prénom + centre), pas depuis la base.
- Licence des voix : Meta MMS-TTS (`facebook/mms-tts-ewe`), CC BY-NC 4.0. La
  mention doit apparaître dans les crédits de la plateforme.

---

## 8. Parcours d'intégration, écran par écran

### 8.1 Inscription de l'enfant

Champs indispensables : `first_name`, `birth_date`, `sex`, `center_id`,
`zone_id`, `daycare_id` (optionnel), `has_birth_certificate`, un responsable
(`guardians`) avec `phone`, `language`, `channel_pref`.

Les listes de centres, zones et garderies se lisent depuis `v_health_centers`,
`v_zones` et `v_daycares` (les tables sont protégées par RLS).

À l'insertion :

1. `qr_token` est généré automatiquement.
2. Le déclencheur `children_generate_appointments` crée les 23 rendez-vous
   (sauf si `is_demo`).
3. Les dates sont calculées depuis `birth_date` et `vaccine_schedule.age_days`.

```ts
const { data: child } = await supabase
  .from("children")
  .insert({
    first_name,
    birth_date,
    sex,
    center_id,
    zone_id,
    daycare_id,
    has_birth_certificate: false,
  })
  .select("id, qr_token")
  .single();
```

> Avec RLS active et aucune politique, cette insertion doit passer par une route
> serveur (service role) ou par une politique `insert` pour le rôle `agent`.

### 8.2 Carnet de l'enfant

Lire `calendrier_vaccinal` (référence) et `appointments` (état réel) :

```ts
const [{ data: calendrier }, { data: rdv }] = await Promise.all([
  supabase.from("calendrier_vaccinal").select("*").order("contact"),
  supabase
    .from("appointments")
    .select("id, schedule_id, due_date, status, done_at")
    .eq("child_id", childId),
]);
```

Statut affiché : `done` → fait, `due_date` dépassée et `planned` → en retard,
sinon à venir.

### 8.3 Scan QR et vaccin prérempli

Le QR ne contient que `qr_token`. La recherche doit se faire côté serveur (le
token ne doit pas être exposé dans une vue publique) :

```ts
// route serveur
const { data } = await admin
  .from("children")
  .select("id, first_name, birth_date, sex, center_id, has_birth_certificate")
  .eq("qr_token", token)
  .maybeSingle();
```

Doses dues : rendez-vous `planned` avec `due_date <= today`, triés par date. À la
confirmation, passer `status = 'done'` et `done_at = today`.

### 8.4 Pesée et courbe

```ts
const { data } = await supabase
  .from("weigh_ins")
  .insert({
    child_id: childId,
    measured_at,
    weight_kg,
    height_cm, // recommandé : déclenche taille et IMC
  })
  .select("weight_kg, height_cm, z_score, height_z, bmi, bmi_z, trend, status, status_indicator")
  .single();
```

Le déclencheur calcule l'âge, les trois z-scores, le statut et la tendance.
Pour la courbe, lire `oms_reference` filtré sur le sexe et les mois 0-60, puis
tracer `sd3neg`, `sd2neg`, `sd0`, `sd2`, `sd3` et les points de l'enfant.

### 8.5 Journal des messages

`v_message_log` + résolution audio (section 7). Chaque ligne peut être écoutée
sans téléphone. Les réponses 1 / 2 s'affichent depuis `response_key`.

### 8.6 Alertes

`v_alerts_list` pour la liste, `ack_alert` / `resolve_alert` pour les actions.
Les alertes de croissance n'existent qu'après un `run_rules` ou une pesée.

### 8.7 Tableau de bord

Lire les vues `v_*` (section 4). Ne jamais interroger les tables brutes pour
l'agrégation : les vues portent les définitions (seuils, cohortes, dénominateurs).

### 8.8 Commandes de démonstration

`v_demo_child` + `run_rules`, `demo_fast_forward`, `demo_reset_child`. À réserver
au mode démo (voir section 11).

---

## 9. Circuit WhatsApp (backend)

1. **La base prépare.** `run_rules` insère dans `messages` des lignes
   `status = 'scheduled'` avec `template_code` et `scheduled_for`.
2. **Le backend envoie.** Toutes les minutes :
   - lire `messages` où `status = 'scheduled'` et `scheduled_for <= now()` ;
   - résoudre l'audio depuis le catalogue (`template_code` + prénom + centre) ;
   - téléverser l'audio ;
   - envoyer sur WhatsApp ;
   - passer `status = 'sent'`, `sent_at = now()`.
3. **Le backend reçoit les réponses.** Webhook boutons :
   - `1` → `response_key = 1`, envoyer `reponse_vient` ;
   - `2` → `response_key = 2`, envoyer `reponse_empechement` et créer une alerte
     `referral` ou `missed_7d` selon la règle produit ;
   - mettre `responded_at`.
4. **Accusés.** Mettre à jour `delivered` / `listened` / `failed` selon les
   événements WhatsApp.

Le backend utilise la clé service role. Aucune clé WhatsApp dans le navigateur.

---

## 10. Rôles et sécurité

- `profiles.role` : `agent`, `educatrice`, `pilotage`, `admin`.
- `profiles.id` = `auth.users.id`.
- Le rôle `pilotage` ne doit lire que les vues agrégées.
- Les fonctions de démo (`run_rules`, `demo_*`) sont ouvertes à `anon` pour le
  prototype. En production :
  - les restreindre à `authenticated` ou à un rôle `admin` ;
  - déplacer `run_rules` côté serveur (cron) ;
  - ajouter des politiques RLS par rôle pour les écritures agent.
- Le token QR ne doit jamais être exposé dans une vue publique : passer par une
  route serveur authentifiée.

---

## 11. Déploiement

1. **Supabase** : appliquer `sql/01_schema.sql`, `02_views.sql`, `04_rules.sql`,
   `03_seed_demo.sql`, `05_demo.sql`, puis `npm run db:reference`.
   En une commande : `cd devi-dashboard && npm run db:init`.
2. **Plateforme** : renseigner `NEXT_PUBLIC_SUPABASE_URL` et la clé publishable.
3. **Serveur** : ajouter `SUPABASE_SERVICE_ROLE_KEY` (jamais dans le client).
4. **WhatsApp** : variables du fournisseur côté serveur uniquement.
5. **Audio** : `npm run audio:sync` avant le build (déjà en `prebuild`).

---

## 12. Recette d'intégration

À vérifier dans cet ordre :

- [ ] `calendrier_vaccinal` renvoie 23 lignes, `statut = validé`.
- [ ] `oms_reference` renvoie 3 indicateurs × 2 sexes × 61 mois.
- [ ] Inscription d'un enfant : `qr_token` créé, 23 rendez-vous générés.
- [ ] Scan du QR : l'enfant est retrouvé, les doses dues sont proposées.
- [ ] Confirmation d'une dose : `appointments.status = done`.
- [ ] Pesée avec taille : `z_score`, `height_z`, `bmi`, `bmi_z`, `status` et
  `status_indicator` renseignés.
- [ ] `run_rules` crée un message `J-2` pour un rendez-vous à J+2.
- [ ] `demo_fast_forward(child, 'J-2')` renvoie `rappel J-2 : 1`.
- [ ] `demo_fast_forward(child, 'MISSED_3')` crée `MISSED_3` et une alerte.
- [ ] `v_message_log` affiche le message, l'audio se lit.
- [ ] `v_alerts_list` affiche l'alerte, `ack_alert` la passe en `acknowledged`,
  `resolve_alert` en `resolved`.
- [ ] Le dashboard reflète les changements au prochain rafraîchissement (30 s).

Enfant de démo : `v_demo_child` (Kossi, Bè-Kpota). Son prochain contact est à J+2,
contacts 1 à 3 déjà faits, deux pesées avec stagnation.

---

## 13. Points ouverts

- `messages.audio_url` reste vide : le backend doit résoudre l'audio depuis le
  catalogue.
- Le déparasitage n'a pas encore d'audio dédié dans le catalogue.
- Les rappels J-1 / J0 ne sont disponibles que pour Bè-Kpota et Sylvanus Olympio
  (les quatre autres centres n'ont pas de variante audio).
- Le seed principal ne contient pas de taille ; les 3 enfants de test et les
  mesures saisies dans l'application en ont.
- Les politiques RLS par rôle restent à écrire pour les écritures agent.
- Le token QR n'a pas encore de route serveur dédiée.
- Le score de risque (`v_child_risk`) n'est pas détaillé dans l'interface.
