# Données santé — qui prend quoi

Ce dossier contient les données médicales du prototype, fournies et validées par **Gerson** (référent médical).
Ne jamais modifier une valeur sans son accord (via Jérôme).

Notices détaillées : **`README_Cherif.md`** (base de données, règles, tableau de bord) et **`README_Blaise.md`** (écrans de l'application).

## Ce qu'il y a dans `donnees_sante/`

| Fichier | Contenu | Qui le prend |
|---|---|---|
| `calendrier_pev.csv` | Calendrier vaccinal du Togo : 23 doses en 9 contacts (naissance → 15 mois), validé | **Cherif** et **Blaise** |
| `oms_poids_age_filles.csv`, `oms_poids_age_garcons.csv` | Tables OMS poids pour l'âge, 0 à 60 mois (61 lignes, colonnes `Month, L, M, S, SD3neg … SD3`) | **Cherif** et **Blaise** |
| `regles_croissance.md` | Rythme des mesures, seuils « à surveiller » / « à orienter », stagnation, qui alerter | **Cherif** et **Blaise** (à lire en entier) |
| `README_Cherif.md`, `README_Blaise.md` | Notice de chacun | chacun la sienne |
| `calendrier_pev_source.pdf`, `courbes de croissance.pdf` | Documents sources de Gerson | personne (référence seulement) |
| `reponses_Gerson_18nov.docx`, `A_FOURNIR_Gerson.*` | Échanges avec Gerson | **Jérôme** (`A_FOURNIR_Gerson.*` n'est pas dans git) |

## Qui prend quoi

| | Cherif (base de données, règles, tableau de bord) | Blaise (application) |
|---|---|---|
| **Calendrier vaccinal** | Le charger dans la base (sa table `vaccine_schedule`) ; calculer les dates de rendez-vous de chaque enfant ; déclencher `rappel_j2`, `rappel_veille`, `rappel_jour_j`, `manque_3j`, puis l'alerte agent à J+7 | Afficher le carnet (fait / à venir / en retard) ; au scan, proposer les doses dues et non faites |
| **Tables OMS poids** | Les charger dans la base (sa table `who_weight_for_age`, une ligne par sexe et par mois) ; calculer le z-score à chaque pesée | Tracer la courbe : lignes −3, −2, médiane, +2, +3 et les points de l'enfant reliés |
| **Règles de croissance** | Produire « à surveiller » (z < −2), « à orienter » (z < −3) et la stagnation (au moins 1 mois entre deux mesures, ou chute d'une ligne entière de z) ; envoyer `croissance` et `pesee` | Saisir poids et taille (couché avant 2 ans, debout après) ; afficher le résultat ; afficher « mesure à faire » (chaque mois avant 2 ans, tous les 3 mois après) |
| **Où** | `donnees_sante/` | `donnees_sante/` (copié dans l'application par `scripts/sync-voix.mjs`) |

## Règles communes aux deux

- **Une seule source pour les calculs** : les dates, z-scores et alertes de référence sont ceux de la base (Cherif). Si l'application calcule aussi de son côté pour l'affichage, les résultats doivent être **identiques** à ceux de la base.
- **Mêmes règles de croissance partout**, exactement celles de `regles_croissance.md` (1 mois minimum, une ligne entière de z, seuils −2 et −3).
- **Inscription d'un enfant déjà né depuis un moment** : permettre de saisir les vaccins déjà faits (avec leur date, d'après le carnet papier). Sinon l'enfant apparaît « en retard » dès son inscription et déclenche des relances par erreur.
- **Jamais de diagnostic** dans l'application : seulement « normal », « à surveiller » ou « à orienter ».
- **Uniquement des enfants fictifs.**

## À venir (Gerson)

- 8 tables OMS taille pour l'âge et IMC pour l'âge (0-2 ans et 2-5 ans, filles et garçons), même format que les tables de poids :
  `oms_taille_age_0_2ans_filles.csv`, `oms_taille_age_2_5ans_filles.csv`, `oms_imc_age_0_2ans_filles.csv`, `oms_imc_age_2_5ans_filles.csv` (idem `_garcons`).
- Calendrier vitamine A et déparasitage.
- 2 confirmations : seuils −2 / −3 pour la taille et l'IMC ; alerte surpoids (z > +2) ou non.
- **20 nov.** : vérification des calculs sur 3 enfants de test (Cherif prépare les 3 enfants et envoie à Gerson les dates, z-scores et alertes affichés).

Contact données santé : **Gerson** (via Jérôme).
