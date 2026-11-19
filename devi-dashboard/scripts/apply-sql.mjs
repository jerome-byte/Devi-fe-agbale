#!/usr/bin/env node
// scripts/apply-sql.mjs
// Exécute un ou plusieurs fichiers .sql sur la base Supabase du projet, sans
// passer par le SQL Editor (qui refuse les fichiers volumineux comme le seed
// de démonstration : 1,6 Mo et près de 12 000 lignes).
//
// Usage :
//   npm run db:init                       # schéma + vues + règles + seed, dans l'ordre
//   npm run db:sql -- ../sql/02_views.sql
//
// Connexion, par ordre de priorité :
//   1. SUPABASE_DB_URL (chaîne complète, ex. postgresql://postgres.ref:motdepasse@host:5432/postgres)
//   2. SUPABASE_POOLER_HOST dans .env.local, puis mot de passe dans
//      supabase_passwoed.txt ou SUPABASE_DB_PASSWORD
//   3. sinon, détection automatique de la région du pooler
//
// Pourquoi le pooler : la connexion directe db.<ref>.supabase.co est en IPv6
// seul et échoue sur la plupart des réseaux locaux.

import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import pg from "pg";

const REGIONS = [
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-central-1",
  "eu-central-2",
  "eu-north-1",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "ca-central-1",
  "sa-east-1",
  "ap-south-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ap-northeast-2",
];

// Les projets Supabase sont hébergés soit sur aws-0-<région>, soit sur
// aws-1-<région> selon leur date de création.
const HOTES = REGIONS.flatMap((region) => [
  `aws-1-${region}.pooler.supabase.com`,
  `aws-0-${region}.pooler.supabase.com`,
]);

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

const fichiers = process.argv.slice(2);
if (fichiers.length === 0) {
  console.error("Usage : npm run db:sql -- <fichier.sql> [autre.sql ...]");
  process.exit(1);
}

const env = lireEnv();
const baseUrl = process.env.SUPABASE_DB_URL ?? env.SUPABASE_DB_URL ?? null;
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;

if (!baseUrl && !supabaseUrl) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL manque dans .env.local (ou définissez SUPABASE_DB_URL)."
  );
  process.exit(1);
}

const motDePasse =
  process.env.SUPABASE_DB_PASSWORD ??
  (existsSync("supabase_passwoed.txt")
    ? readFileSync("supabase_passwoed.txt", "utf8").trim()
    : null);

let ref = null;
if (!baseUrl) {
  ref = new URL(supabaseUrl).host.split(".")[0];
  if (!motDePasse) {
    console.error(
      "Mot de passe introuvable : créez supabase_passwoed.txt ou définissez SUPABASE_DB_PASSWORD."
    );
    process.exit(1);
  }
}

function optionsConnexion(host) {
  if (baseUrl) {
    return {
      connectionString: baseUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15_000,
    };
  }
  return {
    host,
    port: Number(env.SUPABASE_POOLER_PORT ?? 5432),
    user: `postgres.${ref}`,
    password: motDePasse,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 6_000,
  };
}

async function essayer(host) {
  const client = new pg.Client(optionsConnexion(host));
  try {
    await client.connect();
    return client;
  } catch (erreur) {
    try {
      await client.end();
    } catch {
      /* connexion déjà fermée */
    }
    return erreur;
  }
}

async function seConnecter() {
  if (baseUrl) {
    const resultat = await essayer(null);
    if (resultat instanceof Error) {
      console.error(`Connexion impossible via SUPABASE_DB_URL : ${resultat.message}`);
      process.exit(1);
    }
    return { client: resultat, hote: "SUPABASE_DB_URL" };
  }

  const hoteForce = env.SUPABASE_POOLER_HOST;
  const candidats = hoteForce ? [hoteForce] : HOTES;

  for (const hote of candidats) {
    const resultat = await essayer(hote);
    if (!(resultat instanceof Error)) {
      return { client: resultat, hote };
    }
    const tenantInconnu = /tenant\/user|not found/i.test(resultat.message);
    if (!tenantInconnu) {
      if (/password authentication failed/i.test(resultat.message)) {
        console.error(
          `Projet trouvé sur ${hote}, mais le mot de passe est refusé.\n` +
            "Mettez à jour supabase_passwoed.txt (ou SUPABASE_DB_PASSWORD), puis relancez.\n" +
            `Pour éviter la détection la prochaine fois : SUPABASE_POOLER_HOST=${hote}`
        );
      } else {
        console.error(`Connexion impossible sur ${hote} : ${resultat.message}`);
      }
      process.exit(1);
    }
  }

  console.error(
    "Aucun pooler Supabase n'a reconnu ce projet. Vérifiez NEXT_PUBLIC_SUPABASE_URL " +
      "ou renseignez SUPABASE_POOLER_HOST dans .env.local."
  );
  process.exit(1);
}

const { client, hote } = await seConnecter();
console.log(`Connexion : ${hote}`);

for (const fichier of fichiers) {
  const chemin = resolve(fichier);
  if (!existsSync(chemin)) {
    console.error(`Fichier introuvable : ${chemin}`);
    process.exitCode = 1;
    break;
  }

  const sql = readFileSync(chemin, "utf8");
  const debut = Date.now();

  try {
    await client.query(sql);
    const secondes = ((Date.now() - debut) / 1000).toFixed(1);
    console.log(
      `OK   ${basename(chemin)} (${sql.split("\n").length} lignes, ${secondes} s)`
    );
  } catch (erreur) {
    const ligne = erreur.position
      ? sql.slice(0, Number(erreur.position)).split("\n").length
      : null;
    console.error(
      `FAIL ${basename(chemin)} : ${erreur.code ?? ""} ${erreur.message}${
        ligne ? ` (ligne ${ligne})` : ""
      }`
    );
    process.exitCode = 1;
    break;
  }
}

await client.end();
