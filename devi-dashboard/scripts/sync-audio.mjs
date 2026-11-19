#!/usr/bin/env node
// scripts/sync-audio.mjs
// Copie les audios éwé dans public/ et régénère lib/catalogue.json avec des
// chemins servis par l'application (/audio/messages/<fichier>.ogg).
//
// Usage : npm run audio:sync
// À relancer si Jérôme régénère les audios ou modifie le catalogue.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const source = resolve("..", "voix", "audio", "messages", "index_messages.json");
if (!existsSync(source)) {
  console.error(`Catalogue introuvable : ${source}`);
  process.exit(1);
}

const index = JSON.parse(readFileSync(source, "utf8"));
const sortie = resolve("public", "audio", "messages");
mkdirSync(sortie, { recursive: true });

let copies = 0;
let manquants = 0;

for (const message of index.messages) {
  for (const audio of message.audios) {
    const fichier = basename(audio.ogg);
    const origine = resolve("..", "voix", "audio", "messages", fichier);
    if (!existsSync(origine)) {
      console.error(`Audio manquant : ${fichier}`);
      manquants += 1;
      continue;
    }
    copyFileSync(origine, resolve(sortie, fichier));
    audio.ogg = `/audio/messages/${fichier}`;
    delete audio.wav;
    copies += 1;
  }
}

writeFileSync(resolve("lib", "catalogue.json"), JSON.stringify(index, null, 2), "utf8");

console.log(`${copies} audios copiés dans public/audio/messages`);
console.log(`Catalogue écrit : lib/catalogue.json (${index.messages.length} messages)`);
if (manquants > 0) process.exitCode = 1;
