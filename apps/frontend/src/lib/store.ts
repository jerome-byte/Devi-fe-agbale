"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ajouterJours, ecartJours, iso } from "./dates";
import { MODE_BASE, backend, chargerDepuisBase, doseVersBase, fusionnerLocal, seDeconnecter, sessionActuelle } from "./base";
import { prochainRdv } from "./pev";
import { genererDonnees, nouvelId } from "./seed";
import type { Enfant, MessageEnvoye, Pesee, Role, Session } from "./types";

export const COMPTES_DEMO: Record<Role, Session> = {
  agent: { role: "agent", nom: "Akouvi Lawson", fonction: "Infirmière, agente de santé", lieu: "USP Bè-Kpota" },
  educatrice: { role: "educatrice", nom: "Delali Agbo", fonction: "Éducatrice", lieu: "Garderie du marché de Bè" },
  pilotage: { role: "pilotage", nom: "Équipe de pilotage", fonction: "District sanitaire du Golfe", lieu: "Grand Lomé" },
};

export type EtapeSimulation = "j2" | "veille" | "jour_j" | "manque_3j" | "manque_7j";

export type NouvelEnfant = Omit<Enfant, "id" | "inscritLe" | "vaccins" | "pesees" | "reponses" | "presences" | "depistages"> & {
  /** Doses déjà faites, avec leur date (carnet papier ou vaccins du jour). */
  vaccinsFaits: Record<string, string>;
  poidsNaissance?: number;
};

const EVENEMENTS_BASE: Record<EtapeSimulation, string> = {
  j2: "J-2",
  veille: "J-1",
  jour_j: "J0",
  manque_3j: "MISSED_3",
  manque_7j: "MISSED_7",
};

type Etat = {
  hydrate: boolean;
  session: Session | null;
  enfants: Enfant[];
  messages: MessageEnvoye[];
  decalageJours: number;
  dernierInscrit: string | null;
  /** Mode base : enfants avancés dans le temps pendant la démo (remis à zéro ensemble). */
  simules: string[];
  /** Dernière erreur de lecture ou d'écriture dans la base (affichée en bandeau). */
  erreur: string | null;
};

type Actions = {
  connecter: (role: Role) => void;
  /** Mode base : session ouverte par la page de connexion (Supabase Auth). */
  ouvrirSession: (session: Session) => void;
  deconnecter: () => void;
  inscrire: (data: NouvelEnfant) => Promise<string>;
  vacciner: (id: string, doses: string[]) => void;
  peser: (id: string, poidsKg: number, lieu: Pesee["lieu"], tailleCm?: number) => void;
  basculerActe: (id: string, valeur: boolean) => void;
  simuler: (id: string, etape: EtapeSimulation) => void;
  repondre: (messageId: string, choix: "1" | "2") => void;
  ecouter: (messageId: string) => void;
  traiterEmpechement: (id: string) => void;
  pointer: (id: string) => void;
  depister: (id: string, age: number, resultat: "ok" | "a_orienter") => void;
  envoyerAnnonce: (messageId: string, cible: string, nbFamilles: number) => void;
  revenirAujourdhui: () => void;
  reinitialiser: () => void;
  rafraichir: () => Promise<void>;
  effacerErreur: () => void;
};

export function maintenant(decalageJours: number) {
  const d = new Date();
  d.setDate(d.getDate() + decalageJours);
  return d;
}

export function auJourDe(decalageJours: number) {
  return iso(maintenant(decalageJours));
}

