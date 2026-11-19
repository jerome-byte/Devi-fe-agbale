// Données du tableau de bord de pilotage.
//
// - Mode base (Supabase configuré) : lecture des VUES agrégées de Cherif (sql/02_views.sql).
//   Les chiffres sont ceux du moteur de règles, identiques au tableau de bord de Cherif,
//   et aucune donnée nominative ne quitte la base.
// - Mode local (sans Supabase) : calculs dans le navigateur sur les enfants fictifs, comme avant.

import { clientSupabase } from "./base";
import { ANTIGENES, abandon, couverture, indicateurs, parAntigene, tendance } from "./indicateurs";
import { calendrierEnfant } from "./pev";
import { QUARTIERS } from "./seed";
import type { CentreId, Enfant, MessageEnvoye } from "./types";

export type LigneZone = { q: string; n: number; penta3: number; abandon: number; sansActe: number; retards: number; choisie?: boolean };

export type DonneesPilotage = {
  source: "base" | "local";
  total: number;
  penta3: { taux: number; faits: number; eligibles: number };
  abandon: { taux: number; perdus: number };
  sansActe: { taux: number; n: number };
  ecoute: { taux: number; detail: string };
  zones: LigneZone[];
  antigenes: { nom: string; taux: number; faits: number; eligibles: number }[];
  courbe: { mois: string; taux: number; n: number }[];
  signaux: { enRetard: number; croissance: number; reponses: string; reponsesDetail: string };
  textes: { zones: string; vaccins: string; courbe: string; enRetard: string };
};

const arrondi = (v: number | null | undefined) => Math.round(Number(v ?? 0));
const nombre = (v: number | string | null | undefined) => Number(v ?? 0);

// ---------------------------------------------------------------- mode local

export const ZONES_LOCALES: { valeur: "tout" | CentreId; libelle: string }[] = [
  { valeur: "tout", libelle: "District du Golfe" },
  { valeur: "be_kpota", libelle: "Aire de santé de Bè-Kpota" },
  { valeur: "sylvanus_olympio", libelle: "Aire du CHU Sylvanus Olympio" },
];

export function pilotageLocal(enfants: Enfant[], messages: MessageEnvoye[], zone: "tout" | CentreId, auJour: string): DonneesPilotage {
  const dansZone = zone === "tout" ? enfants : enfants.filter((e) => e.centre === zone);
  const ids = new Set(dansZone.map((e) => e.id));
  const ind = indicateurs(dansZone, messages.filter((m) => m.enfantId && ids.has(m.enfantId)), auJour);
  const noms = zone === "tout" ? [...QUARTIERS.be_kpota, ...QUARTIERS.sylvanus_olympio] : QUARTIERS[zone];
  const zones = noms
    .map((q) => {
      const l = dansZone.filter((e) => e.quartier === q);
      return {
        q,
        n: l.length,
        penta3: Math.round(couverture(l, "PENTA_3", 4, auJour).taux),
        abandon: Math.round(abandon(l, auJour).taux),
        sansActe: l.length ? Math.round((l.filter((e) => !e.acteNaissance).length / l.length) * 100) : 0,
        retards: l.filter((e) => calendrierEnfant(e, auJour).some((r) => r.joursRetard >= 7)).length,
      };
    })
    .sort((a, b) => a.penta3 - b.penta3);
  return {
    source: "local",
    total: ind.total,
    penta3: ind.penta3,
    abandon: { taux: ind.abandon.taux, perdus: ind.abandon.p1 - ind.abandon.p3 },
    sansActe: { taux: ind.tauxSansActe, n: ind.sansActe },
    ecoute: { taux: ind.tauxEcoute, detail: `${ind.messages30} messages sur 30 jours` },
    zones,
    antigenes: parAntigene(dansZone, auJour),
    courbe: tendance(dansZone, auJour),
    signaux: {
      enRetard: ind.enRetard,
      croissance: ind.croissance,
      reponses: `${Math.round(ind.tauxReponse)} %`,
      reponsesDetail: `des relances ont reçu une réponse 1 ou 2 (${ind.relances})`,
    },
    textes: {
      zones: "Couverture Penta 3 par quartier",
      vaccins: "Enfants en âge d'avoir reçu la dose depuis au moins 4 semaines",
      courbe: "Penta 3 à jour, par mois de naissance",
      enRetard: "enfants avec un vaccin manqué depuis plus de 7 jours",
    },
  };
}

