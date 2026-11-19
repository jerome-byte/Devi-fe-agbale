import tables from "@/data/oms_poids_age.json";
import { ageMois, ecartJours } from "./dates";
import type { Enfant, Sexe } from "./types";

/**
 * Poids pour l'âge, normes OMS 2006, 0 à 60 mois.
 * Source : donnees_sante/oms_poids_age_filles.csv et _garcons.csv (Gerson, 18 nov. 2026),
 * copiés dans src/data/oms_poids_age.json par scripts/sync-voix.mjs.
 * Règles : donnees_sante/regles_croissance.md.
 */
type Ligne = {
  Month: number;
  L: number;
  M: number;
  S: number;
  SD3neg: number;
  SD2neg: number;
  SD1neg: number;
  SD0: number;
  SD1: number;
  SD2: number;
  SD3: number;
};

const TABLES = tables as Record<Sexe, Ligne[]>;

/** Ligne de la table pour l'âge en mois révolus (0 à 60). */
function ligne(sexe: Sexe, mois: number): Ligne {
  const t = TABLES[sexe];
  const m = Math.max(0, Math.min(60, Math.floor(mois)));
  return t.find((l) => l.Month === m) ?? t[t.length - 1];
}

/** z = ((mesure / M)^L - 1) / (L × S), méthode OMS. */
export function zScore(sexe: Sexe, mois: number, poids: number): number {
  const { L, M, S } = ligne(sexe, mois);
  return (Math.pow(poids / M, L) - 1) / (L * S);
}

export function courbeReference(sexe: Sexe, jusquA = 24) {
  return TABLES[sexe]
    .filter((l) => l.Month <= jusquA)
    .map((l) => ({ mois: l.Month, m3: l.SD3neg, m2: l.SD2neg, med: l.SD0, p2: l.SD2, p3: l.SD3 }));
}

export function poidsMedian(sexe: Sexe, mois: number) {
  return ligne(sexe, mois).M;
}

export type NiveauCroissance = "normal" | "a_surveiller" | "a_orienter" | "inconnu";

export type EtatCroissance = {
  dernierZ: number | null;
  niveau: NiveauCroissance;
  stagnation: boolean;
  detail: string;
};

export const LIBELLE_NIVEAU: Record<NiveauCroissance, string> = {
  normal: "Normal",
  a_surveiller: "À surveiller",
  a_orienter: "À orienter",
  inconnu: "Pas encore mesuré",
};

/** Écart minimum entre deux mesures pour juger une stagnation (regles_croissance.md). */
const ECART_MIN_JOURS = 30;

/**
 * Résultat affiché à côté de la courbe. Jamais de diagnostic :
 * seulement normal, à surveiller ou à orienter.
 * - à orienter : z < -3
 * - à surveiller : z < -2, ou stagnation
 * - stagnation : poids identique ou en baisse entre deux mesures espacées d'au moins un mois,
 *   ou chute d'au moins une ligne de z-score
 */
export function etatCroissance(e: Enfant): EtatCroissance {
  const p = [...e.pesees].sort((a, b) => a.date.localeCompare(b.date));
  if (!p.length) return { dernierZ: null, niveau: "inconnu", stagnation: false, detail: "Aucune mesure enregistrée" };
  const der = p[p.length - 1];
  const z = zScore(e.sexe, ageMois(e.naissance, der.date), der.poidsKg);

  let stagnation = false;
  let detail = "";
  const avant = [...p].reverse().find((x) => ecartJours(x.date, der.date) >= ECART_MIN_JOURS);
  if (avant) {
    const zAv = zScore(e.sexe, ageMois(e.naissance, avant.date), avant.poidsKg);
    if (der.poidsKg <= avant.poidsKg) {
      stagnation = true;
      detail = der.poidsKg === avant.poidsKg ? "Poids identique à la mesure précédente" : "Poids en baisse depuis la mesure précédente";
    } else if (zAv - z >= 1) {
      stagnation = true;
      detail = "La courbe a perdu une ligne de z-score";
    }
  }

  const niveau: NiveauCroissance = z < -3 ? "a_orienter" : z < -2 || stagnation ? "a_surveiller" : "normal";
  if (!detail) {
    detail = niveau === "normal" ? "Courbe dans la zone normale" : niveau === "a_orienter" ? "Sous la ligne -3" : "Sous la ligne -2";
  }
  return { dernierZ: Math.round(z * 10) / 10, niveau, stagnation, detail };
}

/** Rythme des mesures : chaque mois de 0 à 2 ans, tous les 3 mois de 2 à 5 ans. */
export function mesureDue(e: Enfant, auJour: string): { due: boolean; depuis: number | null } {
  const m = ageMois(e.naissance, auJour);
  if (m >= 60) return { due: false, depuis: null };
  const der = e.pesees.reduce((x, p) => (p.date > x ? p.date : x), "");
  const depuis = der ? ecartJours(der, auJour) : null;
  const rythme = m < 24 ? 30 : 91;
  return { due: depuis === null ? m >= 1 : depuis >= rythme, depuis };
}
