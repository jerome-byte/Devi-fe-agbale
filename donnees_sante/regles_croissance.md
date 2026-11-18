# Règles de croissance — ɖevi ƒe agbalẽ

Validées par **Gerson Akagbe** (référent médical) le 18 novembre 2026.
Référence : normes de croissance de l'OMS (2006) ; support de Gerson `courbes de croissance.pdf`.

## Indicateurs suivis

| Indicateur | Mesures nécessaires | Tables OMS (z-scores) |
|---|---|---|
| **Poids pour l'âge** | poids | `oms_poids_age_filles.csv`, `oms_poids_age_garcons.csv` (0-5 ans) — **disponibles** |
| **Taille pour l'âge** | taille (couché avant 2 ans, debout après) | *Length-for-age* 0-2 ans et *Height-for-age* 2-5 ans, filles et garçons — **à télécharger** |
| **IMC pour l'âge** | poids et taille (IMC = poids en kg / taille en m²) | *BMI-for-age* 0-2 ans et 2-5 ans, filles et garçons — **à télécharger** |

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

## Points à confirmer par Gerson

1. Les seuils −2 / −3 s'appliquent-ils aussi à la **taille pour l'âge** (retard de croissance) et à l'**IMC pour l'âge** (maigreur) ?
2. Pour l'IMC, faut-il aussi alerter en cas de **surpoids** (z-score > +2) ?
