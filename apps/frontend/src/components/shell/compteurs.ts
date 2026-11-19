"use client";

import { useMemo } from "react";
import { prioriser } from "@/lib/regles";
import { useAuJour, useStore } from "@/lib/store";

/** Enfants visibles selon le rôle : centre de l'agente, ou garderie de l'éducatrice. */
export function useEnfantsDuPerimetre() {
  const session = useStore((s) => s.session);
  const enfants = useStore((s) => s.enfants);
  return useMemo(() => {
    if (!session) return [];
    if (session.role === "educatrice") return enfants.filter((e) => e.garderie === session.lieu);
    if (session.role === "agent") return enfants.filter((e) => e.centre === "be_kpota");
    return enfants;
  }, [enfants, session]);
}

export function useCompteurs() {
  const perimetre = useEnfantsDuPerimetre();
  const messages = useStore((s) => s.messages);
  const auJour = useAuJour();
  return useMemo(() => {
    const liste = prioriser(perimetre, auJour);
    const urgents = liste.filter((x) => x.alertes.some((a) => a.ton === "rouge" || a.ton === "orange")).length;
    const ids = new Set(perimetre.map((e) => e.id));
    const reponses = perimetre.filter((e) => e.reponses.some((r) => r.choix === "empechement" && !r.traitee)).length;
    const recentes = messages.filter((m) => m.reponse && m.enfantId && ids.has(m.enfantId)).slice(0, 8);
    return { urgents, reponses, liste, recentes };
  }, [perimetre, messages, auJour]);
}
