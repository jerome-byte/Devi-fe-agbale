const JOUR = 86_400_000;

export function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${j}`;
}

export function parse(isoDate: string): Date {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function ajouterJours(isoDate: string, n: number): string {
  const d = parse(isoDate);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export function ajouterMois(isoDate: string, n: number): string {
  const d = parse(isoDate);
  const jour = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const dernier = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(jour, dernier));
  return iso(d);
}

export function ecartJours(de: string, a: string): number {
  return Math.round((parse(a).getTime() - parse(de).getTime()) / JOUR);
}

export function ageMois(naissance: string, auJour: string): number {
  return ecartJours(naissance, auJour) / 30.4375;
}

export function libelleAge(naissance: string, auJour: string): string {
  const j = ecartJours(naissance, auJour);
  if (j < 0) return "pas encore né";
  if (j === 0) return "nouveau-né";
  if (j < 14) return j === 1 ? "1 jour" : `${j} jours`;
  if (j < 61) return `${Math.floor(j / 7)} semaines`;
  const m = Math.floor(j / 30.4375);
  if (m < 24) return `${m} mois`;
  const a = Math.floor(m / 12);
  const r = m % 12;
  return r ? `${a} ans ${r} mois` : `${a} ans`;
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MOIS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export function dateCourte(isoDate: string): string {
  const d = parse(isoDate);
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

export function dateSansAnnee(isoDate: string): string {
  const d = parse(isoDate);
  return `${d.getDate()} ${MOIS[d.getMonth()]}`;
}

export function dateLongue(isoDate: string): string {
  const d = parse(isoDate);
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export function heure(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  return `${String(d.getHours()).padStart(2, "0")} h ${String(d.getMinutes()).padStart(2, "0")}`;
}

/** « dans 3 jours », « hier », « il y a 12 jours » */
export function relatif(cible: string, auJour: string): string {
  const n = ecartJours(auJour, cible);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  if (n === 2) return "après-demain";
  if (n > 0) return `dans ${n} jours`;
  return `il y a ${-n} jours`;
}
