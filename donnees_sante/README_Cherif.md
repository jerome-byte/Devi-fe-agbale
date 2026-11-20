# Données santé — notice pour Cherif

Tout ce qu'il faut pour le **moteur de règles** (rappels vaccins, pesées, alertes croissance) et le **tableau de bord**.
Les données ont été fournies et validées par **Gerson** (référent médical). Ne pas modifier les valeurs sans lui.

## Les fichiers à prendre dans `donnees_sante/`

| Fichier | Contenu | Usage |
|---|---|---|
| `calendrier_pev.csv` | Calendrier vaccinal du Togo : 23 doses, 9 contacts (naissance → 15 mois), **validé** | Table `calendrier_vaccinal` : dates de rendez-vous et rappels |
| `oms_poids_age_filles.csv`, `oms_poids_age_garcons.csv` | Tables OMS poids pour l'âge, 0 à 60 mois (61 lignes) | Table `oms_reference` : z-score poids/âge |
| `regles_croissance.md` | Indicateurs, rythme des mesures, seuils, stagnation, qui alerter | Règles du moteur (à lire en entier) |

**Reçu le 19 nov.** : 8 tables OMS taille/âge et IMC/âge, même format que les tables de poids : `oms_taille_age_0_2ans_filles.csv`, `oms_taille_age_2_5ans_filles.csv` (idem `_garcons`), `oms_imc_age_0_2ans_filles.csv`, `oms_imc_age_2_5ans_filles.csv` (idem `_garcons`) ; `calendrier_vitamineA_deparasitage.csv` ; confirmations de Gerson (seuils −2 / −3 pour les trois indicateurs, alerte IMC > +2) dans `regles_croissance.md`.

Ne pas utiliser le dossier `sources/` (documents d'origine de Gerson et échanges) : tout ce qu'il contient est déjà converti dans les CSV ci-dessus.

## 1. Charger les données dans Supabase

Tables (SQL Editor) :

```sql
create table calendrier_vaccinal (
  id serial primary key,
  contact int, age_libelle text, age_valeur int, age_unite text,   -- 'jours' | 'semaines' | 'mois'
  vaccin_code text, vaccin_nom text, dose text, maladies text, source text, statut text
);

create table oms_reference (
  indicateur text,      -- 'poids_age' (puis 'taille_age', 'imc_age')
  sexe text,            -- 'F' | 'M'
  mois int,             -- colonne Month
  l numeric, m numeric, s numeric,
  sd3neg numeric, sd2neg numeric, sd1neg numeric, sd0 numeric, sd1 numeric, sd2 numeric, sd3 numeric,
  primary key (indicateur, sexe, mois)
);
```

- `calendrier_pev.csv` : *Table Editor → calendrier_vaccinal → Insert → Import data from CSV* (les en-têtes correspondent aux colonnes).
- Tables OMS : importer chaque CSV dans une table temporaire, ou ajouter les colonnes `indicateur` et `sexe` avant l'import (`poids_age` / `F` pour le fichier filles, `poids_age` / `M` pour garçons). Colonnes du CSV : `Month, L, M, S, SD3neg, SD2neg, SD1neg, SD0, SD1, SD2, SD3`.

## 2. Calendrier : dates de rendez-vous et rappels

Pour chaque enfant et chaque ligne du calendrier : **date prévue = date de naissance + `age_valeur` `age_unite`**
(`jours` → + n jours ; `semaines` → + 7n jours ; `mois` → + n mois calendaires).

```js
function datePrevue(naissance, valeur, unite) {
  const d = new Date(naissance);
  if (unite === "mois") d.setMonth(d.getMonth() + valeur);
  else d.setDate(d.getDate() + valeur * (unite === "semaines" ? 7 : 1));
  return d;
}
```

Une dose est **faite** quand l'agent l'a confirmée au scan ; sinon elle est **due**. Règles d'envoi (voir `voix/README_voix.md` pour les audios) :

| Situation | Message |
|---|---|
| date prévue − 2 jours | `rappel_j2` |
| veille | `rappel_veille` |
| jour J | `rappel_jour_j` |
| dose non faite à J+3 | `manque_3j` (+ boutons 1 / 2) |
| dose non faite à J+7 | alerte à l'agent de santé (liste priorisée) |

Pour le scan au centre de santé : le **vaccin prérempli** = les doses dues (date prévue ≤ aujourd'hui) et non faites, triées par date prévue.

## 3. Croissance : z-scores et alertes

Âge en **mois révolus** (0 à 60) → ligne de la table pour le bon `indicateur` et le bon `sexe`. Formule OMS :

```js
function zscore(mesure, L, M, S) {
  return (Math.pow(mesure / M, L) - 1) / (L * S);
}
// IMC = poids (kg) / (taille (m))²  — taille saisie en cm → /100
```

Taille et IMC : table **0-2 ans** avant 24 mois, table **2-5 ans** à partir de 24 mois.

Règles (`regles_croissance.md`) :

| Résultat | Condition | Action |
|---|---|---|
| À surveiller | z < −2 | message `croissance` à la famille + alerte agent |
| À orienter | z < −3 | alerte **prioritaire** agent |
| Stagnation | poids identique ou en baisse entre 2 mesures espacées d'au moins 1 mois, ou chute d'au moins une ligne de z-score | message `croissance` + alerte agent |

Rythme des mesures (message `pesee`) : **1 fois par mois de 0 à 2 ans**, **1 fois tous les 3 mois de 2 à 5 ans**.
Jamais de diagnostic dans l'application : seulement « à surveiller » / « à orienter ».

## 4. Tableau de bord

Indicateurs à calculer à partir de ces données : couverture par vaccin et par dose, abandon entre Penta 1 et Penta 3, doses en retard par centre, part des enfants « à surveiller » / « à orienter », mesures à jour.

## 5. Vérification avec Gerson (20 nov.)

Préparer **3 enfants de test** (date de naissance, sexe, 2 ou 3 mesures de poids et taille) et envoyer à Gerson ce que l'application affiche : prochaines dates de vaccin, z-scores, alertes. Il répond « juste » ou l'erreur trouvée.

Contact données santé : **Gerson** (via Jérôme).
