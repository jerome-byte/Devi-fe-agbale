import calendrier from "@/data/calendrier_pev.json";
import { ajouterJours, ajouterMois, ecartJours } from "./dates";
import type { Enfant } from "./types";

type LignePev = {
  contact: string;
  age_libelle: string;
  age_valeur: string;
  age_unite: string;
  vaccin_code: string;
  vaccin_nom: string;
  dose: string;
  maladies: string;
};

export type Dose = {
  id: string; // ex. PENTA_1
  code: string;
  nom: string;
  maladies: string;
};

export type Contact = {
  numero: number;
  libelle: string; // « 6 semaines »
  ageValeur: number;
  ageUnite: "jours" | "semaines" | "mois";
  doses: Dose[];
};

export const CONTACTS: Contact[] = (() => {
  const parContact = new Map<number, Contact>();
  for (const l of calendrier as LignePev[]) {
    const n = Number(l.contact);
    if (!parContact.has(n)) {
      parContact.set(n, {
        numero: n,
        libelle: l.age_libelle,
        ageValeur: Number(l.age_valeur),
        ageUnite: l.age_unite as Contact["ageUnite"],
        doses: [],
      });
    }
    parContact.get(n)!.doses.push({
      id: `${l.vaccin_code}_${l.dose}`,
      code: l.vaccin_code,
      nom: l.vaccin_nom,
      maladies: l.maladies,
    });
  }
  return [...parContact.values()].sort((a, b) => a.numero - b.numero);
})();

export const TOUTES_DOSES: Dose[] = CONTACTS.flatMap((c) => c.doses);

export function dateContact(naissance: string, c: Contact): string {
  if (c.ageUnite === "jours") return ajouterJours(naissance, c.ageValeur);
  if (c.ageUnite === "semaines") return ajouterJours(naissance, c.ageValeur * 7);
  return ajouterMois(naissance, c.ageValeur);
}

export type StatutRdv = "fait" | "partiel" | "en_retard" | "aujourdhui" | "proche" | "a_venir";

export type RendezVous = Contact & {
  date: string;
  statut: StatutRdv;
  faites: string[];
  manquantes: Dose[];
  joursRetard: number;
};

/** Délai de grâce avant de considérer un rendez-vous comme manqué. */
export const GRACE_JOURS = 0;

export function calendrierEnfant(e: Enfant, auJour: string): RendezVous[] {
  return CONTACTS.map((c) => {
    const date = dateContact(e.naissance, c);
    const faites = c.doses.filter((d) => e.vaccins[d.id]).map((d) => d.id);
    const manquantes = c.doses.filter((d) => !e.vaccins[d.id]);
    const ecart = ecartJours(auJour, date); // >0 futur
    let statut: StatutRdv;
    if (manquantes.length === 0) statut = "fait";
    else if (ecart < -GRACE_JOURS) statut = faites.length ? "partiel" : "en_retard";
    else if (ecart === 0) statut = "aujourdhui";
    else if (ecart <= 7) statut = "proche";
    else statut = "a_venir";
    return {
      ...c,
      date,
      statut,
      faites,
      manquantes,
      joursRetard: manquantes.length && ecart < 0 ? -ecart : 0,
    };
  });
}

/** Premier rendez-vous qui n'est pas complet (le plus ancien d'abord). */
export function prochainRdv(e: Enfant, auJour: string): RendezVous | null {
  return calendrierEnfant(e, auJour).find((r) => r.statut !== "fait") ?? null;
}

export function couvertureEnfant(e: Enfant, auJour: string) {
  const cal = calendrierEnfant(e, auJour);
  const dus = cal.filter((r) => ecartJours(auJour, r.date) <= 0);
  const dosesDues = dus.flatMap((r) => r.doses);
  const faites = dosesDues.filter((d) => e.vaccins[d.id]).length;
  return { dues: dosesDues.length, faites, aJour: faites === dosesDues.length };
}

export const COULEUR_VACCIN: Record<string, string> = {
  BCG: "#0E5C46",
  VPO: "#2F9E6E",
  PENTA: "#2E6FD8",
  PNEUMO: "#7A5AF8",
  ROTA: "#D9643A",
  VPI: "#0E9384",
  VAP: "#C2410C",
  RR: "#DB2777",
  VAA: "#CA8A04",
  MENA: "#4F46E5",
};
