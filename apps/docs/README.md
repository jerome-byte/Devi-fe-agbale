# Mise en ligne du prototype

Trois guides, à suivre dans cet ordre :

1. [Backend sur Render](01-backend-render.md) : le service FastAPI qui envoie les messages WhatsApp. On le met d'abord en ligne en mode simulation.
2. [API WhatsApp de Meta](02-whatsapp-meta.md) : création de l'app Meta, numéro de test, jeton, webhook. À la fin, le backend passe en mode réel.
3. [Frontend sur Vercel](03-frontend-vercel.md) : l'application Next.js, branchée sur Supabase et sur le backend.

Le backend doit exister avant les deux autres : Meta a besoin de son adresse pour le webhook, et le frontend pour ses écritures.

## Qui parle à qui

```
                 lecture seule (clé anon)
  Navigateur  ─────────────────────────────►  Supabase (base de Cherif)
      │                                            ▲   ▲
      │ /api/backend/...                           │   │ run_rules, déclencheurs
      ▼                                            │   │
  Vercel (Next.js) ── jeton BACKEND_TOKEN ──►  Render (FastAPI) ◄──── webhook ──── Meta
                                                   │                                ▲
                                                   └────── messages audio ──────────┘
                                                                                    │
                                                                         téléphones de l'équipe
```

- La base décide quel message part et quand (table `messages`, statut `scheduled`).
- Le backend envoie, puis enregistre les réponses « 1 » et « 2 ».
- Le frontend lit la base directement et passe par le backend pour écrire.

## Les secrets et où ils vont

| Secret | Où le trouver | Render | Vercel |
|---|---|---|---|
| Chaîne de connexion Postgres | Supabase, bouton **Connect** | `DATABASE_URL` | non |
| Clé `anon` (ou clé « publishable ») | Supabase, **Project Settings > API Keys** | non | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Jeton du backend | à inventer (`openssl rand -hex 24`) | `ADMIN_TOKEN` | `BACKEND_TOKEN` (même valeur) |
| Jeton WhatsApp | Meta, utilisateur système | `WHATSAPP_TOKEN` | non |
| Clé secrète de l'app Meta | Meta, **App settings > Basic** | `WHATSAPP_APP_SECRET` | non |
| Jeton de vérification du webhook | à inventer | `WHATSAPP_VERIFY_TOKEN` | non |

Aucun de ces secrets ne va dans git. Le mot de passe Supabase ajouté au `README.md` racine le 19 novembre doit être changé dans Supabase (**Project Settings > Database > Reset database password**), puis retiré du README.
