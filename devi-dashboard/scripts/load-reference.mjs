#!/usr/bin/env node
// scripts/load-reference.mjs
// Charge les référentiels validés par Gerson dans Supabase :
//   donnees_sante/calendrier_pev.csv       -> vaccine_schedule (métadonnées du calendrier)
//   donnees_sante/oms_poids_age_*.csv      -> who_weight_for_age (LMS + écarts-types)
// puis recalcule les z-scores des pesées existantes avec les vraies tables OMS.
//
// Usage : npm run db:reference   (ou inclus dans npm run db:init)

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

function lireEnv(fichier = ".env.local") {
  if (!existsSync(fichier)) return {};
  return Object.fromEntries(
    readFileSync(fichier, "utf8")
      .split(/\r?\n/)
      .filter((ligne) => ligne.includes("=") && !ligne.trim().startsWith("#"))
      .map((ligne) => {
        const index = ligne.indexOf("=");
        return [
          ligne.slice(0, index).trim(),
          ligne.slice(index + 1).trim().replace(/^["']|["']$/g, ""),
        ];
      })
  );
}

// Parseur CSV minimal qui gère les champs entre guillemets (maladies, source).
function parseCsv(texte) {
  const lignes = [];
  let ligne = [];
  let champ = "";
  let entreGuillemets = false;

  for (let i = 0; i < texte.length; i += 1) {
    const c = texte[i];
    if (entreGuillemets) {
      if (c === '"') {
        if (texte[i + 1] === '"') {
          champ += '"';
          i += 1;
        } else {
          entreGuillemets = false;
        }
      } else {
        champ += c;
      }
      continue;
    }
    if (c === '"') entreGuillemets = true;
    else if (c === ",") {
      ligne.push(champ);
      champ = "";
    } else if (c === "\n") {
      ligne.push(champ);
      lignes.push(ligne);
      ligne = [];
      champ = "";
    } else if (c !== "\r") champ += c;
  }
  if (champ.length > 0 || ligne.length > 0) {
    ligne.push(champ);
    lignes.push(ligne);
  }

  const [entete, ...corps] = lignes;
  return corps
    .filter((l) => l.some((v) => v.trim() !== ""))
    .map((l) => Object.fromEntries(entete.map((cle, i) => [cle.trim(), (l[i] ?? "").trim()])));
}

const nombre = (valeur) => {
  if (valeur === "" || valeur === null || valeur === undefined) return null;
  const n = Number(String(valeur).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const env = lireEnv();
const host = env.SUPABASE_POOLER_HOST;
if (!host) {
  console.error(
    "SUPABASE_POOLER_HOST manque dans .env.local.\n" +
      "Supabase → Connect → Session pooler : collez l'hôte (ex. aws-1-eu-central-2.pooler.supabase.com)."
  );
  process.exit(1);
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
if (!url) {
  console.error("NEXT_PUBLIC_SUPABASE_URL manque dans .env.local.");
  process.exit(1);
}
const ref = new URL(url).host.split(".")[0];
const fichierMotDePasse = "supabase_passwoed.txt";
const motDePasseBrut = existsSync(fichierMotDePasse)
  ? readFileSync(fichierMotDePasse, "utf8").trim()
  : null;
const mots = motDePasseBrut ? motDePasseBrut.split(/\s+/) : [];
const motDePasse = process.env.SUPABASE_DB_PASSWORD ?? (mots.length ? mots[mots.length - 1] : null);
if (!motDePasse) {
  console.error("Mot de passe introuvable : renseignez supabase_passwoed.txt.");
  process.exit(1);
}

const dossier = resolve("..", "donnees_sante");
const fichierCalendrier = resolve(dossier, "calendrier_pev.csv");
const fichierFilles = resolve(dossier, "oms_poids_age_filles.csv");
const fichierGarcons = resolve(dossier, "oms_poids_age_garcons.csv");
const fichierVitamine = resolve(dossier, "calendrier_vitamineA_deparasitage.csv");
const fichiersTaille = {
  "0-2": {
    F: resolve(dossier, "oms_taille_age_0_2ans_filles.csv"),
    M: resolve(dossier, "oms_taille_age_0_2ans_garcons.csv"),
  },
  "2-5": {
    F: resolve(dossier, "oms_taille_age_2_5ans_filles.csv"),
    M: resolve(dossier, "oms_taille_age_2_5ans_garcons.csv"),
  },
};
const fichiersImc = {
  "0-2": {
    F: resolve(dossier, "oms_imc_age_0_2ans_filles.csv"),
    M: resolve(dossier, "oms_imc_age_0_2ans_garcons.csv"),
  },
  "2-5": {
    F: resolve(dossier, "oms_imc_age_2_5ans_filles.csv"),
    M: resolve(dossier, "oms_imc_age_2_5ans_garcons.csv"),
  },
};

const tousLesFichiers = [
  fichierCalendrier,
  fichierFilles,
  fichierGarcons,
  fichierVitamine,
  ...Object.values(fichiersTaille).flatMap((s) => Object.values(s)),
  ...Object.values(fichiersImc).flatMap((s) => Object.values(s)),
];

for (const fichier of tousLesFichiers) {
  if (!existsSync(fichier)) {
    console.error(`Fichier introuvable : ${fichier}`);
    process.exit(1);
  }
}

const client = new pg.Client({
  host,
  port: Number(env.SUPABASE_POOLER_PORT ?? 5432),
  user: `postgres.${ref}`,
  password: motDePasse,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
});
await client.connect();
console.log(`Connexion : ${host}`);

// ---------- 1. Calendrier PEV ----------------------------------------
const calendrier = parseCsv(readFileSync(fichierCalendrier, "utf8"));
const lignes = await client.query(
  "select id, vaccine_code, dose, contact_no from vaccine_schedule"
);
const parCle = new Map(
  lignes.rows.map((r) => [`${r.contact_no}|${r.vaccine_code}|${r.dose}`, r.id])
);

let misesAJour = 0;
const nonTrouvees = [];
await client.query("begin");
for (const row of calendrier) {
  const dose = row.dose === "unique" ? 1 : Number(row.dose);
  const cle = `${Number(row.contact)}|${row.vaccin_code}|${dose}`;
  const id = parCle.get(cle);
  if (!id) {
    nonTrouvees.push(cle);
    continue;
  }
  await client.query(
    `update vaccine_schedule
        set age_value = $2, age_unit = $3, short_name = $4, dose_label = $5,
            diseases = $6, source = $7, status = $8
      where id = $1`,
    [
      id,
      nombre(row.age_valeur),
      row.age_unite,
      row.vaccin_nom,
      row.dose,
      row.maladies,
      row.source,
      row.statut,
    ]
  );
  misesAJour += 1;
}
await client.query("commit");

console.log(`Calendrier : ${misesAJour}/${calendrier.length} doses mises à jour`);
if (nonTrouvees.length > 0) {
  console.error(`Doses sans correspondance : ${nonTrouvees.join(", ")}`);
  process.exitCode = 1;
}

// ---------- 2. Tables OMS poids pour l'âge ---------------------------
async function chargerOms(fichier, sexe) {
  const rows = parseCsv(readFileSync(fichier, "utf8"));
  await client.query("begin");
  for (const row of rows) {
    await client.query(
      `insert into who_weight_for_age
         (sex, age_months, l, m, s, sd3neg, sd2neg, sd1neg, sd0, sd1, sd2, sd3)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       on conflict (sex, age_months) do update
         set l = excluded.l, m = excluded.m, s = excluded.s,
             sd3neg = excluded.sd3neg, sd2neg = excluded.sd2neg,
             sd1neg = excluded.sd1neg, sd0 = excluded.sd0,
             sd1 = excluded.sd1, sd2 = excluded.sd2, sd3 = excluded.sd3`,
      [
        sexe,
        nombre(row.Month),
        nombre(row.L),
        nombre(row.M),
        nombre(row.S),
        nombre(row.SD3neg),
        nombre(row.SD2neg),
        nombre(row.SD1neg),
        nombre(row.SD0),
        nombre(row.SD1),
        nombre(row.SD2),
        nombre(row.SD3),
      ]
    );
  }
  await client.query("commit");
  console.log(`OMS ${sexe} : ${rows.length} lignes chargées`);
}

await chargerOms(fichierFilles, "F");
await chargerOms(fichierGarcons, "M");

// Taille et IMC : deux bandes, même format de CSV.
async function chargerOmsBande(table, fichier, sexe, band) {
  const rows = parseCsv(readFileSync(fichier, "utf8"));
  await client.query("begin");
  for (const row of rows) {
    await client.query(
      `insert into ${table}
         (sex, band, age_months, l, m, s, sd3neg, sd2neg, sd1neg, sd0, sd1, sd2, sd3)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       on conflict (sex, band, age_months) do update
         set l = excluded.l, m = excluded.m, s = excluded.s,
             sd3neg = excluded.sd3neg, sd2neg = excluded.sd2neg,
             sd1neg = excluded.sd1neg, sd0 = excluded.sd0,
             sd1 = excluded.sd1, sd2 = excluded.sd2, sd3 = excluded.sd3`,
      [
        sexe,
        band,
        nombre(row.Month),
        nombre(row.L),
        nombre(row.M),
        nombre(row.S),
        nombre(row.SD3neg),
        nombre(row.SD2neg),
        nombre(row.SD1neg),
        nombre(row.SD0),
        nombre(row.SD1),
        nombre(row.SD2),
        nombre(row.SD3),
      ]
    );
  }
  await client.query("commit");
  console.log(`OMS ${table} ${sexe} ${band} : ${rows.length} lignes`);
}

for (const [band, parSexe] of Object.entries(fichiersTaille)) {
  await chargerOmsBande("who_height_for_age", parSexe.F, "F", band);
  await chargerOmsBande("who_height_for_age", parSexe.M, "M", band);
}
for (const [band, parSexe] of Object.entries(fichiersImc)) {
  await chargerOmsBande("who_bmi_for_age", parSexe.F, "F", band);
  await chargerOmsBande("who_bmi_for_age", parSexe.M, "M", band);
}

// Vitamine A et déparasitage.
const vitamines = parseCsv(readFileSync(fichierVitamine, "utf8"));
await client.query("begin");
for (const row of vitamines) {
  await client.query(
    `insert into vitamin_a_schedule (produit, age_mois, dose, lieu)
     values ($1,$2,$3,$4)
     on conflict (produit, age_mois) do update
       set dose = excluded.dose, lieu = excluded.lieu`,
    [row.produit, nombre(row.age_mois), row.dose, row.lieu]
  );
}
await client.query("commit");
console.log(`Vitamine A / déparasitage : ${vitamines.length} lignes`);

// ---------- 3. Recalcul des z-scores existants -----------------------
const recalcul = await client.query(`
  update weigh_ins w
     set z_score = round(lms_z(w.weight_kg, r.l, r.m, r.s), 2)
    from children c, who_weight_for_age r
   where c.id = w.child_id
     and r.sex = c.sex
     and r.age_months = round(w.age_months)::int
     and w.weight_kg > 0
     and r.m > 0
     and round(w.age_months) between 0 and 60`);
console.log(`Poids : ${recalcul.rowCount} pesées recalculées`);

const tailles = await client.query(`
  update weigh_ins w
     set height_z = round(lms_z(w.height_cm, r.l, r.m, r.s), 2)
    from children c, who_height_for_age r
   where c.id = w.child_id
     and w.height_cm is not null
     and r.sex = c.sex
     and r.band = case when w.age_months < 24 then '0-2' else '2-5' end
     and r.age_months = round(w.age_months)::int`);
console.log(`Taille : ${tailles.rowCount} mesures recalculées`);

const imcs = await client.query(`
  update weigh_ins
     set bmi = round(weight_kg / power(height_cm / 100.0, 2), 1)
   where height_cm is not null and height_cm > 0`);
console.log(`IMC calculé sur ${imcs.rowCount} mesures`);

const imcZ = await client.query(`
  update weigh_ins w
     set bmi_z = round(lms_z(w.bmi, r.l, r.m, r.s), 2)
    from children c, who_bmi_for_age r
   where c.id = w.child_id
     and w.bmi is not null
     and r.sex = c.sex
     and r.band = case when w.age_months < 24 then '0-2' else '2-5' end
     and r.age_months = round(w.age_months)::int`);
console.log(`IMC : ${imcZ.rowCount} z-scores recalculés`);

// ---------- 4. Statut OMS et tendance des pesées existantes ----------
const statuts = await client.query(`
  update weigh_ins
     set status = case
           when z_score < -3 or height_z < -3 or bmi_z < -3 then 'a_orienter'
           when z_score < -2 or height_z < -2 or bmi_z < -2 or bmi_z > 2 then 'a_surveiller'
           when z_score is not null or height_z is not null or bmi_z is not null then 'normal'
           else null end,
         status_indicator = case
           when z_score < -3 then 'poids'
           when height_z < -3 then 'taille'
           when bmi_z < -3 then 'imc'
           when z_score < -2 then 'poids'
           when height_z < -2 then 'taille'
           when bmi_z < -2 or bmi_z > 2 then 'imc'
           else null end`);
console.log(`Statuts OMS recalculés : ${statuts.rowCount}`);

const tendances = await client.query(`
  with p as (
    select w.id,
           prev.weight_kg as prev_weight,
           prev.z_score as prev_z
      from weigh_ins w
      left join lateral (
        select p.weight_kg, p.z_score
          from weigh_ins p
         where p.child_id = w.child_id
           and p.measured_at <= w.measured_at - interval '1 month'
         order by p.measured_at desc
         limit 1
      ) prev on true
  )
  update weigh_ins w
     set trend = case
       when p.prev_weight is null then 'ok'
       when w.weight_kg < p.prev_weight then 'chute'
       when w.weight_kg = p.prev_weight then 'stagnation'
       when p.prev_z is not null and w.z_score is not null
         and p.prev_z - w.z_score >= 1 then 'stagnation'
       else 'ok' end
    from p
   where p.id = w.id`);
console.log(`Tendances recalculées : ${tendances.rowCount}`);

await client.end();
