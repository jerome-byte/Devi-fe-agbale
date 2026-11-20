import { clsx, type ClassValue } from "clsx";

export function cn(...c: ClassValue[]) {
  return clsx(c);
}

export function pourcent(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0;
}

export function nombre(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

const TEINTES = ["#1f4b8c", "#3563a6", "#d9643a", "#c47912", "#7a5af8", "#0e9384", "#db2777", "#23805a"];

export function couleurDe(texte: string) {
  let h = 0;
  for (const c of texte) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TEINTES[h % TEINTES.length];
}

export function initiales(prenom: string, nom?: string) {
  return (prenom[0] ?? "") + (nom?.[0] ?? "");
}

export function masquerTelephone(t: string) {
  return t.replace(/(\d{2}) (\d{2}) (\d{2})$/, "$1 •• ••");
}
