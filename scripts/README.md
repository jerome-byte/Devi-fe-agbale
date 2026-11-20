# Scripts de la base (Supabase)

Écrits par Cherif. Ils appliquent les fichiers de `sql/`, chargent les référentiels de
`donnees_sante/` et produisent le rapport de vérification médicale.

```powershell
cd scripts
npm install
npm run db:init        # 01 schéma, 02 vues, 04 règles, 03 seed, 05 démo, puis référentiels
npm run db:sql -- ../sql/06_securite_roles.sql ../sql/07_comptes_structures.sql
npm run db:reference   # calendrier PEV, tables OMS, vitamine A / déparasitage
npm run gerson:check   # 3 enfants de test et docs/verification_gerson_20nov.md
```

Après `db:init`, rejouer toujours `06_securite_roles.sql` puis `07_comptes_structures.sql` :
les scripts `02` et `04` redonnent des droits à la clé publique, que `06` retire.

Connexion (fichiers ignorés par git, à créer dans ce dossier) :

- `.env.local` : `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_POOLER_HOST` ;
- le mot de passe de la base dans `SUPABASE_DB_PASSWORD` ;
- ou toute la chaîne de connexion dans `SUPABASE_DB_URL`.
