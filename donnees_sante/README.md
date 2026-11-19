# Données santé — qui prend quoi

Ce dossier contient les données médicales du prototype, fournies et validées par **Gerson** (référent médical).
Ne jamais modifier une valeur sans son accord (via Jérôme).

Notices détaillées : **`README_Cherif.md`** (base de données, règles, tableau de bord) et **`README_Blaise.md`** (écrans de l'application).

## Ce qu'il y a dans `donnees_sante/`

| Fichier | Contenu | Qui le prend |
|---|---|---|
| `calendrier_pev.csv` | Calendrier vaccinal du Togo : 23 doses en 9 contacts (naissance → 15 mois), validé | **Cherif** et **Blaise** |
| `oms_poids_age_filles.csv`, `oms_poids_age_garcons.csv` | Tables OMS poids pour l'âge, 0 à 60 mois (61 lignes, colonnes `Month, L, M, S, SD3neg … SD3`) | **Cherif** et **Blaise** |
| `oms_taille_age_0_2ans_filles.csv`, `oms_taille_age_2_5ans_filles.csv` (idem `_garcons`) | Tables OMS taille pour l'âge (0-2 ans couché, 2-5 ans debout), même format que le poids | **Cherif** et **Blaise** |
| `oms_imc_age_0_2ans_filles.csv`, `oms_imc_age_2_5ans_filles.csv` (idem `_garcons`) | Tables OMS IMC pour l'âge, même format | **Cherif** et **Blaise** |
| `calendrier_vitamineA_deparasitage.csv` | Prises de vitamine A (6 à 54 mois) et de déparasitage (12 à 54 mois), avec la dose | **Cherif** |
| `regles_croissance.md` | Rythme des mesures, seuils « à surveiller » / « à orienter », surpoids, stagnation, qui alerter | **Cherif** et **Blaise** (à lire en entier) |
| `README_Cherif.md`, `README_Blaise.md` | Notice de chacun | chacun la sienne |
| `calendrier_pev_source.pdf`, `courbes de croissance.pdf`, les `.xlsx` OMS (`wfa_*`, `table_*`, `IMC_*`) | Documents sources de Gerson (les `.xlsx` ont été convertis en CSV ci-dessus) | personne (référence seulement) |
| `reponses_Gerson_18nov.docx`, `A_FOURNIR.docx`, `A_FOURNIR_Gerson.md` | Échanges avec Gerson | **Jérôme** |

## Qui prend quoi

| | Cherif (base de données, règles, tableau de bord) | Blaise (application) |
|---|---|---|
| **Calendrier vaccinal** | Le charger dans la base (sa table `vaccine_schedule`) ; calculer les dates de rendez-vous de chaque enfant ; décider quand partent `rappel_j2`, `rappel_veille`, `rappel_jour_j`, `manque_3j` (ligne dans la table `messages`, envoyée sur WhatsApp par le backend de Blaise), puis l'alerte agent à J+7 | Afficher le carnet (fait / à venir / en retard) ; au scan, proposer les doses dues et non faites |
| **Tables OMS (poids, taille, IMC)** | Les charger dans la base (une ligne par indicateur, sexe et mois ; pour le poids, sa table `who_weight_for_age`) ; calculer les 3 z-scores à chaque mesure | Tracer les courbes : lignes −3, −2, médiane, +2, +3 et les points de l'enfant reliés (poids, puis taille et IMC) |
| **Vitamine A et déparasitage** | Calculer les dates de prise de chaque enfant et décider quand part un rappel | Afficher les prises (faites / à venir) dans le carnet |
| **Règles de croissance** | Produire « à surveiller » (z < −2, ou IMC > +2), « à orienter » (z < −3), pour poids, taille et IMC, et la stagnation (au moins 1 mois entre deux mesures, ou chute d'une ligne entière de z) ; décider quand partent `croissance` et `pesee` (même circuit) | Saisir poids et taille (couché avant 2 ans, debout après) ; afficher le résultat ; afficher « mesure à faire » (chaque mois avant 2 ans, tous les 3 mois après) |
| **Où** | `donnees_sante/` | `donnees_sante/` (copié dans l'application par `scripts/sync-voix.mjs`) |

## Règles communes aux deux

- **Une seule source pour les calculs** : les dates, z-scores et alertes de référence sont ceux de la base (Cherif). Si l'application calcule aussi de son côté pour l'affichage, les résultats doivent être **identiques** à ceux de la base.
- **Mêmes règles de croissance partout**, exactement celles de `regles_croissance.md` (1 mois minimum, une ligne entière de z, seuils −2 et −3).
- **Inscription d'un enfant déjà né depuis un moment** : permettre de saisir les vaccins déjà faits (avec leur date, d'après le carnet papier). Sinon l'enfant apparaît « en retard » dès son inscription et déclenche des relances par erreur.
- **Jamais de diagnostic** dans l'application : seulement « normal », « à surveiller » ou « à orienter ».
- **Envoi WhatsApp** : la base (Cherif) décide quel message part et quand ; le backend (Blaise) l'envoie et enregistre la réponse. Détail dans `voix/README_voix.md`, partie « Circuit d'un message ».
- **Uniquement des enfants fictifs.**

## Vitamine A et déparasitage (Gerson, 19 nov.)

| | Vitamine A | Déparasitage |
|---|---|---|
| Première prise | 6 mois | 12 mois |
| Intervalle | 4 à 6 mois (**6 mois retenu** pour les rappels, à confirmer par Gerson) | 6 mois |
| Dernière prise | 59 mois | 59 mois |
| Dose | 100 000 UI de 6 à 11 mois ; 200 000 UI de 12 à 59 mois | Albendazole 200 mg de 12 à 23 mois ; 400 mg de 24 à 59 mois |
| Où | centre de santé, campagne | centre de santé, campagne |

Les dates sont dans `calendrier_vitamineA_deparasitage.csv` (âge en mois révolus, comme les tables OMS).
Audio : `annonce_vitamine_a` existe déjà ; le message de rappel individuel et celui du déparasitage sont à générer (Jérôme).

## À venir

- **20 nov.** : vérification des calculs sur 3 enfants de test (Cherif prépare les 3 enfants et envoie à Gerson les dates, z-scores et alertes affichés).

Contact données santé : **Gerson** (via Jérôme).
