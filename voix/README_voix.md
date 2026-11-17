# Voix en éwé — notice pour l'équipe (Blaise, Cherif)

Les **16 messages vocaux** du prototype sont prêts et validés à l'écoute par Jérôme : **99 audios** (10 prénoms × 2 centres).
Ce dossier contient tout ce qu'il faut pour les brancher dans l'application et sur WhatsApp.

## Ce qu'il y a dans `voix/`

| Fichier | À quoi il sert |
|---|---|
| `audio/messages/index_messages.json` | **Le fichier à lire par l'application** : chaque message, son déclencheur, ses textes et ses audios |
| `audio/messages/*.ogg` | Audios à envoyer sur **WhatsApp** (Opus, `audio/ogg; codecs=opus`) |
| `audio/messages/*.wav` | Mêmes audios pour le **journal des messages** (lecteur audio dans le carnet) |
| `catalogue_messages.xlsx` | Les textes source (français, éwé). Ne pas modifier sans Jérôme |
| `prononciation.json` | Réglages de la voix, prénoms et centres |
| `02_generation_audios.ipynb` | Régénère tous les audios si un texte change (Colab) |

## Comment trouver le bon audio

Chaque message a un `id` (ex. `rappel_j2`). Dans `index_messages.json`, `messages[].audios[]` donne les fichiers (chemins depuis la racine du projet).

1. **Message sans variable** (`variables` vide) : un seul audio, `prenom` et `centre` à `null`.
   Ex. `bienvenue`, `rappel_j2`, `manque_3j`, `reponse_vient`, `reponse_empechement`, les annonces, `nutrition_1`.
2. **Message avec `{prenom}`** : un audio par prénom. Convertir d'abord le prénom saisi avec `prenoms_disponibles`
   (ex. « Kossi » → `Kosi`), puis prendre l'audio dont `prenom` vaut cette clé. Fichier : `croissance__Kosi.ogg`.
3. **Message avec `{prenom}` et `{centre}`** (`rappel_veille`, `rappel_jour_j`) : même chose, plus le centre de l'enfant.
   Fichier : `rappel_veille__Kosi__sylvanus_olympio.ogg`.

**Prénoms disponibles (10)** : Kosi (ou Kossi), Ama, Yao, Afi, Kodzo (ou Kodjo), Akosiwa (ou Akossiwa), Komi, Sena, Abla, Mawuli.
**Centres (2)** : `sylvanus_olympio` (Sylvanus Olympio), `be_kpota` (Bè-Kpota).

Pour la démo, le formulaire d'inscription doit proposer le **prénom dans une liste** (ces 10 prénoms) et le **centre dans une liste** (ces 2 centres) :
ainsi chaque enfant inscrit a ses audios. Un prénom hors liste n'a pas d'audio tant qu'on ne l'ajoute pas à `prononciation.json` et qu'on ne relance pas `02_generation_audios.ipynb`.
Un service de synthèse à la demande (n'importe quel prénom saisi en direct) est prévu après le dépôt du 22 novembre.

**Texte à afficher** dans le journal des messages : `modele_ewe`, en remplaçant `{prenom}` par le prénom de l'enfant et `{centre}` par le nom du centre (`centres`).

## Quel message, quand

| id | Déclencheur | Canal |
|---|---|---|
| `bienvenue` | Juste après l'inscription | WhatsApp vocal |
| `rappel_j2` | 2 jours avant le vaccin | WhatsApp vocal |
| `rappel_veille` | La veille du vaccin | WhatsApp vocal |
| `rappel_jour_j` | Le jour du vaccin | WhatsApp vocal |
| `manque_3j` | 3 jours après un vaccin manqué | WhatsApp vocal **+ 2 boutons** |
| `reponse_vient` | La mère touche le bouton **1** | WhatsApp vocal |
| `reponse_empechement` | La mère touche le bouton **2** | WhatsApp vocal |
| `acte_naissance` | Enfant inscrit sans acte de naissance | WhatsApp vocal |
| `pesee` | Pesée du mois à faire | WhatsApp vocal |
| `croissance` | Courbe de poids qui stagne | WhatsApp vocal |
| `nutrition_1` | Conseil hebdomadaire (6-23 mois) | WhatsApp vocal |
| `depistage` | Âge clé de dépistage atteint | WhatsApp vocal |
| `orientation` | Résultat « à orienter » | WhatsApp vocal |
| `annonce_vaccination`, `annonce_vitamine_a`, `annonce_journee_sante` | Annonce validée depuis le tableau de bord | WhatsApp vocal |

## Boutons de réponse (`manque_3j`)

Le vocal dit « touche **1** si tu viens, **2** si tu as un empêchement ».
Les deux boutons WhatsApp doivent donc porter **exactement « 1 » et « 2 »** (champ `boutons` du JSON) :

- bouton `1` → envoyer `reponse_vient` et enregistrer « viendra » ;
- bouton `2` → envoyer `reponse_empechement`, enregistrer « empêchement » et alerter l'agent de santé.

## Points d'attention

- **Durées** : de 4,5 s à environ 17 s. `manque_3j` et `acte_naissance` dépassent 15 s : c'est voulu.
- **Envoi WhatsApp** : téléverser le `.ogg` (endpoint médias de l'API Cloud), puis envoyer un message de type `audio` avec l'id du média. Pour `manque_3j`, l'audio puis un message `interactive` à boutons « 1 » / « 2 ».
- **Ne jamais modifier un audio à la main** : changer le texte dans `catalogue_messages.xlsx`, puis relancer `02_generation_audios.ipynb`.
- Contact voix : **Jérôme**.
