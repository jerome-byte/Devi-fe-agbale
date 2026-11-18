/**
 * Données de démonstration : environ 300 enfants fictifs à Lomé.
 * Générées de façon déterministe, relativement à la date du jour,
 * pour que la démo reste vivante quel que soit le jour où on l'ouvre.
 * À remplacer par les données de Cherif (Supabase) quand le backend sera branché.
 */
import { ageMois, ajouterJours, ecartJours, iso } from "./dates";
import { poidsMedian } from "./oms";
import { calendrierEnfant, CONTACTS, dateContact } from "./pev";
import type { CentreId, Enfant, MessageEnvoye, Sexe } from "./types";
import { PRENOMS_VOIX, SEXE_PRENOM } from "./voix";

function rng(graine: number) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const QUARTIERS: Record<CentreId, string[]> = {
  be_kpota: ["Bè-Kpota", "Bè", "Akodessewa", "Hédzranawoé", "Ablogamé", "Kpota"],
  sylvanus_olympio: ["Tokoin", "Nyékonakpoè", "Kodjoviakopé", "Amoutivé", "Adakpamé", "Hanoukopé"],
};

export const TOUS_QUARTIERS = [...QUARTIERS.be_kpota, ...QUARTIERS.sylvanus_olympio];

export const GARDERIES = ["Garderie du marché de Bè", "Garderie du grand marché d'Adawlato"];

const NOMS = [
  "Agbeko", "Mensah", "Akakpo", "Amouzou", "Kpodar", "Lawson", "Adjavon", "Dossou", "Ekoué",
  "Gbeassor", "Tété", "Koudawo", "Ahiadzro", "Agbodjan", "Afanou", "Kudzu", "Adzoh", "Fiagan",
  "Sedzro", "Attiogbé", "Dogbé", "Gavon", "Klutsé", "Nyaku", "Tsogbé", "Wilson", "Ayena",
];

const MERES = [
  "Ablavi", "Akouvi", "Adjoa", "Afiwa", "Dzifa", "Enyonam", "Mawusi", "Sitsofe", "Yawa", "Kafui",
  "Elinam", "Edem", "Delali", "Abra", "Kossiwa", "Esinam", "Mansa", "Dela", "Yayra", "Selom",
];

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function nouvelId(r: () => number = Math.random): string {
  let s = "DV-";
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(r() * ALPHABET.length)];
  return s;
}

export function telephoneAleatoire(r: () => number = Math.random) {
  const p = ["90", "91", "92", "93", "70", "79", "96", "97", "98", "99"][Math.floor(r() * 10)];
  const n = () => String(Math.floor(r() * 100)).padStart(2, "0");
  return `+228 ${p} ${n()} ${n()} ${n()}`;
}

type Profil = "assidu" | "irregulier" | "abandon";

