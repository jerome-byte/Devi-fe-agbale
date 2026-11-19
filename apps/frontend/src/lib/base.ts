// Accès à la base de Cherif (Supabase) et au backend FastAPI.
//
// - Lecture : directement dans Supabase avec la clé publique (lecture seule).
// - Écriture : toujours par le backend, via la route serveur /api/backend
//   (le jeton du backend ne quitte jamais le serveur Next).
//
// Sans NEXT_PUBLIC_SUPABASE_URL ni NEXT_PUBLIC_SUPABASE_ANON_KEY, l'application
// reste en mode local (données fictives dans le navigateur).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TOUTES_DOSES } from "./pev";
import type { CentreId, Enfant, Langue, MessageEnvoye, Reponse, Sexe } from "./types";
import { CENTRES } from "./voix";

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CLE_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const MODE_BASE = Boolean(URL_SUPABASE && CLE_SUPABASE);

let client: SupabaseClient | null = null;
function supabase() {
  if (!client) client = createClient(URL_SUPABASE!, CLE_SUPABASE!, { auth: { persistSession: false } });
  return client;
}

/** Client Supabase en lecture (clé publique), partagé avec le tableau de bord de pilotage. */
export const clientSupabase = () => supabase();

// ---------- Correspondances base <-> application ----------

// Codes de la base -> id du catalogue audio (voix/README_voix.md)
const CODES_BASE: Record<string, string> = {
  WELCOME: "bienvenue",
  "J-2": "rappel_j2",
  "J-1": "rappel_veille",
  J0: "rappel_jour_j",
  MISSED_3: "manque_3j",
  BIRTH_CERT: "acte_naissance",
};

const LANGUES: Record<string, Langue> = { ewe: "ewe", mina: "mina", kabiye: "kabiye", fr: "francais" };

const numeroDose = (dose: string) => (dose === "unique" ? 1 : Number(dose));

/** « PENTA_1 » -> { code: "PENTA", dose: 1 } (BCG « unique » = dose 1 dans la base). */
export function doseVersBase(doseId: string) {
  const d = TOUTES_DOSES.find((x) => x.id === doseId);
  if (!d) throw new Error(`Dose inconnue : ${doseId}`);
  return { code: d.code, dose: numeroDose(doseId.slice(d.code.length + 1)) };
}

function doseDepuisBase(code: string, dose: number): string | undefined {
  return TOUTES_DOSES.find((d) => d.code === code && numeroDose(d.id.slice(d.code.length + 1)) === dose)?.id;
}

const normaliser = (t: string) =>
  t.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** « Centre de santé de Bè-Kpota » -> « be_kpota ». Les centres sans audio enregistré sont ignorés. */
function centreDepuisNom(nom: string | undefined): CentreId | null {
  if (!nom) return null;
  const n = normaliser(nom);
  return (Object.keys(CENTRES) as CentreId[]).find((c) => n.includes(normaliser(CENTRES[c]))) ?? null;
}

// ---------- Lecture ----------

type LigneEnfant = {
  id: string;
  first_name: string;
  birth_date: string;
  sex: Sexe;
  has_birth_certificate: boolean;
  created_at: string;
  is_demo: boolean;
  health_centers: { name: string } | null;
  zones: { name: string } | null;
  daycares: { name: string } | null;
  guardians: { name: string | null; phone: string; language: string; is_primary: boolean }[];
  appointments: { status: string; done_at: string | null; vaccine_schedule: { vaccine_code: string; dose: number } | null }[];
  weigh_ins: { measured_at: string; weight_kg: number; height_cm: number | null }[];
};

type LigneMessage = {
  id: string;
  child_id: string;
  template_code: string;
  status: string;
  sent_at: string | null;
  response_key: number | null;
  responded_at: string | null;
};

