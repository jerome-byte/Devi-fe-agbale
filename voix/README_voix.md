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

## Qui prend quoi

| | Blaise (application) | Cherif (base de données, règles, tableau de bord) |
|---|---|---|
| **À prendre** | `index_messages.json`, les `.ogg`, la liste des 10 prénoms et des 2 centres | `index_messages.json` (ids, déclencheurs, chemins des audios) |
| **À faire avec** | Proposer le prénom et le centre dans une liste à l'inscription ; jouer l'audio dans le carnet ; afficher le texte `modele_ewe` ; **envoyer sur WhatsApp** les messages préparés par la base et enregistrer les réponses « 1 » / « 2 » | Faire correspondre chaque code de message de la base à un `id` du catalogue (tableau plus bas) ; **décider** quel message part, pour quel enfant, quel jour, avec quel `.ogg` (ligne dans la table `messages`) ; lire l'audio dans le journal des messages du tableau de bord |
| **Où** | `voix/audio/messages/` | `voix/audio/messages/` |

Prendre toujours le chemin donné par le champ `ogg` de `index_messages.json` (ex. `voix/audio/messages/rappel_veille__Ama__be_kpota.ogg`) : ne pas reconstruire le nom du fichier à la main.

## Circuit d'un message (qui fait quoi)

1. **Cherif — la base décide.** Le moteur de règles (`run_rules`) écrit une ligne dans la table `messages` : enfant, code du message, chemin du `.ogg`, statut « à envoyer ».
2. **Blaise — le backend envoie.** Il lit les messages « à envoyer », envoie le `.ogg` sur WhatsApp (plus les boutons « 1 » / « 2 » pour `manque_3j`), puis passe le statut à « envoyé ».
3. **Blaise — le backend reçoit la réponse.** Quand la mère touche 1 ou 2, WhatsApp appelle le webhook du backend : il enregistre la réponse dans la base et envoie `reponse_vient` ou `reponse_empechement`.
4. **Cherif — la base alerte et affiche.** Une réponse « 2 » crée une alerte pour l'agent de santé ; le tableau de bord montre le journal des messages et les réponses.

La clé WhatsApp reste uniquement sur le serveur (jamais dans l'application ni dans git).

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

Le formulaire d'inscription propose le **prénom dans une liste** (ces 10 prénoms) et le **centre dans une liste** (ces 2 centres) : chaque enfant inscrit a ainsi ses audios.
Pour ajouter un prénom ou un centre : une ligne dans `prononciation.json`, puis relancer `02_generation_audios.ipynb` (Jérôme).

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

## Correspondance avec les codes de la base (pour Cherif)

| `template_code` dans la base | `id` dans `index_messages.json` | Variables | Exemple de fichier |
|---|---|---|---|
| `WELCOME` | `bienvenue` | aucune | `bienvenue.ogg` |
| `J-2` | `rappel_j2` | aucune | `rappel_j2.ogg` |
| `J-1` | `rappel_veille` | prénom + centre | `rappel_veille__Ama__be_kpota.ogg` |
| `J0` | `rappel_jour_j` | prénom + centre | `rappel_jour_j__Ama__be_kpota.ogg` |
| `MISSED_3` | `manque_3j` (+ boutons « 1 » / « 2 ») | aucune | `manque_3j.ogg` |
| `BIRTH_CERT` | `acte_naissance` | prénom | `acte_naissance__Ama.ogg` |

Les autres messages (`pesee`, `croissance`, `nutrition_1`, `depistage`, `orientation`, annonces) gardent leur `id` du catalogue s'ils sont ajoutés dans la base.
Pour le prototype, **tous** les messages partent sur **WhatsApp** (canal `whatsapp`, y compris `MISSED_3`). L'appel vocal est réservé à la finale.

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

## Licence de la voix (à citer)

Les audios sont générés avec **Meta MMS-TTS** (modèle `facebook/mms-tts-ewe`), sous licence **CC BY-NC 4.0** : usage non commercial, et l'auteur doit être cité.

- **Blaise** : ajouter sur la page crédits de l'application la ligne « Voix en éwé : Meta MMS-TTS (facebook/mms-tts-ewe), licence CC BY-NC 4.0 ».
- **Jérôme** : la même ligne dans le PDF de présentation.

