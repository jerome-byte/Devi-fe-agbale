// Service worker de ɖevi ƒe agbalẽ.
//
// Rôle : rendre l'application installable et garder les fichiers statiques (code, icônes,
// images, audios) pour un démarrage rapide avec une connexion faible.
// Aucune donnée d'enfant n'est mise en cache : les appels à Supabase et à /api/ passent
// toujours par le réseau.

const CACHE = "devi-statique-v2";
const STATIQUES = ["/_next/static/", "/icons/", "/images/", "/voix/"];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

const PAGE_HORS_LIGNE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hors connexion · ɖevi ƒe agbalẽ</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#102b49;color:#fff;text-align:center;padding:24px}
img{width:96px;height:96px;border-radius:22px}h1{font-size:1.3rem;margin:20px 0 8px}p{opacity:.8;max-width:22rem;margin:0 auto 20px}
button{font:inherit;font-weight:600;border:0;border-radius:8px;padding:10px 18px;background:#fff;color:#102b49}</style></head>
<body><div><img src="/icons/icon-192-v2.png" alt=""><h1>Pas de connexion</h1><p>ɖevi ƒe agbalẽ a besoin d'Internet pour afficher les carnets. Réessayez dès que le réseau revient.</p>
<button onclick="location.reload()">Réessayer</button></div></body></html>`;

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Pages : toujours le réseau ; page d'attente si la connexion est coupée.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => new Response(PAGE_HORS_LIGNE, { headers: { "content-type": "text/html; charset=utf-8" } })),
    );
    return;
  }

  // Fichiers statiques : le cache d'abord, puis le réseau.
  if (STATIQUES.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const enCache = await cache.match(req);
        if (enCache) return enCache;
        const reponse = await fetch(req);
        if (reponse.ok && reponse.status === 200) cache.put(req, reponse.clone());
        return reponse;
      }),
    );
  }
});
