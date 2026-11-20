#!/usr/bin/env node
// scripts/gerson-check.mjs
// Prépare 3 enfants de test pour la vérification médicale du 20 novembre et
// écrit le rapport Markdown de ce que l'application affiche.
//
// Usage : npm run gerson:check
// Rejouable : les enfants marqués qr_token = 'gerson-test-*' sont remplacés.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).host.split(".")[0];
const client = new pg.Client({
  host: env.SUPABASE_POOLER_HOST,
  port: 5432,
  user: `postgres.${ref}`,
  password: readFileSync("supabase_passwoed.txt", "utf8").trim(),
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
await client.connect();

await client.query("delete from children where qr_token like 'gerson-test-%'");

const CAS = [
  {
    token: "gerson-test-1",
    prenom: "Kosi",
    sexe: "M",
    age: "8 months",
    center: 1,
    zone: 1,
    mesures: [
      ["-70 days", 7.0, 66.0],
      ["-35 days", 7.9, 69.0],
      ["0 days", 8.3, 71.0],
    ],
    attendu: "normal",
  },
  {
    token: "gerson-test-2",
    prenom: "Ama",
    sexe: "F",
    age: "13 months",
    center: 7,
    zone: 2,
    mesures: [
      ["-70 days", 7.6, 72.0],
      ["-35 days", 7.5, 73.0],
      ["0 days", 7.5, 74.0],
    ],
    attendu: "à surveiller",
  },
  {
    token: "gerson-test-3",
    prenom: "Yao",
    sexe: "M",
    age: "34 months",
    center: 2,
    zone: 2,
    mesures: [
      ["-100 days", 13.8, 93.0],
      ["-50 days", 11.5, 90.0],
      ["0 days", 9.6, 88.0],
    ],
    attendu: "à orienter",
  },
];

const ids = [];
for (const cas of CAS) {
  const child = await client.query(
    `insert into children
       (qr_token, first_name, birth_date, sex, center_id, zone_id,
        has_birth_certificate, is_demo, distance_km)
     values ($1, $2, current_date - interval '${cas.age}', $3, $4, $5, true, true, 1.5)
     returning id`,
    [cas.token, cas.prenom, cas.sexe, cas.center, cas.zone]
  );
  const id = child.rows[0].id;
  ids.push({ ...cas, id });

  await client.query(
    `insert into guardians (child_id, name, phone, language, channel_pref, is_primary)
     values ($1, 'Maman test', '+22800' || lpad((random()*999999)::int::text, 6, '0'),
             'ewe', 'whatsapp', true)`,
    [id]
  );

  await client.query(
    `insert into appointments (child_id, schedule_id, due_date, status, done_at)
     select $1, s.id, c.birth_date + s.age_days,
            case when c.birth_date + s.age_days < current_date - 14 then 'done' else 'planned' end,
            case when c.birth_date + s.age_days < current_date - 14
                 then c.birth_date + s.age_days end
       from vaccine_schedule s cross join children c
      where c.id = $1`,
    [id]
  );

  for (const [offset, poids, taille] of cas.mesures) {
    await client.query(
      `insert into weigh_ins (child_id, measured_at, weight_kg, height_cm)
       values ($1, current_date + interval '${offset}', $2, $3)`,
      [id, poids, taille]
    );
  }

  await client.query("select * from run_rules(current_date, $1, false)", [id]);
}

const lignes = [];
lignes.push("# Vérification des calculs — 3 enfants de test");
lignes.push("");
lignes.push(
  "Préparé pour Gerson (référent médical), vérification du 20 novembre 2026."
);
lignes.push(
  "Les valeurs sont celles calculées par la base : dates PEV, z-scores OMS, statut et alertes."
);
lignes.push("");

for (const cas of ids) {
  const enfant = await client.query(
    `select c.first_name, c.birth_date, c.sex, hc.name as centre
       from children c left join health_centers hc on hc.id = c.center_id
      where c.id = $1`,
    [cas.id]
  );
  const infos = enfant.rows[0];
  const pesees = await client.query(
    `select measured_at, age_months, weight_kg, height_cm,
            z_score, height_z, bmi, bmi_z, trend, status, status_indicator
       from weigh_ins where child_id = $1 order by measured_at`,
    [cas.id]
  );
  const vaccins = await client.query(
    `select a.due_date, s.short_name, s.dose, s.contact_no
       from appointments a join vaccine_schedule s on s.id = a.schedule_id
      where a.child_id = $1 and a.status = 'planned'
      order by a.due_date limit 3`,
    [cas.id]
  );
  const alertes = await client.query(
    `select type, status from alerts where child_id = $1 order by created_at`,
    [cas.id]
  );

  lignes.push(`## ${infos.first_name} (${cas.attendu} attendu)`);
  lignes.push("");
  lignes.push(
    `- Naissance : ${new Date(infos.birth_date).toLocaleDateString("fr-FR")} · sexe : ${infos.sex} · centre : ${infos.centre}`
  );
  lignes.push("");
  lignes.push("| Date | Âge (mois) | Poids (kg) | Taille (cm) | z poids | z taille | IMC | z IMC | Tendance | Statut |");
  lignes.push("|---|---|---|---|---|---|---|---|---|---|");
  for (const p of pesees.rows) {
    const f = (v) => (v == null ? "–" : Number(v).toFixed(2).replace(".", ","));
    lignes.push(
      `| ${new Date(p.measured_at).toLocaleDateString("fr-FR")} | ${f(p.age_months)} | ${f(p.weight_kg)} | ${f(p.height_cm)} | ${f(p.z_score)} | ${f(p.height_z)} | ${f(p.bmi)} | ${f(p.bmi_z)} | ${p.trend} | ${p.status}${p.status_indicator ? ` (${p.status_indicator})` : ""} |`
    );
  }
  lignes.push("");
  lignes.push("Prochains vaccins :");
  if (vaccins.rows.length === 0) {
    lignes.push("- à jour (aucun rendez-vous planifié)");
  } else {
    for (const v of vaccins.rows) {
      lignes.push(
        `- ${new Date(v.due_date).toLocaleDateString("fr-FR")} : ${v.short_name ?? `contact ${v.contact_no}`} (dose ${v.dose})`
      );
    }
  }
  lignes.push("");
  lignes.push("Alertes ouvertes :");
  if (alertes.rows.length === 0) {
    lignes.push("- aucune");
  } else {
    for (const a of alertes.rows) {
      lignes.push(`- ${a.type} (${a.status})`);
    }
  }
  lignes.push("");
}

lignes.push("---");
lignes.push("");
lignes.push(
  "Pour chaque enfant, répondre « juste » ou indiquer l'erreur (date, z-score, alerte)."
);

const dossier = resolve("..", "docs");
mkdirSync(dossier, { recursive: true });
const fichier = resolve(dossier, "verification_gerson_20nov.md");
writeFileSync(fichier, lignes.join("\n") + "\n", "utf8");
console.log(`Rapport écrit : ${fichier}`);

await client.end();