// ---------------------------------------------------------------- mode base (vues de Cherif)

type VueZone = { zone_id: number; zone: string; children: number; missed_count: number };
type VueCouverture = { zone_id: number; zone: string; vaccine_code: string; dose: number; due_count: number; done_count: number };
type VueAbandon = { zone_id: number; penta1_cohort: number; penta3_done: number; dropout_pct: number | null };
type VueActe = { zone_id: number; children: number; missing: number; missing_pct: number | null };
type VueMessages = { zone_id: number; sent: number; listened: number; listen_pct: number | null; responses: number; answered_yes: number; answered_no: number };
type VueCroissance = { zone_id: number; a_surveiller: number; a_orienter: number };
type VueTendance = { month: string; due_count: number; done_count: number; coverage_pct: number | null };
type VueAlertes = { zone_id: number; type: string; open_count: number };

export type VuesPilotage = {
  zones: VueZone[];
  couverture: VueCouverture[];
  abandon: VueAbandon[];
  actes: VueActe[];
  messages: VueMessages[];
  croissance: VueCroissance[];
  tendance: VueTendance[];
  alertes: VueAlertes[];
};

/** Lit les vues agrégées de la base. Lève une erreur lisible si une vue manque. */
export async function chargerVuesPilotage(): Promise<VuesPilotage> {
  const sb = clientSupabase();
  const lire = async <T,>(vue: string, colonnes: string) => {
    const { data, error } = await sb.from(vue).select(colonnes);
    if (error) throw new Error(`Lecture de ${vue} : ${error.message}`);
    return (data ?? []) as unknown as T[];
  };
  const [zones, couverture, abandon, actes, messages, croissance, tendance, alertes] = await Promise.all([
    lire<VueZone>("v_zone_summary", "zone_id, zone, children, missed_count"),
    lire<VueCouverture>("v_coverage_by_zone", "zone_id, zone, vaccine_code, dose, due_count, done_count"),
    lire<VueAbandon>("v_penta_dropout", "zone_id, penta1_cohort, penta3_done, dropout_pct"),
    lire<VueActe>("v_birth_cert", "zone_id, children, missing, missing_pct"),
    lire<VueMessages>("v_message_engagement", "zone_id, sent, listened, listen_pct, responses, answered_yes, answered_no"),
    lire<VueCroissance>("v_growth_by_zone", "zone_id, a_surveiller, a_orienter"),
    lire<VueTendance>("v_coverage_trend", "month, due_count, done_count, coverage_pct"),
    lire<VueAlertes>("v_alerts_summary", "zone_id, type, open_count"),
  ]);
  return { zones, couverture, abandon, actes, messages, croissance, tendance, alertes };
}

/** Zones proposées dans le sélecteur (0 = toutes zones). */
export function zonesBase(v: VuesPilotage) {
  return [{ valeur: "0", libelle: "Toutes les zones" }, ...[...v.zones].sort((a, b) => a.zone.localeCompare(b.zone)).map((z) => ({ valeur: String(z.zone_id), libelle: z.zone }))];
}

function cumul(lignes: VueCouverture[], code: string, dose: number) {
  const l = lignes.filter((x) => x.vaccine_code === code && Number(x.dose) === dose);
  const eligibles = l.reduce((s, x) => s + nombre(x.due_count), 0);
  const faits = l.reduce((s, x) => s + nombre(x.done_count), 0);
  return { eligibles, faits, taux: eligibles ? (faits / eligibles) * 100 : 0 };
}

