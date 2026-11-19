# 2. Obtenir l'API WhatsApp de Meta

On utilise l'API WhatsApp Cloud de Meta avec le **numéro de test** que Meta fournit gratuitement. Il suffit pour la démo : il écrit jusqu'à 5 numéros déclarés à l'avance.

Durée : 45 minutes environ, sans compter une éventuelle vérification du compte Facebook.

Il faut :

- un compte Facebook personnel (celui qui crée l'app en devient administrateur) ;
- les téléphones de l'équipe, avec WhatsApp installé ;
- le backend déjà en ligne sur Render (guide 1).

Les libellés ci-dessous sont ceux de l'interface en anglais. Meta change souvent l'emplacement des menus ; les noms des pages restent en général les mêmes.

## Ce qu'il faut savoir avant de commencer

**La règle des 24 heures.** WhatsApp n'accepte un message libre (audio, boutons) que si le destinataire a écrit au numéro du projet dans les 24 heures précédentes. En dehors de cette fenêtre, seuls les modèles validés par Meta passent, et nos vocaux n'en sont pas. Pour la démo, chaque téléphone de l'équipe envoie donc « Bonjour » au numéro de test le jour même (étape 6). Sinon, l'envoi échoue avec l'erreur 131047.

**Le numéro de test.** C'est un numéro américain créé par Meta. Les familles verront ce numéro, pas un numéro togolais. Pour un vrai déploiement, il faudra un numéro à soi et des modèles validés (voir la fin du guide).

## Étape 1 : compte développeur

1. Aller sur developers.facebook.com et se connecter avec Facebook.
2. Cliquer sur **Get Started** et suivre l'inscription : accepter les conditions, confirmer le numéro de téléphone et l'adresse e-mail.

## Étape 2 : créer l'application

1. **My Apps > Create App**.
2. Nom de l'app : `devi-fe-agbale`. Adresse de contact : une adresse de l'équipe.
3. Cas d'usage : **Connect with customers through WhatsApp**. Si cette option n'apparaît pas, choisir **Other**, puis le type **Business**.
4. Portefeuille d'entreprise (Business portfolio) : en créer un au nom du projet si aucun n'existe.
5. Valider avec **Create app**. Meta peut redemander le mot de passe Facebook.

## Étape 3 : récupérer le numéro de test et ses identifiants

1. Dans le menu de gauche de l'app : **WhatsApp > API Setup**.
2. Meta a créé un numéro de test (champ **From**). Noter :
   - **Phone number ID** : il ira dans `WHATSAPP_PHONE_NUMBER_ID` ;
   - **WhatsApp Business Account ID** : utile pour l'étape 5.
3. Le bouton **Generate access token** donne un jeton valable 24 heures. Il sert seulement au test de l'étape 4 ; le jeton définitif vient à l'étape 5.

## Étape 4 : déclarer les téléphones de l'équipe

1. Toujours dans **API Setup**, champ **To** : **Manage phone number list**.
2. Ajouter chaque numéro au format international (`+228 90 11 22 33`). Maximum 5.
3. Chaque personne reçoit un code sur WhatsApp et le saisit dans la fenêtre.
4. Envoyer le message de test : choisir un numéro dans **To**, puis **Send message**. Le téléphone reçoit le modèle `hello_world`.

Si `hello_world` n'arrive pas, inutile d'aller plus loin : vérifier le numéro saisi et que WhatsApp est bien installé sur ce téléphone.

## Étape 5 : jeton permanent (utilisateur système)

Le jeton de l'étape 3 expire au bout de 24 heures. Le backend a besoin d'un jeton qui n'expire pas.

1. Aller sur business.facebook.com/settings (paramètres du portefeuille d'entreprise choisi à l'étape 2).
2. **Users > System users > Add**. Nom : `devi-backend`. Rôle : **Admin**.
3. Sélectionner `devi-backend`, puis **Assign assets** :
   - **Apps** : l'app `devi-fe-agbale`, avec **Full control** ;
   - **WhatsApp accounts** : le compte WhatsApp de test, avec **Full control**.
4. Cliquer sur **Generate new token** :
   - App : `devi-fe-agbale` ;
   - Expiration : **Never** ;
   - Permissions : `whatsapp_business_messaging` et `whatsapp_business_management`.
5. Copier le jeton tout de suite : Meta ne l'affiche qu'une fois. Il ira dans `WHATSAPP_TOKEN`.

## Étape 6 : ouvrir la fenêtre de 24 heures

Depuis chaque téléphone déclaré à l'étape 4, envoyer un message quelconque (« Bonjour ») au numéro de test. À refaire chaque jour de répétition et le jour de la démo, moins de 24 heures avant.

## Étape 7 : clé secrète et jeton de vérification

1. Dans l'app Meta : **App settings > Basic**. Champ **App secret** : cliquer sur **Show** et copier. Il ira dans `WHATSAPP_APP_SECRET`. Le backend s'en sert pour vérifier que les appels au webhook viennent bien de Meta.
2. Inventer un jeton de vérification, par exemple avec `openssl rand -hex 16`. Il ira dans `WHATSAPP_VERIFY_TOKEN` et dans le formulaire de l'étape 9.

## Étape 8 : passer le backend en mode réel

Sur Render, service `devi-backend`, onglet **Environment** :

| Clé | Valeur |
|---|---|
| `WHATSAPP_MODE` | `live` |
| `WHATSAPP_TOKEN` | jeton de l'étape 5 |
| `WHATSAPP_PHONE_NUMBER_ID` | identifiant de l'étape 3 |
| `WHATSAPP_APP_SECRET` | clé de l'étape 7 |
| `WHATSAPP_VERIFY_TOKEN` | jeton de l'étape 7 |
| `DESTINATAIRES_AUTORISES` | les numéros de l'étape 4, en chiffres (`22890112233,22891445566`) |

Enregistrer : Render redémarre le service. En mode `live`, il refuse de démarrer s'il manque une de ces variables. Le message d'erreur est dans **Logs**.

```bash
curl https://devi-backend.onrender.com/sante
# {"ok":true,"mode":"live"}
```

## Étape 9 : brancher le webhook

Le webhook permet à Meta de prévenir le backend quand une maman touche « 1 » ou « 2 », et quand un vocal est distribué ou écouté.

1. Réveiller le backend : ouvrir `https://devi-backend.onrender.com/sante` et attendre la réponse.
2. Dans l'app Meta : **WhatsApp > Configuration**, section **Webhook**, **Edit**.
3. **Callback URL** : `https://devi-backend.onrender.com/webhook/whatsapp`
4. **Verify token** : le jeton de l'étape 7.
5. **Verify and save**. Meta appelle le backend, qui renvoie le code attendu. En cas d'échec, voir le tableau plus bas.
6. Juste en dessous, **Webhook fields > Manage** : cocher **messages**, puis **Done**.

## Étape 10 : passer l'app en mode Live

En mode développement, Meta n'envoie pas toujours les webhooks des vrais messages. Pour être tranquille le jour de la démo, passer l'app en mode Live.

1. Déployer le frontend (guide 3) : il contient la page `/confidentialite`.
2. **App settings > Basic** :
   - **Privacy Policy URL** : `https://<adresse-vercel>/confidentialite` ;
   - **Category** : `Health` ou `Education` ;
   - **App icon** : le logo du projet (1024 × 1024).
3. **Save changes**.
4. En haut de la page de l'app, basculer **App Mode** de **Development** à **Live**.

Le numéro de test reste limité aux 5 numéros déclarés, même en mode Live.

## Étape 11 : essai complet

1. Dans l'application (ou avec `curl`), inscrire un enfant fictif avec un des 10 prénoms enregistrés (Ama, Kosi, Yao...), au centre de Bè-Kpota, avec le numéro d'un téléphone de l'équipe. Le message de bienvenue arrive dans la minute.
2. Dans son carnet, bloc **Avance rapide**, cliquer sur **Veille** : le rappel arrive, avec le prénom et le centre.
3. Cliquer sur **Manqué +3 j** : le vocal arrive, suivi des boutons « 1 » et « 2 ».
4. Toucher « 2 » sur le téléphone : le vocal `reponse_empechement` arrive en quelques secondes.
5. Vérifier dans la base :

```bash
curl -H "Authorization: Bearer <ADMIN_TOKEN>" "https://devi-backend.onrender.com/admin/messages?limite=10"
```

La relance `MISSED_3` doit avoir `response_key: 2`.

Entre deux répétitions, remettre l'enfant à zéro (sinon les mêmes rappels ne repartent pas) :

```bash
curl -X POST -H "Authorization: Bearer <ADMIN_TOKEN>" https://devi-backend.onrender.com/admin/demo/<id_enfant>/reset
```

## En cas de problème

| Erreur (colonne `error` du message, ou Logs Render) | Que faire |
|---|---|
| `fenêtre de 24 h fermée (131047)` | Le téléphone doit d'abord écrire au numéro de test (étape 6) |
| `Recipient phone number not in allowed list` (131030) | Déclarer le numéro (étape 4) |
| `Error validating access token` ou code 190 | Jeton temporaire expiré : utiliser le jeton de l'étape 5 |
| « Verify and save » échoue | Backend endormi (étape 9.1), adresse mal recopiée, ou `WHATSAPP_VERIFY_TOKEN` différent |
| Les réponses « 1 » / « 2 » n'arrivent pas | Champ `messages` non coché (étape 9.6), ou app restée en mode Development (étape 10) |
| `signature invalide` dans les Logs | `WHATSAPP_APP_SECRET` ne correspond pas à l'app |
| Message en `failed` sans erreur Meta | Audio introuvable pour ce prénom ou ce centre : voir la colonne `error` |

## Après le hackathon

Le numéro de test ne convient pas à un vrai service. Pour aller plus loin :

- ajouter un vrai numéro dans **WhatsApp > API Setup > Add phone number** (un numéro qui n'est pas déjà utilisé sur l'application WhatsApp) ;
- faire vérifier l'entreprise dans les paramètres du portefeuille (documents officiels) ;
- créer des modèles de message (Message templates) et les faire valider par Meta. Ils servent à recontacter une famille hors de la fenêtre de 24 heures. Un modèle ne peut pas contenir d'audio : il faudra un modèle texte court qui invite la maman à répondre, puis envoyer le vocal une fois la fenêtre ouverte ;
- les conversations hors fenêtre de 24 heures sont payantes : voir la grille tarifaire de Meta pour le Togo.
