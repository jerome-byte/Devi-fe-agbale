"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ajouterJours, ecartJours, iso } from "./dates";
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
  vaccinsNaissance: boolean;
  poidsNaissance?: number;
};

type Etat = {
  hydrate: boolean;
  session: Session | null;
  enfants: Enfant[];
  messages: MessageEnvoye[];
  decalageJours: number;
  dernierInscrit: string | null;
};

type Actions = {
  connecter: (role: Role) => void;
  deconnecter: () => void;
  inscrire: (data: NouvelEnfant) => string;
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

      return {
        hydrate: false,
        session: null,
        enfants: [],
        messages: [],
        decalageJours: 0,
        dernierInscrit: null,

        connecter: (role) => set({ session: COMPTES_DEMO[role] }),
        deconnecter: () => set({ session: null }),

        inscrire: (data) => {
          const auJour = auJourDe(get().decalageJours);
          let id = nouvelId();
          while (get().enfants.some((e) => e.id === id)) id = nouvelId();
          const { vaccinsNaissance, poidsNaissance, ...reste } = data;
          const vaccins: Record<string, string> = {};
          if (vaccinsNaissance) {
            vaccins.BCG_unique = auJour;
            vaccins.VPO_0 = auJour;
          }
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
        },

        peser: (id, poidsKg, lieu, tailleCm) => {
          const auJour = auJourDe(get().decalageJours);
          majEnfant(id, (e) => ({
            ...e,
            pesees: [...e.pesees.filter((p) => p.date !== auJour), { date: auJour, poidsKg, lieu, ...(tailleCm ? { tailleCm } : {}) }].sort((a, b) =>
              a.date.localeCompare(b.date),
            ),
          }));
        },

        basculerActe: (id, valeur) => majEnfant(id, (e) => ({ ...e, acteNaissance: valeur })),

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
          set({ decalageJours: decalage });
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
          envoyer(choix === "1" ? "reponse_vient" : "reponse_empechement", m.enfantId, {}, 1);
          const auJour = auJourDe(get().decalageJours);
          majEnfant(m.enfantId, (e) => ({
            ...e,
            reponses: [...e.reponses, { date: auJour, choix: choix === "1" ? "vient" : "empechement" }],
          }));
        },

        ecouter: (messageId) =>
          set((s) => ({
            messages: s.messages.map((x) => (x.id === messageId && x.statut === "envoye" ? { ...x, statut: "ecoute" } : x)),
          })),

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
          if (resultat === "a_orienter") envoyer("orientation", id);
        },

        envoyerAnnonce: (messageId, cible, nbFamilles) => envoyer(messageId, null, { cible, nbFamilles }),

        revenirAujourdhui: () => set({ decalageJours: 0 }),

        reinitialiser: () => {
          const { enfants, messages } = genererDonnees();
          set({ enfants, messages, decalageJours: 0, dernierInscrit: null });
        },
      };
    },
    {
      name: "devi-fe-agbale-demo-v3",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => {
        const { hydrate, ...reste } = s;
        void hydrate;
        return reste;
      },
      onRehydrateStorage: () => () => {
        const s = useStore.getState();
        if (!s.enfants.length) {
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