const DOSES_BASE: Record<string, [string, number]> = {
  BCG_unique: ["BCG", 1],
  PENTA_1: ["PENTA", 1],
  PENTA_3: ["PENTA", 3],
  VPI_1: ["VPI", 1],
  VAP_1: ["VAP", 1],
  RR_1: ["RR", 1],
  VAA_unique: ["VAA", 1],
  RR_2: ["RR", 2],
};

export function pilotageBase(v: VuesPilotage, zoneId: number): DonneesPilotage {
  const pourZone = <T extends { zone_id: number }>(l: T[]) => l.find((x) => Number(x.zone_id) === zoneId);
  const couv = zoneId === 0 ? v.couverture : v.couverture.filter((x) => Number(x.zone_id) === zoneId);
  const total = zoneId === 0 ? v.zones.reduce((s, z) => s + nombre(z.children), 0) : nombre(pourZone(v.zones)?.children);

  const ab = pourZone(v.abandon);
  const acte = pourZone(v.actes);
  const msg = pourZone(v.messages);
  const crois = pourZone(v.croissance);
  const enRetard = v.alertes
    .filter((a) => a.type === "missed_7d" && (zoneId === 0 || Number(a.zone_id) === zoneId))
    .reduce((s, a) => s + nombre(a.open_count), 0);

  const zones: LigneZone[] = v.zones
    .map((z) => {
      const p3 = cumul(v.couverture.filter((x) => Number(x.zone_id) === Number(z.zone_id)), "PENTA", 3);
      return {
        q: z.zone,
        n: nombre(z.children),
        penta3: Math.round(p3.taux),
        abandon: arrondi(v.abandon.find((x) => Number(x.zone_id) === Number(z.zone_id))?.dropout_pct),
        sansActe: arrondi(v.actes.find((x) => Number(x.zone_id) === Number(z.zone_id))?.missing_pct),
        retards: nombre(z.missed_count),
        choisie: zoneId !== 0 && Number(z.zone_id) === zoneId,
      };
    })
    .sort((a, b) => a.penta3 - b.penta3);

  const courbe = [...v.tendance]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((t) => ({
      mois: new Date(`${t.month}T00:00:00`).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      taux: arrondi(t.coverage_pct),
      n: nombre(t.due_count),
    }));

  const reponses = nombre(msg?.responses);
  return {
    source: "base",
    total,
    penta3: cumul(couv, "PENTA", 3),
    abandon: { taux: nombre(ab?.dropout_pct), perdus: nombre(ab?.penta1_cohort) - nombre(ab?.penta3_done) },
    sansActe: { taux: nombre(acte?.missing_pct), n: nombre(acte?.missing) },
    ecoute: { taux: nombre(msg?.listen_pct), detail: `${nombre(msg?.listened)} écoutés sur ${nombre(msg?.sent)} envoyés` },
    zones,
    antigenes: ANTIGENES.map((a) => {
      const [code, dose] = DOSES_BASE[a.id];
      const c = cumul(couv, code, dose);
      return { nom: a.l, taux: Math.round(c.taux), faits: c.faits, eligibles: c.eligibles };
    }),
    courbe,
    signaux: {
      enRetard,
      croissance: nombre(crois?.a_surveiller) + nombre(crois?.a_orienter),
      reponses: String(reponses),
      reponsesDetail: `réponses aux relances WhatsApp, dont ${nombre(msg?.answered_no)} empêchement${nombre(msg?.answered_no) > 1 ? "s" : ""} (touche 2)`,
    },
    textes: {
      zones: "Couverture Penta 3 par zone",
      vaccins: "Rendez-vous échus honorés, par vaccin",
      courbe: zoneId === 0 ? "Rendez-vous échus honorés, par mois d'échéance" : "Toutes zones · rendez-vous échus honorés, par mois",
      enRetard: "alertes ouvertes : vaccin manqué depuis plus de 7 jours",
    },
  };
}
