# Règles de croissance — ɖevi ƒe agbalẽ

Validées par **Gerson Akagbe** (référent médical) le 18 novembre 2026, complétées le 19 novembre.
Référence : normes de croissance de l'OMS (2006) ; support de Gerson `courbes de croissance.pdf`.

## Indicateurs suivis

| Indicateur | Mesures nécessaires | Tables OMS (z-scores) |
|---|---|---|
| **Poids pour l'âge** | poids | `oms_poids_age_filles.csv`, `oms_poids_age_garcons.csv` (0-5 ans) — **disponibles** |
| **Taille pour l'âge** | taille (couché avant 2 ans, debout après) | `oms_taille_age_0_2ans_filles.csv`, `oms_taille_age_2_5ans_filles.csv` (idem `_garcons`) — **disponibles** |
| **IMC pour l'âge** | poids et taille (IMC = poids en kg / taille en m²) | `oms_imc_age_0_2ans_filles.csv`, `oms_imc_age_2_5ans_filles.csv` (idem `_garcons`) — **disponibles** |

Calcul du z-score (méthode OMS, colonnes `L`, `M`, `S` de la ligne correspondant à l'âge en mois) :
**z = ((mesure / M)^L − 1) / (L × S)**

## Rythme des mesures (poids et taille)

- **De 0 à 2 ans : une fois par mois.**
- **De 2 à 5 ans : une fois tous les trois mois.**

La pesée/mesure suivante est due à cette échéance : c'est elle qui déclenche le message `pesee`.

## Seuils d'alerte

| Résultat | Règle | Qui est alerté |
|---|---|---|
| **À surveiller** | z-score < −2 | Message `croissance` à la famille + alerte à l'agent de santé |
| **À orienter** | z-score < −3 | Alerte prioritaire à l'agent de santé |
| **Stagnation** | Poids identique ou en baisse entre deux mesures espacées d'au moins un mois, **ou** chute d'au moins une ligne de z-score | Message `croissance` à la famille + alerte à l'agent de santé |

- Écart minimum entre deux mesures pour juger une stagnation : **1 mois**.
- L'application n'affiche **jamais de diagnostic** : seulement « à surveiller » ou « à orienter ».

## Confirmé par Gerson le 19 novembre

1. Les seuils −2 (« à surveiller ») et −3 (« à orienter ») s'appliquent aux **trois indicateurs** : poids pour l'âge, taille pour l'âge et IMC pour l'âge.
2. Pour l'**IMC pour l'âge**, alerter aussi au-dessus de **+2** (surpoids) : résultat « à surveiller », alerte à l'agent de santé.

Taille et IMC : table **0-2 ans** avant 24 mois (taille mesurée couché), table **2-5 ans** à partir de 24 mois (debout).
Le résultat affiché pour l'enfant est le **plus grave** des trois indicateurs.
