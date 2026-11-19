# ɖevi ƒe agbalẽ — données, moteur de règles et tableau de bord (Hack4Children 2026)

## Appliquer le schéma et les données

### Méthode recommandée : le script du projet

```powershell
cd devi-dashboard
npm run db:init
```

Cette commande applique, dans l'ordre :

1. `01_schema.sql` : tables, calendrier PEV, migrations douces
2. `02_views.sql` : vues du tableau de bord et vues de compatibilité
3. `04_rules.sql` : moteur de règles, déclencheurs, boutons de démo
4. `03_seed_demo.sql` : 300 enfants fictifs
5. `05_demo.sql` : enfant de démonstration (Kossi, Bè-Kpota, vaccins et pesées du scénario)
6. `scripts/load-reference.mjs` : référentiels de `donnees_sante/` et recalcul des z-scores

`npm run db:reference` recharge seulement les référentiels (calendrier et tables OMS)
sans toucher aux enfants.

### Méthode manuelle (SQL Editor)

Exécuter `01`, `02`, `04` puis `03` dans cet ordre. Le seed fait 1,6 Mo et près de
12 000 lignes : l'éditeur web le refuse, il faut passer par le script ou découper le
fichier.

## Référentiels validés par Gerson

| Fichier | Table | Vue de compatibilité |
|---|---|---|
| `donnees_sante/calendrier_pev.csv` | `vaccine_schedule` | `calendrier_vaccinal` |
| `donnees_sante/oms_poids_age_filles.csv` | `who_weight_for_age` | `oms_reference` |
| `donnees_sante/oms_poids_age_garcons.csv` | `who_weight_for_age` | `oms_reference` |
| `donnees_sante/oms_taille_age_*.csv` (4) | `who_height_for_age` | `oms_reference` |
| `donnees_sante/oms_imc_age_*.csv` (4) | `who_bmi_for_age` | `oms_reference` |
| `donnees_sante/calendrier_vitamineA_deparasitage.csv` | `vitamin_a_schedule` | table directe |

- 23 doses, 9 contacts, de la naissance à 15 mois.
- Codes officiels : `BCG`, `VPO`, `PENTA`, `PNEUMO`, `ROTA`, `VPI`, `VAP`, `RR`, `VAA`, `MENA`.
- Tables OMS : poids (61 mois), taille et IMC (0-24 et 24-60 mois), par sexe,
  avec `L`, `M`, `S` et les écarts-types `SD3neg` à `SD3`. La vue `oms_reference`
  réunit les trois indicateurs et indique la bande (`0-2`, `2-5`, `0-5`).
- Vitamine A (9 contacts) et déparasitage (8 contacts) : `vitamin_a_schedule`.
- Les vues `calendrier_vaccinal` et `oms_reference` exposent les noms et colonnes
  attendus par les notices de `donnees_sante/` (lecture seule).

## Corrections de l'issue (19 nov.)

- Centre **Sylvanus Olympio** ajouté (`health_centers`, id 7).
- Seed limité aux **10 prénoms du catalogue audio** (Kosi, Ama, Yao, Afi, Kodzo,
  Akosiwa, Komi, Sena, Abla, Mawuli).
- Tous les messages partent en **WhatsApp** (`MISSED_3` inclus).
- **RLS activée** sur toutes les tables (politiques par rôle à écrire avec Blaise).
- `messages.audio_url` reste **vide** : le backend résout l'audio dans le catalogue.
- Une **stagnation** met le statut à `a_surveiller` (et non `normal`).
- `run_rules` produit aussi **pesée**, **croissance**, **vitamine A** et
  **déparasitage**.
- 3 enfants de test et rapport : `npm run gerson:check` →
  `docs/verification_gerson_20nov.md`.

## Moteur de règles

- Production : `select * from run_rules();` (pg_cron toutes les heures, ou appel serveur). Idempotent.
- Un enfant inscrit (hors démo) reçoit son calendrier vaccinal automatiquement (déclencheur).
- Une pesée insérée reçoit son z-score poids (LMS) ; si la taille est saisie, le
  z-score taille et l'IMC (poids / taille²) avec son z-score. Les seuils −2 / −3
  s'appliquent aux trois indicateurs, l'IMC > +2 vaut « à surveiller ». Le statut
  retenu est le plus grave, avec `status_indicator` (`poids`, `taille`, `imc`).
  La tendance suit la règle de Gerson (un mois minimum, poids identique ou en
  baisse, ou une ligne de z).
- Boutons de démo (à appeler via `supabase.rpc`) :
  `demo_fast_forward(child_id, 'J-2' | 'J-1' | 'J0' | 'MISSED_3' | 'MISSED_7')`
  `demo_reset_child(child_id)` remet l'enfant à zéro entre deux répétitions.
- Actions d'alerte : `ack_alert(alert_id)` (open → acknowledged),
  `resolve_alert(alert_id)` (→ resolved, avec `resolved_at`).
- Ces fonctions sont `security definer` et exécutables par `anon` et
  `authenticated` pour le prototype. En production, les restreindre et déplacer
  `run_rules` côté serveur.

## Tableau de bord

- `lib/dashboard.ts` lit les vues `v_*` ; `app/dashboard/page.tsx` compose l'écran.
- `v_message_log` alimente l'écran `/journal` (vue de démonstration, prénoms fictifs).
- Variables : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Le rôle pilotage ne lit que les vues agrégées (voir les `grant` en bas de `02_views.sql`).

## Audio

Les audios sont dans `voix/audio/messages/` (99 `.ogg` et 99 `.wav`), décrits par
`index_messages.json`. La correspondance entre `template_code` et `id` du catalogue
est dans `voix/README_voix.md`. La convention `.mp3` de la première version est
abandonnée : le chemin réel vient du champ `ogg` du catalogue.

## À valider ou compléter

- Vérification des calculs par Gerson sur 3 enfants de test (20 nov.), avec poids
  **et taille** pour couvrir les trois indicateurs.
- Rappels vitamine A et déparasitage : calendrier chargé, messages à brancher.
- Régénérer le seed juste avant les captures et la démo :
  `python seed/generate_seed.py` puis `npm run db:init`.
