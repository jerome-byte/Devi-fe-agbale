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

## Tâches par membre

### Jérôme Akota — chef de projet, voix en éwé
- Générer les messages vocaux éwé avec Meta MMS et les vérifier à l'écoute (18 nov.)
- Assembler les segments (prénom + vaccin + centre) ; réenregistrer les phrases ratées (19 nov.)
- Fournir les audios au journal des messages et aux messages WhatsApp (20 nov.)
- Coordonner l'équipe ; rédiger le PDF et envoyer le dépôt officiel (21-22 nov.)

### Blaise Moune Tchoubou — applications
- Projet Next.js + Supabase, comptes par rôle, mise en ligne sur Vercel (17 nov.)
- Écran d'inscription avec QR et carte imprimable (18 nov.)
- Espace agent : liste priorisée, scan QR, vaccin prérempli, pesée (19 nov.)
- Envoi WhatsApp (19 nov.), boutons de réponse 1 / 2 et comptes de démo (20 nov.)
- Appel vocal automatique (pour la finale)

### Cherif Tenga — moteur de règles, données, tableau de bord
- Modèle de données (17 nov.) et environ 300 enfants fictifs (18 nov.)
- Moteur de règles + boutons d'avance rapide (19 nov.)
- Tableau de bord et journal des messages avec lecteur audio (20 nov.)
- Score de risque d'abandon (pour le pitch)

### Gerson Akagbe — référent médical
- Calendrier PEV du Togo et textes des messages en français (17 nov.)
- Tables OMS poids pour l'âge et règle de stagnation (18 nov.)
- Vérification des calculs de l'application (20 nov.) et relecture santé du PDF (21 nov.)

## État d'avancement — voix en éwé (17 nov.)

**Fait (Jérôme)**
- Voix Meta MMS éwé réglée : dictionnaire de prononciation (prénoms, centres), pauses entre les phrases, vitesse 1,0.
- 16 messages traduits et validés à l'écoute (`voix/catalogue_messages.xlsx`).
- Tous les audios générés dans `voix/audio/messages/` : **99 audios** (10 prénoms × 2 centres), en `.ogg` (WhatsApp) et `.wav` (journal des messages).
- Remise à l'équipe : `voix/audio/messages/index_messages.json` (fichier à lire par l'application) et `voix/README_voix.md` (notice).

**Limite actuelle**
- Les messages avec prénom existent pour les **10 prénoms du dictionnaire** : Kosi (Kossi), Ama, Yao, Afi, Kodzo (Kodjo), Akosiwa (Akossiwa), Komi, Sena, Abla, Mawuli, et pour les **2 centres** : Sylvanus Olympio et Bè-Kpota.
- Pour la démo, le formulaire d'inscription propose le prénom et le centre **dans une liste**. Un autre prénom demande de l'ajouter à `prononciation.json` et de relancer `voix/02_generation_audios.ipynb`.
- Plus tard (après le dépôt du 22) : un petit service de synthèse à la demande pour prononcer n'importe quel prénom saisi en direct.

**Reste à faire**
- Transmettre `voix/README_voix.md` à Blaise et Cherif.
- Jérôme : présentation PDF et notes du dépôt (21-22 nov.), puis envoi officiel.

## Organisation du dossier

```
ɖevi_ƒe_agbalẽ_Hack4Children_2026/
├── README.md                                 ce fichier
├── ɖevi ƒe agbalẽ_Hack4Children_2026.pdf     dossier de candidature
├── Plan_prototype_repartition_taches.docx    plan détaillé (Word)
├── Plan_prototype_repartition_taches.pdf     plan détaillé (PDF)
└── voix/
    ├── README_voix.md                        notice voix pour Blaise et Cherif
    ├── 01_test_mms_ewe.ipynb                 réglages de la voix éwé (Colab)
    ├── 02_generation_audios.ipynb            génère tous les audios du catalogue (Colab)
    ├── prononciation.json                    dictionnaire de prononciation, centres, réglages
    ├── catalogue_messages.xlsx               les 16 messages (français, éwé, éwé pour la voix)
    └── audio/
        └── messages/                         99 audios (.ogg WhatsApp + .wav) + index_messages.json
```

Le plan détaillé, avec le calendrier et les cases à cocher, est dans `Plan_prototype_repartition_taches.pdf`.
