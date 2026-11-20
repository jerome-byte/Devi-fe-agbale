import { ageMois, ajouterMois, ecartJours, iso, parse } from "./dates";
import { etatCroissance } from "./oms";
import { calendrierEnfant, dateContact, CONTACTS } from "./pev";
import type { Enfant, MessageEnvoye } from "./types";

/** Seuil du risque élevé, comme dans la base (v_kpis, v_risk_by_zone). */
export const SEUIL_RISQUE = 10;

/**
 * Score de risque d'abandon d'un enfant, mêmes règles que la vue v_child_risk de Cherif :
 * 3 points par rendez-vous manqué, 2 sans acte de naissance, 2 si la courbe de poids
 * stagne ou chute, 1 par message non écouté (3 au plus) sur 60 jours.
 * (La distance au centre n'existe pas en mode local.)
 */
export function scoreRisque(e: Enfant, messages: MessageEnvoye[], auJour: string) {
  const manques = calendrierEnfant(e, auJour).filter((r) => r.joursRetard > 0).length;
  const niveau = etatCroissance(e).niveau;
  const croissance = niveau === "a_surveiller" || niveau === "a_orienter";
  const nonEcoutes = messages.filter((m) => m.enfantId === e.id && m.statut === "envoye" && ecartJours(m.date.slice(0, 10), auJour) <= 60).length;
  return 3 * manques + (e.acteNaissance ? 0 : 2) + (croissance ? 2 : 0) + Math.min(nonEcoutes, 3);
}

/** Nombre d'enfants à risque élevé (score de 10 ou plus). */
export function risqueEleve(enfants: Enfant[], messages: MessageEnvoye[], auJour: string) {
  return enfants.filter((e) => scoreRisque(e, messages, auJour) >= SEUIL_RISQUE).length;
}

/** Un enfant est « éligible » pour une dose quand la date prévue est passée depuis au moins 28 jours. */
function eligible(e: Enfant, contactNumero: number, auJour: string) {
  const c = CONTACTS.find((x) => x.numero === contactNumero)!;
  return ecartJours(dateContact(e.naissance, c), auJour) >= 28;
}

export function couverture(enfants: Enfant[], doseId: string, contactNumero: number, auJour: string) {
  const el = enfants.filter((e) => eligible(e, contactNumero, auJour));
  const faits = el.filter((e) => e.vaccins[doseId]).length;
  return { eligibles: el.length, faits, taux: el.length ? (faits / el.length) * 100 : 0 };
}

export function abandon(enfants: Enfant[], auJour: string) {
  const el = enfants.filter((e) => eligible(e, 4, auJour));
  const p1 = el.filter((e) => e.vaccins.PENTA_1).length;
  const p3 = el.filter((e) => e.vaccins.PENTA_3).length;
  return { p1, p3, taux: p1 ? ((p1 - p3) / p1) * 100 : 0 };
}

export function indicateurs(enfants: Enfant[], messages: MessageEnvoye[], auJour: string) {
  const penta3 = couverture(enfants, "PENTA_3", 4, auJour);
  const rr1 = couverture(enfants, "RR_1", 8, auJour);
  const ab = abandon(enfants, auJour);
  const sansActe = enfants.filter((e) => !e.acteNaissance).length;
  const enRetard = enfants.filter((e) => calendrierEnfant(e, auJour).some((r) => r.joursRetard >= 7)).length;
  const croissance = enfants.filter((e) => {
    const s = etatCroissance(e);
    return ageMois(e.naissance, auJour) < 60 && (s.niveau === "a_surveiller" || s.niveau === "a_orienter");
  }).length;
  const recents = messages.filter((m) => m.enfantId && ecartJours(m.date.slice(0, 10), auJour) <= 30 && ecartJours(m.date.slice(0, 10), auJour) >= 0);
  const ecoutes = recents.filter((m) => m.statut !== "envoye").length;
  const relances = recents.filter((m) => m.messageId === "manque_3j");
  const repondues = relances.filter((m) => m.reponse).length;
  return {
    total: enfants.length,
    penta3,
    rr1,
    abandon: ab,
    sansActe,
    tauxSansActe: enfants.length ? (sansActe / enfants.length) * 100 : 0,
    enRetard,
    croissance,
    messages30: recents.length,
    tauxEcoute: recents.length ? (ecoutes / recents.length) * 100 : 0,
    relances: relances.length,
    tauxReponse: relances.length ? (repondues / relances.length) * 100 : 0,
  };
}

export const ANTIGENES = [
  { id: "BCG_unique", contact: 1, l: "BCG" },
  { id: "PENTA_1", contact: 2, l: "Penta 1" },
  { id: "PENTA_3", contact: 4, l: "Penta 3" },
  { id: "VPI_1", contact: 4, l: "VPI 1" },
  { id: "VAP_1", contact: 5, l: "Palu 1" },
  { id: "RR_1", contact: 8, l: "RR 1" },
  { id: "VAA_unique", contact: 8, l: "VAA" },
  { id: "RR_2", contact: 9, l: "RR 2" },
];

export function parAntigene(enfants: Enfant[], auJour: string) {
  return ANTIGENES.map((a) => {
    const c = couverture(enfants, a.id, a.contact, auJour);
    return { nom: a.l, taux: Math.round(c.taux), faits: c.faits, eligibles: c.eligibles };
  });
}

/** Couverture Penta 3 par mois de naissance, pour les cohortes qui ont eu le temps d'être vaccinées. */
export function tendance(enfants: Enfant[], auJour: string) {
  const out: { mois: string; taux: number; n: number }[] = [];
  const fin = parse(ajouterMois(auJour, -5));
  for (let k = 11; k >= 0; k--) {
    const d = new Date(fin.getFullYear(), fin.getMonth() - k, 1);
    const cle = iso(d).slice(0, 7);
    const cohorte = enfants.filter((e) => e.naissance.startsWith(cle));
    const c = couverture(cohorte, "PENTA_3", 4, auJour);
    out.push({
      mois: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      taux: Math.round(c.taux),
      n: c.eligibles,
    });
  }
  return out;
}
