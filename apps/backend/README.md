# Backend ɖevi ƒe agbalẽ

Dossier réservé au backend du prototype. Rien n'est encore codé ici : le frontend (`apps/frontend`) fonctionne pour l'instant avec des données fictives stockées dans le navigateur.

## Ce qu'il devra faire

- Comptes par rôle (agent, éducatrice, pilotage) et règles d'accès : l'éducatrice ne voit pas le détail médical, le pilotage ne voit que des données anonymes.
- Stocker les enfants, rendez-vous, pesées, messages et alertes (modèle de données de Cherif).
- Faire tourner le moteur de règles chaque jour : J-2, veille, jour J, manqué +3 j, manqué +7 j, acte de naissance, pesée, croissance.
- Envoyer les vocaux par l'API WhatsApp Cloud (téléverser le `.ogg`, puis message `audio`), et les boutons 1 / 2 pour `manque_3j`.
- Recevoir le webhook WhatsApp : bouton 1 envoie `reponse_vient`, bouton 2 envoie `reponse_empechement` et alerte l'agent.
- Plus tard (finale) : appel vocal automatique pour les téléphones sans WhatsApp.

## Pistes techniques

Supabase (Postgres + authentification) et des fonctions serveur ou un petit service FastAPI avec une tâche planifiée, comme prévu dans le plan du prototype.

## Lien avec le frontend

Le contrat attendu se lit dans `apps/frontend/src/lib/types.ts` (types `Enfant`, `MessageEnvoye`) et dans les actions de `apps/frontend/src/lib/store.ts`, qui sont à remplacer une par une par des appels au backend.
