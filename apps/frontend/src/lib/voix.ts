import index from "@/data/index_messages.json";
import type { CentreId, Enfant } from "./types";

export type AudioCatalogue = {
  prenom: string | null;
  centre: string | null;
  ogg: string;
  wav: string;
  duree_s: number;
};

export type MessageCatalogue = {
  id: string;
  categorie: string;
  priorite: number;
  declencheur: string;
  destinataire: string;
  canal: string;
  texte_fr: string;
  modele_ewe: string;
  variables: string[];
  boutons: { bouton: string; libelle: string; message_suivant: string }[];
  audios: AudioCatalogue[];
};

export const CATALOGUE = index.messages as unknown as MessageCatalogue[];
export const PRENOMS_DISPONIBLES = index.prenoms_disponibles as Record<string, string>;
export const CENTRES = index.centres as Record<CentreId, string>;

/** Les 10 prénoms qui ont leurs audios (clés canoniques). */
export const PRENOMS_VOIX = [...new Set(Object.values(PRENOMS_DISPONIBLES))];

export const SEXE_PRENOM: Record<string, "F" | "M"> = {
  Kosi: "M",
  Ama: "F",
  Yao: "M",
  Afi: "F",
  Kodzo: "M",
  Akosiwa: "F",
  Komi: "M",
  Sena: "F",
  Abla: "F",
  Mawuli: "M",
};

export function messageCatalogue(id: string): MessageCatalogue | undefined {
  return CATALOGUE.find((m) => m.id === id);
}

export function prenomCanonique(prenom: string): string | null {
  const p = prenom.trim();
  const k = Object.keys(PRENOMS_DISPONIBLES).find((x) => x.toLowerCase() === p.toLowerCase());
  return k ? PRENOMS_DISPONIBLES[k] : null;
}

/** Retourne le chemin public de l'audio .ogg pour un message et un enfant donnés. */
export function audioPour(messageId: string, enfant?: Pick<Enfant, "prenom" | "centre"> | null) {
  const m = messageCatalogue(messageId);
  if (!m) return null;
  let a: AudioCatalogue | undefined;
  if (!m.variables.length) a = m.audios[0];
  else {
    const p = enfant ? prenomCanonique(enfant.prenom) : null;
    if (!p) return null;
    a = m.audios.find((x) => x.prenom === p && (!m.variables.includes("centre") || x.centre === enfant?.centre));
  }
  if (!a) return null;
  return { src: "/" + a.ogg, duree: a.duree_s };
}

export function texteMessage(messageId: string, enfant?: Pick<Enfant, "prenom" | "centre"> | null) {
  const m = messageCatalogue(messageId);
  if (!m) return { fr: "", ewe: "" };
  const remplir = (t: string) =>
    t
      .replaceAll("{prenom}", enfant?.prenom ?? "votre enfant")
      .replaceAll("{centre}", enfant ? CENTRES[enfant.centre] : "votre quartier");
  return { fr: remplir(m.texte_fr), ewe: remplir(m.modele_ewe) };
}

export const CATEGORIE_COULEUR: Record<string, string> = {
  Inscription: "bg-forest-100 text-forest-800",
  Vaccination: "bg-sky-100 text-sky-800",
  Protection: "bg-clay-100 text-clay-800",
  Croissance: "bg-sun-100 text-sun-900",
  Nutrition: "bg-leaf-100 text-leaf-800",
  Dépistage: "bg-violet-100 text-violet-800",
  Annonce: "bg-ink-100 text-ink-800",
};