/** Date-heure locale sans fuseau (format utilisé par les écrans). */
function dateLocale(horodatage: string) {
  const d = new Date(horodatage);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export async function chargerDepuisBase(): Promise<{ enfants: Enfant[]; messages: MessageEnvoye[] }> {
  const sb = supabase();
  const [enf, msg] = await Promise.all([
    sb
      .from("children")
      .select(
        `id, first_name, birth_date, sex, has_birth_certificate, created_at, is_demo,
         health_centers(name), zones(name), daycares(name),
         guardians(name, phone, language, is_primary),
         appointments(status, done_at, vaccine_schedule(vaccine_code, dose)),
         weigh_ins(measured_at, weight_kg, height_cm)`,
      )
      .order("created_at", { ascending: false }),
    sb
      .from("messages")
      .select("id, child_id, template_code, status, sent_at, response_key, responded_at")
      .in("status", ["sent", "delivered", "listened"])
      .order("sent_at", { ascending: false })
      .limit(1000),
  ]);
  if (enf.error) throw new Error(`Lecture des enfants : ${enf.error.message}`);
  if (msg.error) throw new Error(`Lecture des messages : ${msg.error.message}`);

  const lignesMessages = (msg.data ?? []) as LigneMessage[];
  const messages: MessageEnvoye[] = lignesMessages
    .filter((m) => m.sent_at)
    .map((m) => ({
      id: m.id,
      messageId: CODES_BASE[m.template_code] ?? m.template_code,
      enfantId: m.child_id,
      date: dateLocale(m.sent_at!),
      statut: m.response_key ? "repondu" : m.status === "listened" ? "ecoute" : "envoye",
      ...(m.response_key === 1 || m.response_key === 2 ? { reponse: String(m.response_key) as "1" | "2" } : {}),
      origine: "systeme",
    }));

  const reponsesParEnfant = new Map<string, Reponse[]>();
  for (const m of lignesMessages) {
    if (m.template_code !== "MISSED_3" || !m.response_key || !m.responded_at) continue;
    const liste = reponsesParEnfant.get(m.child_id) ?? [];
    liste.push({ date: dateLocale(m.responded_at).slice(0, 10), choix: m.response_key === 1 ? "vient" : "empechement" });
    reponsesParEnfant.set(m.child_id, liste);
  }

  const enfants: Enfant[] = [];
  for (const l of (enf.data ?? []) as unknown as LigneEnfant[]) {
    const centre = centreDepuisNom(l.health_centers?.name);
    if (!centre) continue; // seuls Bè-Kpota et Sylvanus Olympio ont des audios
    const tuteur = l.guardians.find((g) => g.is_primary) ?? l.guardians[0];
    const vaccins: Record<string, string> = {};
    for (const a of l.appointments) {
      if (a.status !== "done" || !a.done_at || !a.vaccine_schedule) continue;
      const id = doseDepuisBase(a.vaccine_schedule.vaccine_code, a.vaccine_schedule.dose);
      if (id) vaccins[id] = a.done_at;
    }
    enfants.push({
      id: l.id,
      prenom: l.first_name,
      nom: "",
      sexe: l.sex,
      naissance: l.birth_date,
      mere: { nom: tuteur?.name ?? "", telephone: tuteur?.phone ?? "" },
      langue: LANGUES[tuteur?.language ?? "ewe"] ?? "ewe",
      centre,
      quartier: l.zones?.name ?? "",
      garderie: l.daycares?.name ?? null,
      acteNaissance: l.has_birth_certificate,
      inscritLe: l.created_at.slice(0, 10),
      vaccins,
      pesees: l.weigh_ins
        .map((p) => ({
          date: p.measured_at,
          poidsKg: Number(p.weight_kg),
          ...(p.height_cm ? { tailleCm: Number(p.height_cm) } : {}),
          lieu: "centre" as const,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      reponses: (reponsesParEnfant.get(l.id) ?? []).sort((a, b) => a.date.localeCompare(b.date)),
      presences: [],
      depistages: {},
      demo: !l.is_demo, // enfants inscrits pendant la démo, pas ceux du seed
    });
  }

  const ids = new Set(enfants.map((e) => e.id));
  return { enfants, messages: messages.filter((m) => m.enfantId && ids.has(m.enfantId)) };
}

/**
 * Garde ce que la base ne stocke pas encore (nom de famille, présences à la garderie,
 * dépistages, empêchements traités) quand on recharge depuis la base.
 */
export function fusionnerLocal(base: Enfant[], avant: Enfant[]): Enfant[] {
  const parId = new Map(avant.map((e) => [e.id, e]));
  return base.map((e) => {
    const a = parId.get(e.id);
    if (!a) return e;
    const traitees = new Set(a.reponses.filter((r) => r.traitee).map((r) => `${r.date}|${r.choix}`));
    return {
      ...e,
      nom: e.nom || a.nom,
      quartier: e.quartier || a.quartier,
      garderie: e.garderie ?? a.garderie,
      presences: a.presences,
      depistages: a.depistages,
      reponses: e.reponses.map((r) => (traitees.has(`${r.date}|${r.choix}`) ? { ...r, traitee: true } : r)),
    };
  });
}

// ---------- Écriture (backend) ----------

export async function backend<T = unknown>(chemin: string, methode: "POST" | "PATCH", corps?: unknown): Promise<T> {
  const r = await fetch(`/api/backend/${chemin}`, {
    method: methode,
    headers: { "content-type": "application/json" },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) {
    const detail = typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail ?? json);
    throw new Error(`Backend (${r.status}) : ${detail}`);
  }
  return json as T;
}