export function genererDonnees(aujourdhui: string = iso(new Date())) {
  const r = rng(20261118);
  const pick = <T,>(t: T[]) => t[Math.floor(r() * t.length)];
  const enfants: Enfant[] = [];
  const messages: MessageEnvoye[] = [];
  let msgN = 0;
  const msg = (m: Omit<MessageEnvoye, "id">) => messages.push({ id: `m${++msgN}`, ...m });

  const N = 296;
  for (let i = 0; i < N; i++) {
    const prenom = pick(PRENOMS_VOIX);
    const sexe: Sexe = SEXE_PRENOM[prenom] ?? (r() < 0.5 ? "F" : "M");
    const centre: CentreId = r() < 0.55 ? "be_kpota" : "sylvanus_olympio";
    // plus de nourrissons que de grands enfants
    const ageJ = Math.floor(Math.pow(r(), 1.6) * 6 * 365);
    const naissance = ajouterJours(aujourdhui, -ageJ);
    const profil: Profil = r() < 0.82 ? "assidu" : r() < 0.65 ? "irregulier" : "abandon";
    const dernierContactAbandon = 2 + Math.floor(r() * 4);
    const nom = pick(NOMS);
    const e: Enfant = {
      id: nouvelId(r),
      prenom,
      nom,
      sexe,
      naissance,
      mere: { nom: `${pick(MERES)} ${nom}`, telephone: telephoneAleatoire(r) },
      langue: r() < 0.82 ? "ewe" : r() < 0.6 ? "mina" : "francais",
      centre,
      quartier: pick(QUARTIERS[centre]),
      garderie: ageJ > 180 && ageJ < 4 * 365 && r() < 0.22 ? GARDERIES[centre === "be_kpota" ? 0 : 1] : null,
      acteNaissance: r() < (centre === "be_kpota" ? 0.8 : 0.9),
      inscritLe: naissance,
      vaccins: {},
      pesees: [],
      reponses: [],
      presences: [],
      depistages: {},
    };

    for (const c of CONTACTS) {
      const d = dateContact(naissance, c);
      if (ecartJours(d, aujourdhui) < 0) break; // rendez-vous futur
      let fait = true;
      if (profil === "abandon" && c.numero > dernierContactAbandon) fait = false;
      if (profil === "irregulier" && r() < 0.18) fait = false;
      if (profil === "assidu" && r() < 0.04) fait = false;
      // rendez-vous des 10 derniers jours : pas encore toujours honorés
      if (ecartJours(d, aujourdhui) < 10 && r() < 0.35) fait = false;
      if (!fait) continue;
      const retard = Math.floor(Math.pow(r(), 2) * (profil === "assidu" ? 6 : 20));
      const date = ajouterJours(d, Math.min(retard, ecartJours(d, aujourdhui)));
      for (const dose of c.doses) {
        if (profil === "irregulier" && r() < 0.08) continue;
        e.vaccins[dose.id] = date;
      }
    }

    // pesées mensuelles jusqu'à 24 mois, puis trimestrielles
    const zBase = (r() - 0.62) * 2.2;
    const stagne = r() < 0.06;
    let jour = 0;
    while (jour <= ageJ) {
      const mois = jour / 30.4375;
      if (r() < (profil === "abandon" && mois > 6 ? 0.3 : 0.85)) {
        const med = poidsMedian(sexe, mois);
        const sd = med * 0.12;
        let poids = med + (zBase + (r() - 0.5) * 0.3) * sd;
        if (stagne && ageJ - jour < 40 && e.pesees.length) {
          poids = e.pesees[e.pesees.length - 1].poidsKg - r() * 0.15;
        }
        e.pesees.push({
          date: ajouterJours(naissance, jour),
          poidsKg: Math.round(Math.max(1.8, poids) * 10) / 10,
          lieu: e.garderie && mois > 6 && r() < 0.5 ? "garderie" : "centre",
        });
      }
      jour += mois < 24 ? 30 + Math.floor(r() * 6) : 91;
    }

    if (e.garderie) {
      for (let k = 1; k <= 20; k++) if (r() < 0.75) e.presences.push(ajouterJours(aujourdhui, -k));
    }

    const m = ageMois(naissance, aujourdhui);
    for (const a of [9, 18, 24, 36, 48]) {
      if (m >= a + 2 || (m >= a && r() < 0.5)) e.depistages[String(a)] = r() < 0.94 ? "ok" : "a_orienter";
    }

    enfants.push(e);

    // journal des messages sur les 30 derniers jours
    const cal = calendrierEnfant(e, aujourdhui);
    for (const rdv of cal) {
      const ecart = ecartJours(aujourdhui, rdv.date);
      if (ecart > 2 || ecart < -30) continue;
      const h = (j: number, hh: number) => `${ajouterJours(rdv.date, j)}T${String(hh).padStart(2, "0")}:${String(Math.floor(r() * 60)).padStart(2, "0")}:00`;
      const st = () => (r() < 0.78 ? "ecoute" : "envoye") as MessageEnvoye["statut"];
      if (ecart <= 2) msg({ messageId: "rappel_j2", enfantId: e.id, date: h(-2, 8), statut: st(), origine: "systeme" });
      if (ecart <= 1) msg({ messageId: "rappel_veille", enfantId: e.id, date: h(-1, 18), statut: st(), origine: "systeme" });
      if (ecart <= 0) msg({ messageId: "rappel_jour_j", enfantId: e.id, date: h(0, 7), statut: st(), origine: "systeme" });
      if (rdv.joursRetard >= 3) {
        const rep = r();
        const choix = rep < 0.45 ? "1" : rep < 0.7 ? "2" : undefined;
        msg({ messageId: "manque_3j", enfantId: e.id, date: h(3, 10), statut: choix ? "repondu" : st(), reponse: choix, origine: "systeme" });
        if (choix) {
          msg({ messageId: choix === "1" ? "reponse_vient" : "reponse_empechement", enfantId: e.id, date: h(3, 11), statut: "ecoute", origine: "systeme" });
          e.reponses.push({ date: ajouterJours(rdv.date, 3), choix: choix === "1" ? "vient" : "empechement", traitee: r() < 0.5 });
        }
      }
    }
    if (!e.acteNaissance && r() < 0.5) {
      msg({ messageId: "acte_naissance", enfantId: e.id, date: `${ajouterJours(aujourdhui, -Math.floor(r() * 25))}T09:15:00`, statut: "ecoute", origine: "systeme" });
    }
  }

  // annonces passées
  msg({ messageId: "annonce_vitamine_a", enfantId: null, date: `${ajouterJours(aujourdhui, -12)}T08:00:00`, statut: "envoye", cible: "Tout le district", nbFamilles: 296, origine: "systeme" });
  msg({ messageId: "annonce_journee_sante", enfantId: null, date: `${ajouterJours(aujourdhui, -26)}T08:00:00`, statut: "envoye", cible: "Bè-Kpota", nbFamilles: 41, origine: "systeme" });

  // enfants mis en avant pour la démo, en tête de la liste de l'agent
  const vedettes = enfants.filter((e) => e.centre === "be_kpota").slice(0, 3);
  if (vedettes[0]) {
    // vaccin prévu aujourd'hui
    const v = vedettes[0];
    Object.assign(v, { prenom: "Ama", sexe: "F", nom: "Agbeko", acteNaissance: true, demo: true });
    v.naissance = ajouterJours(aujourdhui, -42);
    v.vaccins = { BCG_unique: v.naissance, VPO_0: v.naissance };
    v.pesees = [
      { date: v.naissance, poidsKg: 3.1, lieu: "centre" },
      { date: ajouterJours(v.naissance, 30), poidsKg: 4.0, lieu: "centre" },
    ];
    v.reponses = [];
  }
  if (vedettes[1]) {
    // rendez-vous manqué depuis 9 jours
    const v = vedettes[1];
    Object.assign(v, { prenom: "Yao", sexe: "M", nom: "Mensah", acteNaissance: true, demo: true });
    v.naissance = ajouterJours(aujourdhui, -51);
    v.vaccins = { BCG_unique: v.naissance, VPO_0: v.naissance };
    v.pesees = [
      { date: v.naissance, poidsKg: 3.4, lieu: "centre" },
      { date: ajouterJours(v.naissance, 31), poidsKg: 4.6, lieu: "centre" },
    ];
    v.reponses = [];
  }
  if (vedettes[2]) {
    // courbe qui stagne et pas d'acte de naissance
    const v = vedettes[2];
    Object.assign(v, { prenom: "Afi", sexe: "F", nom: "Kpodar", acteNaissance: false, demo: true });
    v.naissance = ajouterJours(aujourdhui, -228);
    const vac: Record<string, string> = {};
    for (const c of CONTACTS) {
      const d = dateContact(v.naissance, c);
      if (ecartJours(d, aujourdhui) < 2) continue;
      for (const dose of c.doses) vac[dose.id] = ajouterJours(d, 1);
    }
    v.vaccins = vac;
    v.pesees = [
      { date: v.naissance, poidsKg: 3.0, lieu: "centre" },
      { date: ajouterJours(v.naissance, 61), poidsKg: 4.9, lieu: "centre" },
      { date: ajouterJours(v.naissance, 122), poidsKg: 6.0, lieu: "centre" },
      { date: ajouterJours(v.naissance, 168), poidsKg: 6.5, lieu: "garderie" },
      { date: ajouterJours(v.naissance, 199), poidsKg: 6.5, lieu: "garderie" },
      { date: ajouterJours(v.naissance, 226), poidsKg: 6.4, lieu: "garderie" },
    ];
    v.garderie = GARDERIES[0];
    v.reponses = [];
  }

  messages.sort((a, b) => b.date.localeCompare(a.date));
  return { enfants, messages };
}
