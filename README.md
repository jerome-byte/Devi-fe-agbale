# ɖevi ƒe agbalẽ — Hack4Children 2026 (UNICEF Togo)

**Le carnet vivant de chaque enfant, de la naissance à 6 ans.**
## Le projet en bref

Au Togo, le programme Wezou suit la mère et le nouveau-né jusqu'au 42e jour après l'accouchement. Ensuite, plus personne ne suit l'enfant de façon continue : vaccins, croissance, retards de développement, acte de naissance.

ɖevi ƒe agbalẽ prend le relais :

- un **carnet numérique** par enfant, identifié par un **code QR** qui ne contient aucune donnée personnelle ;
- un **moteur d'alertes** qui prévient la bonne personne au bon moment ;
- des **messages vocaux en langue locale** pour les familles (WhatsApp et appel vocal), en éwé d'abord ;
- un **espace agent de santé / garderie** (un seul scan par acte) ;
- un **tableau de bord** anonymisé pour l'UNICEF, le ministère et les districts.

## Le prototype

**À déposer sur U-Events avant le 23 novembre 2026, 00 h (heure de Lomé).**
Pièces à rendre : une présentation PDF, de 1 à 5 captures d'écran et une courte vidéo facultative. Chaque fichier fait 4 Mo au plus.

Parcours de démonstration :

1. **Inscription** de l'enfant par l'agent → QR et calendrier vaccinal créés.
2. **Message vocal de bienvenue** en éwé sur WhatsApp.
3. **Avance rapide** : rappel J-2, puis rendez-vous manqué → vocal WhatsApp avec deux boutons, réponse 1 ou 2.
4. **Scan au centre de santé** : vaccin prérempli, pesée, courbe OMS.
5. **Tableau de bord** mis à jour.

Outils : Next.js (PWA) · Supabase · WhatsApp Cloud API · Meta MMS (voix éwé et kabiyè) · tables OMS.

Pour le prototype, **tout passe par WhatsApp** (vocaux + boutons de réponse). L'**appel vocal automatique** (Twilio Voice ou équivalent), pour les mères sans WhatsApp, est prévu pour la **finale du 10 décembre**.

En ligne :
- application (agent, garderie, pilotage) : https://devi-fe-agbale.vercel.app
- backend (envoi WhatsApp et réponses) : https://devi-backend-5r52.onrender.com

Ce qui a changé depuis la fusion des branches : **`README_Cherif_Blaise.md`**.

## Tâches par membre — état au 20 novembre

✅ fait · ⏳ reste à faire pour le prototype · 🎯 pour la finale du 10 décembre

Dépôt sur U-Events **le 22 novembre au plus tard** (clôture le 23 novembre à 00 h).

### Jérôme Akota — chef de projet, voix en éwé
- ✅ 99 messages vocaux en éwé (Meta MMS), vérifiés à l'écoute et reliés au journal des messages et aux envois WhatsApp
- ✅ Fusion des branches de Blaise et de Cherif, revue par issues GitHub, corrections
- ✅ Pages de connexion par rôle, pages Structures et Comptes du pilotage, nouveau logo, application installable sur téléphone
- ✅ Scan QR corrigé et testé en ligne (garderie et centre de santé), flèche « Retour » sur les pages
- ✅ Score de risque dans le Pilotage : carte « Enfants à risque élevé » et colonne par zone
- ⏳ Audio du déparasitage, le seul message sans enregistrement (21 nov.)
- ⏳ Présentation PDF, 1 à 5 captures d'écran, courte vidéo facultative, notes du dépôt avec les liens et les comptes de démonstration (21-22 nov.)
- ⏳ Dépôt officiel sur U-Events (22 nov.)
- ⏳ Ménage : supprimer les branches `mounix` et `features/dashboard` sur GitHub, désactiver le compte de test

