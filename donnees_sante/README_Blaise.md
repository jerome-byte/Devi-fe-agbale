# Données santé — notice pour Blaise

Ce qu'il faut pour les **écrans** de l'espace agent et de la garderie : carnet de l'enfant, scan, saisie des mesures, courbe de croissance.
Les calculs (dates, z-scores, alertes) sont faits par **Cherif** : tu affiches ses résultats et tu saisis les données. Voir aussi `README_Cherif.md`.

## Les fichiers utiles dans `donnees_sante/`

| Fichier | Pour quel écran |
|---|---|
| `calendrier_pev.csv` (table Supabase `calendrier_vaccinal`) | Carnet de l'enfant : liste des vaccins (faits, dus, en retard) ; scan : vaccin prérempli |
| `oms_poids_age_filles.csv`, `oms_poids_age_garcons.csv` (table `oms_reference`) | Courbe de croissance : lignes de référence OMS |
| `regles_croissance.md` | Ce qu'il faut saisir et à quel rythme ; libellés des alertes |

**Reçu le 19 nov.** : tables OMS taille/âge et IMC/âge (`oms_taille_age_*`, `oms_imc_age_*`, même format que le poids) et `calendrier_vitamineA_deparasitage.csv`. À ajouter dans `scripts/sync-voix.mjs` comme les tables de poids.

## 1. Inscription de l'enfant

Champs indispensables pour les calculs : **date de naissance**, **sexe** (F / M, choisit la table OMS), centre de santé, prénom.
Pour la démo, prénom et centre dans des **listes** (voir `voix/README_voix.md`).

## 2. Carnet de l'enfant : vaccins

Afficher les lignes de `calendrier_vaccinal` regroupées par `contact`, avec `age_libelle`, `vaccin_nom`, la date prévue (calculée par Cherif) et un statut :
**fait** (date de la dose) · **à venir** · **en retard** (date prévue dépassée et non fait).

## 3. Scan au centre de santé

Après le scan du QR : proposer **les doses dues et non faites** (prérempli), l'agent confirme d'un geste → enregistrer la dose (vaccin, dose, date, centre, agent).
Plusieurs vaccins le même jour sont normaux (ex. à 6 semaines : Penta 1, VPO 1, Pneumo 1, Rota 1).

## 4. Saisie des mesures

À chaque visite (`regles_croissance.md`) :
- **poids** (kg, 1 décimale) ;
- **taille** (cm, 1 décimale) — mesurée **couché avant 2 ans**, **debout après 2 ans** (le rappeler dans le formulaire) ;
- date de la mesure.

Rythme : 1 fois par mois de 0 à 2 ans, 1 fois tous les 3 mois de 2 à 5 ans. Afficher « mesure à faire » quand l'échéance est atteinte.

## 5. Courbe de croissance

Pour le sexe de l'enfant, tracer sur l'axe « âge en mois » (0 à 60) les lignes de référence de `oms_reference` :
`sd3neg`, `sd2neg`, `sd0` (médiane), `sd2`, `sd3` — en mettant en évidence la zone sous `sd2neg` (−2) et sous `sd3neg` (−3).
Puis placer **les points de l'enfant** (âge en mois, poids) **reliés entre eux**, comme sur la courbe papier de l'OMS.

Afficher à côté le résultat calculé par Cherif : **normal**, **à surveiller** ou **à orienter** — jamais un diagnostic.
Même principe ensuite pour la taille et l'IMC quand les tables arriveront.

## 6. Données

Uniquement des enfants **fictifs** (démo). L'agent de santé **et l'éducatrice** (pesée mensuelle en garderie) peuvent saisir poids et taille.

Contact données santé : **Gerson** (via Jérôme) · calculs : **Cherif**.
