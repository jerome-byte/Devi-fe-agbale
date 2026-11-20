// lib/audio-catalog.ts
// Résolution des audios éwé à partir du catalogue livré par Jérôme.
// Les fichiers .ogg sont servis depuis public/audio/messages/.

import catalogue from "./catalogue.json";

type AudioVariant = {
  prenom: string | null;
  centre: string | null;
  ogg: string;
  duree_s: number;
};

type CatalogueMessage = {
  id: string;
  categorie: string;
  destinataire: string;
  canal: string;
  texte_fr: string;
  modele_ewe: string;
  variables: string[];
  boutons: string[];
  audios: AudioVariant[];
};

type Catalogue = {
  langue: string;
  prenoms_disponibles: Record<string, string>;
  centres: Record<string, string>;
  messages: CatalogueMessage[];
};

const data = catalogue as unknown as Catalogue;

// Codes de la base -> identifiants du catalogue (voir voix/README_voix.md).
const TEMPLATE_TO_ID: Record<string, string> = {
  WELCOME: "bienvenue",
  "J-2": "rappel_j2",
  "J-1": "rappel_veille",
  J0: "rappel_jour_j",
  MISSED_3: "manque_3j",
  BIRTH_CERT: "acte_naissance",
  PESEE: "pesee",
  CROISSANCE: "croissance",
  NUTRITION_1: "nutrition_1",
  DEPISTAGE: "depistage",
  ORIENTATION: "orientation",
  VITAMINE_A: "annonce_vitamine_a",
};

export const MESSAGE_LABELS: Record<string, string> = {
  WELCOME: "Bienvenue",
  "J-2": "Rappel J-2",
  "J-1": "Rappel veille",
  J0: "Rappel jour J",
  MISSED_3: "Rendez-vous manqué",
  BIRTH_CERT: "Acte de naissance",
  PESEE: "Pesée du mois",
  CROISSANCE: "Croissance",
  NUTRITION_1: "Conseil nutrition",
  DEPISTAGE: "Dépistage",
  ORIENTATION: "Orientation",
  VITAMINE_A: "Vitamine A",
  DEPARASITAGE: "Déparasitage",
};

export type ResolvedAudio = {
  id: string;
  url: string;
  texteFr: string;
  texteEwe: string;
  duree: number;
};

function centreKey(nom: string): string | null {
  const entree = Object.entries(data.centres).find(([, libelle]) =>
    nom.toLowerCase().includes(libelle.toLowerCase())
  );
  return entree ? entree[0] : null;
}

/**
 * Retourne l'audio correspondant à un message, ou null si le catalogue ne
 * couvre pas ce prénom / ce centre.
 */
export function resolveAudio(
  templateCode: string,
  prenom: string,
  centre: string
): ResolvedAudio | null {
  const id = TEMPLATE_TO_ID[templateCode] ?? templateCode.toLowerCase();
  const message = data.messages.find((m) => m.id === id);
  if (!message) return null;

  const variables = message.variables ?? [];
  const prenomCle = variables.includes("prenom")
    ? (data.prenoms_disponibles[prenom] ?? prenom)
    : null;
  const centreCle = variables.includes("centre") ? centreKey(centre) : null;
  if (variables.includes("centre") && !centreCle) return null;

  const audio = message.audios.find(
    (a) => (a.prenom ?? null) === prenomCle && (a.centre ?? null) === centreCle
  );
  if (!audio) return null;

  const centreLibelle = centreCle ? data.centres[centreCle] : centre;

  const remplir = (texte: string) =>
    texte
      .replace(/\{prenom\}/g, prenom)
      .replace(/\{centre\}/g, centreLibelle ?? "");

  return {
    id: message.id,
    url: audio.ogg,
    texteFr: remplir(message.texte_fr),
    texteEwe: remplir(message.modele_ewe),
    duree: audio.duree_s,
  };
}

// Messages clés du parcours de démonstration, dans l'ordre du pitch.
export const PARCOURS = [
  "WELCOME",
  "J-2",
  "J-1",
  "J0",
  "MISSED_3",
  "BIRTH_CERT",
] as const;