### Blaise Moune Tchoubou — applications
- ✅ Projet Next.js + Supabase, comptes par rôle, mise en ligne sur Vercel
- ✅ Écran d'inscription avec QR et carte imprimable
- ✅ Espace agent : liste priorisée, scan QR, vaccin prérempli, pesée
- ✅ Backend FastAPI sur Render : envoi WhatsApp, boutons de réponse 1 / 2, webhook. Il tourne en simulation : les messages s'affichent dans le téléphone simulé de l'application
- ✅ Comptes de démonstration
- ⏳ Brancher le vrai WhatsApp (Meta) : numéro, jeton, webhook sur Render, `DESTINATAIRES_AUTORISES` = numéros de l'équipe, `WHATSAPP_MODE=live`, puis un essai complet sur un téléphone de l'équipe (21 nov., guide `apps/docs/02-whatsapp-meta.md`)
- ⏳ Essai sur un vrai téléphone Android : installation de l'application, scan d'une carte imprimée avec la caméra (21 nov.)
- 🎯 Appel vocal automatique pour les mères sans WhatsApp
- 🎯 Liste « À appeler en priorité » de l'agent classée par score de risque (score par enfant de Cherif, vue `v_child_risk`)
- 🎯 Présences de la garderie enregistrées dans la base (aujourd'hui elles restent dans le navigateur de l'éducatrice et s'effacent à la déconnexion)

### Cherif Tenga — moteur de règles, données, tableau de bord
- ✅ Modèle de données, 300 enfants fictifs, référentiels (calendrier PEV, OMS poids, taille et IMC, vitamine A)
- ✅ Moteur de règles et boutons d'avance rapide de la démo
- ✅ Tableau de bord (espace Pilotage de l'application) et journal des messages avec lecteur audio
- ✅ Corrections de l'issue du 19 novembre, fusionnées dans `master`
- ✅ Score de risque d'abandon (vue `v_child_risk`) et taux d'abandon Penta 1 → Penta 3 par zone
- ✅ Score de risque dans le Pilotage, sans aucun nom : carte « Enfants à risque élevé » et colonne « Risque élevé » par zone (vue `v_risk_by_zone`, ajoutée par Jérôme le 20 nov.)
- ✅ Rapport de vérification pour Gerson : `docs/verification_gerson_20nov.md`
- ⏳ Corriger les calculs si Gerson signale une erreur (21 nov.)
- ⏳ Donner à Jérôme 3 ou 4 chiffres du tableau de bord et du score de risque pour le PDF (21 nov.)
- 🎯 Table des présences de la garderie, avec Blaise

### Gerson Akagbe — référent médical
- ✅ Calendrier PEV du Togo, textes des messages en français, tables OMS, règle de stagnation (`donnees_sante/`)
- ⏳ Répondre au rapport de vérification (Kosi, Ama, Yao) : « juste » ou l'erreur trouvée (21 nov. au matin)
- ⏳ Relecture santé du PDF (21 nov.)

### Toute l'équipe
- ⏳ Répétition du parcours de démonstration en ligne, puis « Réinitialiser la démo » dans le menu du compte (22 nov.)

## Voix en éwé (Jérôme) : terminé

- Voix Meta MMS éwé réglée : dictionnaire de prononciation (prénoms, centres), pauses entre les phrases, vitesse 1,0.
- 16 messages traduits et validés à l'écoute (`voix/catalogue_messages.xlsx`).
- **99 audios** `.ogg` dans `voix/audio/messages/` (WhatsApp et lecteur de l'application), pour les 10 prénoms du dictionnaire (Kosi, Ama, Yao, Afi, Kodzo, Akosiwa, Komi, Sena, Abla, Mawuli) et les 2 centres (Sylvanus Olympio, Bè-Kpota).
- Ajouter un prénom ou un centre : une ligne dans `voix/prononciation.json`, puis relancer `voix/02_generation_audios.ipynb`.
- Fichier lu par l'application : `voix/audio/messages/index_messages.json`. Notice : `voix/README_voix.md`.

## Organisation du dossier

```
ɖevi_ƒe_agbalẽ_Hack4Children_2026/
├── README.md                                 ce fichier
├── README_Cherif_Blaise.md                   ce qui a changé depuis la fusion des branches, et ce qui reste
├── docs/                                     dossier de candidature, plan détaillé (Word et PDF), vérification médicale
├── apps/
│   ├── frontend/                             application Next.js de l'agent, de la garderie et du pilotage, tableau de bord compris (apps/frontend/README.md)
│   ├── backend/                              backend FastAPI : envoi WhatsApp et réponses (apps/backend/README.md)
│   └── docs/                                 guides de mise en ligne (Render, WhatsApp Meta, Vercel)
├── scripts/                                  scripts de la base : schéma, seed, référentiels, vérification médicale
├── sql/                                      schéma, vues, moteur de règles, seed (Supabase)
├── seed/generate_seed.py                     génère les 300 enfants fictifs
├── INTEGRATION_DEV.md                        guide d'intégration de la base
├── donnees_sante/                            calendrier PEV, tables OMS, règles de croissance (documents d'origine dans sources/)
└── voix/
    ├── README_voix.md                        notice voix pour Blaise et Cherif
    ├── 01_test_mms_ewe.ipynb                 réglages de la voix éwé (Colab)
    ├── 02_generation_audios.ipynb            génère tous les audios du catalogue (Colab)
    ├── prononciation.json                    dictionnaire de prononciation, centres, réglages
    ├── catalogue_messages.xlsx               les 16 messages (français, éwé, éwé pour la voix)
    └── audio/
        └── messages/                         99 audios .ogg (WhatsApp) + index_messages.json
```

Le plan détaillé, avec le calendrier et les cases à cocher, est dans `docs/Plan_prototype_repartition_taches.pdf`.

## Tableau de bord et base de données

Le tableau de bord de pilotage fait partie de l'application (`apps/frontend`, espace Pilotage).
Il ne lit que les vues agrégées de la base : aucune donnée nominative.

Les scripts de la base sont dans **`scripts/`** (Node.js) :

```powershell
cd scripts
npm install
npm run db:init        # schéma, vues, moteur de règles, seed, puis référentiels de donnees_sante/
npm run db:reference   # référentiels seulement (calendrier PEV, tables OMS, vitamine A)
npm run gerson:check   # 3 enfants de test et rapport docs/verification_gerson_20nov.md
```

- Connexion : `scripts/.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_POOLER_HOST`) et le mot de passe dans `SUPABASE_DB_PASSWORD`, ou toute la chaîne dans `SUPABASE_DB_URL`. Ces fichiers sont ignorés par git.
- Guide d'intégration de la base : `INTEGRATION_DEV.md` (contrats, RPC, parcours, WhatsApp).
- Déjà chargé : 23 doses du calendrier, 122 lignes OMS poids, 124 lignes taille,
  124 lignes IMC, 17 lignes vitamine A / déparasitage, 300 enfants de démonstration,
  plus 3 enfants de test pour la vérification médicale.


## Livrables de Gerson (référent médical) : qui les reçoit, où les mettre

| Livrable de Gerson | Pour qui | Pour quoi faire | Où dans le projet |
|---|---|---|---|
| **Calendrier vaccinal du Togo** : vaccins, doses, âges | **Cherif** (Blaise en copie) | Calculer les dates de rendez-vous de chaque enfant et déclencher les rappels J-2, veille, jour J et rendez-vous manqué | `donnees_sante/calendrier_pev.csv` |
| **Tables OMS poids pour l'âge** (garçons, filles) | **Cherif** et **Blaise** | Cherif calcule le z-score et l'alerte « croissance ». Blaise trace la courbe dans l'espace agent | `donnees_sante/oms_poids_age_garcons.csv` et `donnees_sante/oms_poids_age_filles.csv` |
| **Règle de stagnation** et seuils d'alerte | **Cherif** | Décider quand on envoie le message `croissance` et quand on alerte l'agent | `donnees_sante/regles_croissance.md` |
| **Vérification des calculs** (20 nov.) et **relecture santé du PDF** (21 nov.) | **Jérôme** | S'assurer que l'application ne donne pas de fausse date ou de fausse alerte, et que le dossier est juste médicalement | Pas de fichier : un retour écrit à Jérôme et à Cherif |

Gerson dépose ses fichiers dans `donnees_sante/` du dépôt git (ou les envoie à Jérôme, qui les dépose) et prévient Cherif.
