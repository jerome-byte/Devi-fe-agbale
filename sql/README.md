# ɖevi ƒe agbalẽ — données, moteur de règles et tableau de bord (Hack4Children 2026)

## Ordre d'exécution (Supabase, SQL Editor)
1. `sql/01_schema.sql`   tables
2. `sql/02_views.sql`    vues du tableau de bord
3. `sql/04_rules.sql`    moteur de règles, déclencheurs, boutons d'avance rapide
4. `sql/03_seed_demo.sql` ~300 enfants fictifs (ou `seed/csv/*.csv` si le fichier est trop long :
   zones → health_centers → daycares → vaccine_schedule → children → guardians →
   appointments → weigh_ins → messages → alerts)

Régénérer le seed (dates relatives à aujourd'hui, rejouable) :
`python seed/generate_seed.py --csv`   (options : `--n 300 --seed 4 --as-of AAAA-MM-JJ`)

## Moteur de règles
- Production : `select * from run_rules();` (pg_cron toutes les heures, ou appel serveur). Idempotent.
- Un enfant inscrit (hors démo) reçoit son calendrier vaccinal automatiquement (déclencheur).
- Une pesée insérée reçoit son z-score (si `who_weight_for_age` est chargée) et sa tendance.
- Boutons de démo (à appeler via `supabase.rpc`) :
  `demo_fast_forward(child_id, 'J-2' | 'J-1' | 'J0' | 'MISSED_3' | 'MISSED_7')`
  `demo_reset_child(child_id)`  → remet l'enfant à zéro entre deux répétitions.

## Dashboard (Next.js + Tailwind)
- `app/dashboard.ts` → `lib/dashboard.ts`  ·  `app/page.tsx` → `app/dashboard/page.tsx`
- Variables : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Le rôle « pilotage » ne lit que les vues `v_*` (voir le commentaire `grant` en bas de 02_views.sql).

## Calendrier vaccinal
- Calendrier officiel du PEV Togo (23 doses, 9 contacts) dans `01_schema.sql` (table `vaccine_schedule`).
- Un seul message et une seule alerte par enfant et par contact (pas un par vaccin).
- Convention audio : `audio/<langue>/<modèle>_C<contact>.mp3`, ex. `audio/ewe/J-2_C2.mp3`, `MISSED_3_C2.mp3`, `WELCOME.mp3`, `BIRTH_CERT.mp3`.
- Pour le prototype du 22 nov, le parcours de Kossi n'utilise que : `WELCOME`, `J-2_C2`, `MISSED_3_C2`, `BIRTH_CERT`.

## À remplacer / valider
- Gerson relit `vaccine_schedule` (âges en jours : mois x 30,4375).
- Tables OMS LMS (`who_weight_for_age`) : Gerson.
- Régénérer le seed juste avant les captures et la démo.