function horodatage(decalageJours: number, minutes = 0) {
  const d = maintenant(decalageJours);
  d.setMinutes(d.getMinutes() + minutes);
  return `${iso(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

let compteur = 0;
const idMessage = () => `n${Date.now().toString(36)}${(compteur++).toString(36)}`;

export const useStore = create<Etat & Actions>()(
  persist(
    (set, get) => {
      const envoyer = (messageId: string, enfantId: string | null, extra: Partial<MessageEnvoye> = {}, minutes = 0) => {
        const m: MessageEnvoye = {
          id: idMessage(),
          messageId,
          enfantId,
          date: horodatage(get().decalageJours, minutes),
          statut: "envoye",
          origine: "systeme",
          ...extra,
        };
        set((s) => ({ messages: [m, ...s.messages] }));
        return m;
      };
      const majEnfant = (id: string, f: (e: Enfant) => Enfant) =>
        set((s) => ({ enfants: s.enfants.map((e) => (e.id === id ? f(e) : e)) }));

      /** Mode base : écrit par le backend puis recharge. L'écran a déjà été mis à jour. */
      const ecrire = (action: () => Promise<unknown>) => {
        if (!MODE_BASE) return;
        action()
          .then(() => get().rafraichir())
          .catch((e: Error) => {
            set({ erreur: e.message });
            void get().rafraichir();
          });
      };

      return {
        hydrate: false,
        session: null,
        enfants: [],
        messages: [],
        decalageJours: 0,
        dernierInscrit: null,
        simules: [],
        erreur: null,

        // Mode local seulement : en mode base, on passe par la page de connexion.
        connecter: (role) => {
          if (MODE_BASE) return;
          set({ session: COMPTES_DEMO[role] });
        },
        ouvrirSession: (session) => {
          set({ session, enfants: [], messages: [], erreur: null });
          void get().rafraichir();
        },
        deconnecter: () => {
          // On revient toujours au jour réel : l'avance rapide ne doit pas survivre à une
          // déconnexion, sinon la démo se rouvre plusieurs jours dans le futur.
          if (MODE_BASE) {
            // On efface les données gardées dans le navigateur, sauf `dernierInscrit` :
            // c'est un identifiant de démonstration, et le parcours de démonstration s'en
            // sert pour rejoindre l'enfant après un changement de rôle (étapes 2 et 3).
            set({ session: null, enfants: [], messages: [], decalageJours: 0 });
            void seDeconnecter();
            return;
          }
          set({ session: null, decalageJours: 0 });
        },

        inscrire: async (data) => {
          const auJour = auJourDe(get().decalageJours);
          const { vaccinsFaits, poidsNaissance, ...reste } = data;

          if (MODE_BASE) {
            // La base crée le calendrier ; le backend envoie le message de bienvenue.
            const { id } = await backend<{ id: string }>("app/enfants", "POST", {
              prenom: data.prenom,
              sexe: data.sexe,
              naissance: data.naissance,
              centre: data.centre,
              tuteur_nom: data.mere.nom,
              telephone: data.mere.telephone,
              langue: data.langue,
              acte_naissance: data.acteNaissance,
              vaccins_faits: Object.entries(vaccinsFaits).map(([dose, date]) => ({ ...doseVersBase(dose), date })),
              poids_kg: poidsNaissance,
            });
            await get().rafraichir();
            // Ce que la base ne stocke pas encore (nom de famille, garderie choisie) reste dans l'application.
            majEnfant(id, (e) => ({ ...e, nom: data.nom, quartier: data.quartier, garderie: data.garderie }));
            set({ dernierInscrit: id });
            return id;
          }

          let id = nouvelId();
          while (get().enfants.some((e) => e.id === id)) id = nouvelId();
          const vaccins: Record<string, string> = { ...vaccinsFaits };
          const e: Enfant = {
            ...reste,
            id,
            inscritLe: auJour,
            vaccins,
            pesees: poidsNaissance ? [{ date: auJour, poidsKg: poidsNaissance, lieu: "centre" }] : [],
            reponses: [],
            presences: [],
            depistages: {},
            demo: true,
          };
          set((s) => ({ enfants: [e, ...s.enfants], dernierInscrit: id }));
          envoyer("bienvenue", id);
          if (!e.acteNaissance) envoyer("acte_naissance", id, {}, 1);
          return id;
        },

        vacciner: (id, doses) => {
          const auJour = auJourDe(get().decalageJours);
          majEnfant(id, (e) => {
            const vaccins = { ...e.vaccins };
            for (const d of doses) vaccins[d] = auJour;
            return { ...e, vaccins, reponses: e.reponses.map((r) => ({ ...r, traitee: true })) };
          });
          ecrire(() => backend(`app/enfants/${id}/vaccins`, "POST", { doses: doses.map(doseVersBase), date: auJour }));
        },

        peser: (id, poidsKg, lieu, tailleCm) => {
          const auJour = auJourDe(get().decalageJours);
          majEnfant(id, (e) => ({
            ...e,
            pesees: [...e.pesees.filter((p) => p.date !== auJour), { date: auJour, poidsKg, lieu, ...(tailleCm ? { tailleCm } : {}) }].sort((a, b) =>
              a.date.localeCompare(b.date),
            ),
          }));
          ecrire(() => backend(`app/enfants/${id}/pesees`, "POST", { date: auJour, poids_kg: poidsKg, taille_cm: tailleCm ?? null }));
        },

        basculerActe: (id, valeur) => {
          majEnfant(id, (e) => ({ ...e, acteNaissance: valeur }));
          ecrire(() => backend(`app/enfants/${id}/acte`, "PATCH", { valeur }));
        },

        simuler: (id, etape) => {
          const e = get().enfants.find((x) => x.id === id);
          if (!e) return;
          const rdv = prochainRdv(e, auJourDe(get().decalageJours)) ?? prochainRdv(e, e.naissance);
          if (!rdv) return;
          const reel = iso(new Date());
          const cible = {
            j2: ajouterJours(rdv.date, -2),
            veille: ajouterJours(rdv.date, -1),
            jour_j: rdv.date,
            manque_3j: ajouterJours(rdv.date, 3),
            manque_7j: ajouterJours(rdv.date, 7),
          }[etape];
          const decalage = ecartJours(reel, cible);
          set((s) => ({ decalageJours: decalage, simules: s.simules.includes(id) ? s.simules : [...s.simules, id] }));
          if (MODE_BASE) {
            // La base décide des messages, le backend les envoie vraiment sur WhatsApp.
            ecrire(() => backend(`admin/demo/${id}/${EVENEMENTS_BASE[etape]}`, "POST"));
            return;
          }
          if (etape === "j2") envoyer("rappel_j2", id);
          if (etape === "veille") envoyer("rappel_veille", id);
          if (etape === "jour_j") envoyer("rappel_jour_j", id);
          if (etape === "manque_3j") envoyer("manque_3j", id);
          // à +7 j, pas de message à la famille : l'alerte remonte chez l'agent (liste priorisée)
        },

        repondre: (messageId, choix) => {
          const m = get().messages.find((x) => x.id === messageId);
          if (!m || !m.enfantId) return;
          set((s) => ({
            messages: s.messages.map((x) => (x.id === messageId ? { ...x, statut: "repondu", reponse: choix } : x)),
          }));
          if (MODE_BASE) {
            // Comme si la maman touchait le bouton sur son téléphone.
            const tel = get().enfants.find((e) => e.id === m.enfantId)?.mere.telephone ?? "";
            ecrire(() => backend("simulation/reponse", "POST", { telephone: tel, cle: Number(choix) }));
            return;
          }
          envoyer(choix === "1" ? "reponse_vient" : "reponse_empechement", m.enfantId, {}, 1);
          const auJour = auJourDe(get().decalageJours);
          majEnfant(m.enfantId, (e) => ({
            ...e,
            reponses: [...e.reponses, { date: auJour, choix: choix === "1" ? "vient" : "empechement" }],
          }));
        },

        ecouter: (messageId) => {
          const m = get().messages.find((x) => x.id === messageId);
          if (!m || m.statut !== "envoye") return;
          set((s) => ({
            messages: s.messages.map((x) => (x.id === messageId ? { ...x, statut: "ecoute" } : x)),
          }));
          if (!messageId.startsWith("n")) ecrire(() => backend(`app/messages/${messageId}/ecoute`, "POST"));
        },

        traiterEmpechement: (id) =>
          majEnfant(id, (e) => ({ ...e, reponses: e.reponses.map((r) => ({ ...r, traitee: true })) })),

        pointer: (id) => {
          const auJour = auJourDe(get().decalageJours);
          majEnfant(id, (e) => ({
            ...e,
            presences: e.presences.includes(auJour) ? e.presences.filter((p) => p !== auJour) : [auJour, ...e.presences],
          }));
        },

        depister: (id, age, resultat) => {
          majEnfant(id, (e) => ({ ...e, depistages: { ...e.depistages, [String(age)]: resultat } }));
          if (resultat === "a_orienter") envoyer("orientation", id, { local: true });
        },

        // Annonce préparée dans l'application : aucune route du backend ne l'envoie encore.
        // Elle reste `local` pour que le journal ne la présente pas comme envoyée.
        envoyerAnnonce: (messageId, cible, nbFamilles) => envoyer(messageId, null, { cible, nbFamilles, local: true }),

        revenirAujourdhui: () => set({ decalageJours: 0 }),

        reinitialiser: () => {
          if (MODE_BASE) {
            // Remise à zéro dans la base (sql/06_demo_envoi.sql) des enfants avancés dans le temps :
            // messages et alertes effacés, rendez-vous manqués repassés à « prévu », vaccins faits gardés.
            const ids = get().simules;
            set({ decalageJours: 0, dernierInscrit: null, simules: [] });
            ecrire(() => Promise.all(ids.map((id) => backend(`admin/demo/${id}/reset`, "POST"))));
            return;
          }
          const { enfants, messages } = genererDonnees();
          set({ enfants, messages, decalageJours: 0, dernierInscrit: null });
        },

        rafraichir: async () => {
          if (!MODE_BASE) return;
          try {
            const base = await chargerDepuisBase();
            set((s) => ({
              enfants: fusionnerLocal(base.enfants, s.enfants),
              // annonces et orientations restent locales (id commençant par « n »)
              messages: [...base.messages, ...s.messages.filter((m) => m.id.startsWith("n"))].sort((a, b) =>
                b.date.localeCompare(a.date),
              ),
            }));
          } catch (e) {
            set({ erreur: (e as Error).message });
          }
        },

        effacerErreur: () => set({ erreur: null }),
      };
    },
    {
      name: MODE_BASE ? "devi-fe-agbale-base-v1" : "devi-fe-agbale-demo-v3",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => {
        const { hydrate, erreur, ...reste } = s;
        void hydrate;
        void erreur;
        return reste;
      },
      onRehydrateStorage: () => () => {
        const s = useStore.getState();
        // À chaque ouverture de l'application, on repart du jour réel. L'avance rapide
        // ne doit jamais survivre à un rechargement ni à une déconnexion : sinon la démo
        // se rouvre plusieurs jours dans le futur.
        useStore.setState({ decalageJours: 0 });
        if (MODE_BASE) {
          // La session gardée dans le navigateur ne suffit pas : on vérifie celle de Supabase.
          void (async () => {
            const session = await sessionActuelle().catch(() => null);
            if (session) {
              useStore.setState({ session });
              await useStore.getState().rafraichir();
            } else {
              useStore.setState({ session: null, enfants: [], messages: [] });
            }
            useStore.setState({ hydrate: true });
          })();
          return;
        } else if (!s.enfants.length) {
          const { enfants, messages } = genererDonnees();
          useStore.setState({ enfants, messages });
        }
        useStore.setState({ hydrate: true });
      },
    },
  ),
);

/** Date du jour dans la démo (tient compte de l'avance rapide). */
export function useAuJour() {
  const d = useStore((s) => s.decalageJours);
  return auJourDe(d);
}

export function useEnfant(id: string) {
  return useStore((s) => s.enfants.find((e) => e.id === id));
}
