// Copie les données partagées du dépôt (voix et calendrier PEV) dans l'application.
// Lancé automatiquement avant `npm run dev` et `npm run build`.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const racine = resolve(app, "..", "..");
const sourceAudio = join(racine, "voix", "audio", "messages");
const cibleAudio = join(app, "public", "voix", "audio", "messages");
const cibleData = join(app, "src", "data");

if (!existsSync(sourceAudio)) {
  console.warn("[sync-voix] dossier voix introuvable, on garde les données déjà présentes");
  process.exit(0);
}

mkdirSync(cibleAudio, { recursive: true });
mkdirSync(cibleData, { recursive: true });

let n = 0;
for (const f of readdirSync(sourceAudio)) {
  if (f.endsWith(".ogg")) {
    cpSync(join(sourceAudio, f), join(cibleAudio, f));
    n++;
  }
}

const index = JSON.parse(readFileSync(join(sourceAudio, "index_messages.json"), "utf8"));
writeFileSync(join(cibleData, "index_messages.json"), JSON.stringify(index, null, 2));

// calendrier_pev.csv -> JSON
const csv = readFileSync(join(racine, "donnees_sante", "calendrier_pev.csv"), "utf8").replace(/^﻿/, "");
const lignes = csv.trim().split(/\r?\n/);
const entetes = lignes.shift().split(",");
const parse = (l) => {
  const out = [];
  let cur = "", q = false;
  for (const c of l) {
    if (c === '"') q = !q;
    else if (c === "," && !q) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
};
const pev = lignes.map((l) => Object.fromEntries(parse(l).map((v, i) => [entetes[i], v])));
writeFileSync(join(cibleData, "calendrier_pev.json"), JSON.stringify(pev, null, 2));

// tables OMS poids pour l'âge (Gerson) -> JSON { F: [...], M: [...] }
const lireOms = (fichier) => {
  const t = readFileSync(join(racine, "donnees_sante", fichier), "utf8").replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const cols = t.shift().split(",").map((c) => c.trim());
  return t.map((l) => Object.fromEntries(l.split(",").map((v, i) => [cols[i], Number(v)])));
};
const oms = { F: lireOms("oms_poids_age_filles.csv"), M: lireOms("oms_poids_age_garcons.csv") };
writeFileSync(join(cibleData, "oms_poids_age.json"), JSON.stringify(oms));

console.log(
  `[sync-voix] ${n} audios .ogg, index des messages, calendrier PEV (${pev.length} doses) et tables OMS (${oms.F.length} + ${oms.M.length} lignes) synchronisés`,
);
