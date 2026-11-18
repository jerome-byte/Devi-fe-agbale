import {
  BarChart3,
  Baby,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  ScanLine,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/types";

export type LienNav = {
  href: string;
  libelle: string;
  icone: LucideIcon;
  roles: Role[];
  compteur?: "urgents" | "reponses";
  motsCles?: string;
};

export type SectionNav = { titre?: string; liens: LienNav[] };

export const NAV: SectionNav[] = [
  {
    liens: [
      { href: "/agent", libelle: "Tableau de bord", icone: LayoutDashboard, roles: ["agent"], motsCles: "accueil aujourd'hui" },
      { href: "/garderie", libelle: "Ma garderie", icone: Store, roles: ["educatrice"], motsCles: "accueil présences" },
      { href: "/pilotage", libelle: "Tableau de bord", icone: BarChart3, roles: ["pilotage"], motsCles: "accueil indicateurs couverture" },
    ],
  },
  {
    titre: "Suivi des enfants",
    liens: [
      { href: "/enfants", libelle: "Enfants", icone: Users, roles: ["agent", "educatrice"], compteur: "urgents", motsCles: "liste carnet retard" },
      { href: "/scan", libelle: "Scanner une carte", icone: ScanLine, roles: ["agent", "educatrice"], motsCles: "qr code caméra" },
      { href: "/inscription", libelle: "Inscrire un enfant", icone: Baby, roles: ["agent"], motsCles: "nouveau naissance" },
    ],
  },
  {
    titre: "Familles",
    liens: [
      { href: "/messages", libelle: "Messages", icone: MessageCircle, roles: ["agent", "pilotage"], compteur: "reponses", motsCles: "vocal whatsapp audio éwé" },
      { href: "/pilotage/annonces", libelle: "Annonces vocales", icone: Megaphone, roles: ["pilotage"], motsCles: "campagne vitamine" },
    ],
  },
];

export const ACCUEIL: Record<Role, string> = { agent: "/agent", educatrice: "/garderie", pilotage: "/pilotage" };

export const ACTION_PRINCIPALE: Record<Role, { href: string; libelle: string }> = {
  agent: { href: "/inscription", libelle: "Inscrire un enfant" },
  educatrice: { href: "/scan", libelle: "Scanner une arrivée" },
  pilotage: { href: "/pilotage/annonces", libelle: "Nouvelle annonce" },
};

export const LIBELLE_ROLE: Record<Role, string> = {
  agent: "Agent de santé",
  educatrice: "Éducatrice",
  pilotage: "Pilotage",
};

export function liensPour(role: Role) {
  return NAV.map((s) => ({ ...s, liens: s.liens.filter((l) => l.roles.includes(role)) })).filter((s) => s.liens.length);
}
