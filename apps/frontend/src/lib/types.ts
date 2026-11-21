export type Role = "agent" | "educatrice" | "pilotage";

export type CentreId = "be_kpota" | "sylvanus_olympio";

export type Langue = "ewe" | "mina" | "kabiye" | "francais";

export type Sexe = "F" | "M";

export type Pesee = {
  date: string; // ISO yyyy-mm-dd
  poidsKg: number;
  tailleCm?: number; // couché avant 2 ans, debout après
  lieu: "centre" | "garderie";
};

export type Reponse = {
  date: string;
  choix: "vient" | "empechement";
  traitee?: boolean;
};

export type Enfant = {
  id: string; // identifiant porté par le QR, sans donnée personnelle
  prenom: string;
  nom: string;
  sexe: Sexe;
  naissance: string;
  mere: { nom: string; telephone: string };
  langue: Langue;
  centre: CentreId;
  centreNom?: string; // mode base : nom de la structure (centre créé par le pilotage, sans audio propre)
  quartier: string;
  garderie: string | null;
  acteNaissance: boolean;
  inscritLe: string;
  vaccins: Record<string, string>; // doseId -> date d'administration
  pesees: Pesee[];
  reponses: Reponse[];
  presences: string[]; // dates de présence à la garderie
  depistages: Record<string, "ok" | "a_orienter">; // age clé -> résultat
  demo?: boolean; // enfant mis en avant pour le parcours de démonstration
};

export type MessageEnvoye = {
  id: string;
  messageId: string; // id du catalogue (index_messages.json)
  enfantId: string | null;
  date: string; // ISO date-heure
  statut: "envoye" | "ecoute" | "repondu";
  reponse?: "1" | "2";
  cible?: string; // pour les annonces
  nbFamilles?: number;
  origine: "famille" | "systeme";
  /** Message préparé dans le navigateur (annonce, orientation) : rien n'est encore parti
   *  vers WhatsApp. Le journal l'affiche comme « démo » et non comme « envoyé ». */
  local?: boolean;
};

export type Session = {
  role: Role;
  nom: string;
  fonction: string;
  lieu: string;
};
