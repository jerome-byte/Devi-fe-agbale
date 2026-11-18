import { ageMois, ecartJours } from "./dates";
import { etatCroissance, mesureDue } from "./oms";
import { calendrierEnfant, prochainRdv, type RendezVous } from "./pev";
import type { Enfant } from "./types";

export type TypeAlerte =
  | "retard_grave"
  | "retard"
  | "perdu"
  | "empechement"
  | "croissance"
  | "aujourdhui"
  | "acte"
  | "pesee"
  | "depistage";

export type Alerte = {
  type: TypeAlerte;
  titre: string;
  detail: string;
  poids: number; // plus c'est haut, plus c'est urgent
  ton: "rouge" | "orange" | "jaune" | "bleu" | "vert";
};

export const AGES_DEPISTAGE = [9, 18, 24, 36, 48];

export function alertesEnfant(e: Enfant, auJour: string): Alerte[] {
  const out: Alerte[] = [];
  const cal = calendrierEnfant(e, auJour);
  const retards = cal.filter((r) => r.joursRetard > 0);
  if (retards.length) {
    const pire = retards[0];
    const noms = pire.manquantes.map((d) => d.nom).join(", ");
    if (pire.joursRetard > 90) {
      out.push({
        type: "perdu",
        titre: pire.joursRetard > 730 ? "Perdu de vue depuis plus de 2 ans" : `Perdu de vue depuis ${Math.floor(pire.joursRetard / 30)} mois`,
        detail: `${pire.libelle} jamais fait. Visite à domicile ou relais du quartier.`,
        poids: 45,
        ton: "jaune",
      });
    } else if (pire.joursRetard >= 7) {
      out.push({
        type: "retard_grave",
        titre: `Vaccin manqué depuis ${pire.joursRetard} jours`,
        detail: `${pire.libelle} : ${noms}. Appeler la famille.`,
        poids: 90 + Math.min(pire.joursRetard, 60) / 6,
        ton: "rouge",
      });
    } else {
      out.push({
        type: "retard",
        titre: `Vaccin en retard de ${pire.joursRetard} jour${pire.joursRetard > 1 ? "s" : ""}`,
        detail: `${pire.libelle} : ${noms}`,
        poids: 70 + pire.joursRetard,
        ton: "orange",
      });
    }
  }
  const empechement = e.reponses.find((r) => r.choix === "empechement" && !r.traitee);
  if (empechement) {
    out.push({
      type: "empechement",
      titre: "La famille a un empêchement",
      detail: "Rappeler la mère pour choisir un autre jour",
      poids: 88,
      ton: "rouge",
    });
  }
  const crois = etatCroissance(e);
  const dernierePesee = e.pesees.reduce((m, p) => (p.date > m ? p.date : m), "");
  const peseeRecente = !!dernierePesee && ecartJours(dernierePesee, auJour) <= 90;
  if (peseeRecente && (crois.niveau === "a_surveiller" || crois.niveau === "a_orienter")) {
    const orienter = crois.niveau === "a_orienter";
    out.push({
      type: "croissance",
      titre: orienter ? "Croissance : à orienter" : crois.stagnation ? "Courbe de poids qui stagne" : "Croissance : à surveiller",
      detail: crois.detail,
      poids: orienter ? 92 : 75,
      ton: orienter ? "rouge" : "orange",
    });
  }
  const auj = cal.find((r) => r.statut === "aujourdhui");
  if (auj) {
    out.push({
      type: "aujourdhui",
      titre: "Vaccin prévu aujourd'hui",
      detail: `${auj.libelle} : ${auj.manquantes.map((d) => d.nom).join(", ")}`,
      poids: 60,
      ton: "bleu",
    });
  }
  if (!e.acteNaissance) {
    out.push({
      type: "acte",
      titre: "Pas d'acte de naissance",
      detail: "Orienter la famille vers l'état civil (gratuit)",
      poids: 40,
      ton: "jaune",
    });
  }
  const m = ageMois(e.naissance, auJour);
  const mesure = mesureDue(e, auJour);
  if (mesure.due) {
    out.push({
      type: "pesee",
      titre: "Mesure à faire",
      detail: `${m < 24 ? "Poids et taille chaque mois" : "Poids et taille tous les 3 mois"}${mesure.depuis !== null ? `, dernière il y a ${mesure.depuis} jours` : ""}`,
      poids: 25,
      ton: "vert",
    });
  }
  const ageCle = AGES_DEPISTAGE.find((a) => m >= a && m < a + 2 && !e.depistages[String(a)]);
  if (ageCle) {
    out.push({
      type: "depistage",
      titre: `Dépistage des ${ageCle} mois`,
      detail: "Quelques questions simples sur le développement",
      poids: 30,
      ton: "bleu",
    });
  }
  return out.sort((a, b) => b.poids - a.poids);
}

export type EnfantPriorise = {
  enfant: Enfant;
  alertes: Alerte[];
  score: number;
  prochain: RendezVous | null;
};

export function prioriser(enfants: Enfant[], auJour: string): EnfantPriorise[] {
  return enfants
    .map((enfant) => {
      const alertes = alertesEnfant(enfant, auJour);
      const score = alertes.reduce((s, a, i) => s + a.poids / (i + 1), 0);
      return { enfant, alertes, score, prochain: prochainRdv(enfant, auJour) };
    })
    .sort((a, b) => b.score - a.score);
}

export const TON_CLASSES: Record<Alerte["ton"], { pastille: string; fond: string; texte: string; bord: string }> = {
  rouge: { pastille: "bg-clay-500", fond: "bg-clay-50", texte: "text-clay-800", bord: "border-clay-200" },
  orange: { pastille: "bg-sun-500", fond: "bg-sun-50", texte: "text-sun-900", bord: "border-sun-200" },
  jaune: { pastille: "bg-sun-300", fond: "bg-sun-50", texte: "text-sun-900", bord: "border-sun-200" },
  bleu: { pastille: "bg-sky-500", fond: "bg-sky-50", texte: "text-sky-800", bord: "border-sky-200" },
  vert: { pastille: "bg-leaf-500", fond: "bg-leaf-50", texte: "text-leaf-800", bord: "border-leaf-200" },
};
