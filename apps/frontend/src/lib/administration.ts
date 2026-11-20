// Administration du district (pilotage) : structures et comptes.
//
// Tout passe par le backend (/api/backend/admin/...), qui seul détient la clé
// d'administration de Supabase. Le relais n'ouvre ces routes qu'au rôle pilotage.

import { useCallback, useEffect, useState } from "react";
import { backend } from "./base";

export type TypeStructure = "hopital" | "centre" | "garderie";
export type RoleGere = "agent" | "educatrice";

export type Zone = { id: number; nom: string };

export type Structure = {
  type: TypeStructure;
  id: number;
  nom: string;
  zone_id: number | null;
  zone: string | null;
  centre_id: number | null;
  centre: string | null;
  comptes: number;
  enfants: number;
};

export type Compte = {
  id: string;
  nom: string | null;
  email: string | null;
  role: RoleGere;
  actif: boolean;
  cree_le: string;
  type_structure: TypeStructure | null;
  structure: string | null;
  structure_id: number | null;
  derniere_connexion: string | null;
};

export const LIBELLE_TYPE: Record<TypeStructure, string> = {
  hopital: "Hôpital",
  centre: "Centre de santé",
  garderie: "Garderie",
};

export const LIBELLE_ROLE_GERE: Record<RoleGere, string> = {
  agent: "Agent de santé",
  educatrice: "Éducatrice",
};

/** Un agent se rattache à un hôpital ou un centre de santé, une éducatrice à une garderie. */
export const structuresPour = (role: RoleGere, liste: Structure[]) =>
  liste.filter((s) => (role === "educatrice" ? s.type === "garderie" : s.type !== "garderie"));

export const chargerStructures = () => backend<{ zones: Zone[]; structures: Structure[] }>("admin/structures");
export const chargerComptes = () => backend<Compte[]>("admin/comptes");

export const creerZone = (corps: { nom: string; commune: string | null }) => backend<{ id: number; nom: string }>("admin/zones", "POST", corps);

export const creerStructure = (corps: { type: TypeStructure; nom: string; zone_id: number; centre_id: number | null }) =>
  backend<{ type: TypeStructure; id: number; nom: string }>("admin/structures", "POST", corps);

export const creerCompte = (corps: { nom: string; email: string; role: RoleGere; structure_id: number }) =>
  backend<{ id: string; email: string; nom: string; structure: string; mot_de_passe: string }>("admin/comptes", "POST", corps);

export const changerEtat = (id: string, actif: boolean) => backend(`admin/comptes/${id}`, "PATCH", { actif });

export const supprimerCompte = (id: string) => backend<{ id: string; supprime: boolean }>(`admin/comptes/${id}/supprimer`, "POST");

export const reinitialiserMotDePasse = (id: string) => backend<{ mot_de_passe: string }>(`admin/comptes/${id}/mot-de-passe`, "POST");

/** Message lisible à partir d'une erreur du backend (« Backend (409) : ... »). */
export function messageErreur(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  if (m.includes("(502)") && m.includes("injoignable")) return "Le serveur se réveille (offre gratuite) : réessayez dans 30 secondes.";
  if (m.includes("SUPABASE_SERVICE_ROLE_KEY")) return "La clé d'administration n'est pas encore configurée sur le serveur du backend.";
  return m.replace(/^Backend \(\d+\) : /, "");
}

/** Charge des données au montage, avec rechargement manuel. */
export function useChargement<T>(charger: () => Promise<T>, actif = true) {
  const [donnees, setDonnees] = useState<T | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const recharger = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!actif) return;
    let vivant = true;
    charger()
      .then((d) => {
        if (!vivant) return;
        setDonnees(d);
        setErreur(null);
      })
      .catch((e) => {
        if (vivant) setErreur(messageErreur(e));
      });
    return () => {
      vivant = false;
    };
  }, [charger, actif, version]);

  return { donnees, erreur, recharger };
}
