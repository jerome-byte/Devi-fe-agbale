// Relais vers le backend FastAPI. Le jeton BACKEND_TOKEN reste côté serveur :
// le navigateur appelle /api/backend/..., jamais le backend directement.
//
// Sécurité : le relais n'accepte que les utilisateurs connectés (session Supabase),
// et seulement les routes permises par leur rôle (table profiles). Il transmet au backend
// l'identifiant de l'utilisateur (en-tête x-devi-utilisateur), vérifié ici.
// Structures et comptes : pilotage seulement.
import { NextResponse, type NextRequest } from "next/server";

type Role = "agent" | "educatrice" | "pilotage" | "admin";

// Routes du backend accessibles depuis l'application, et rôles autorisés.
const AUTORISEES: { motif: RegExp; roles: Role[] }[] = [
  { motif: /^app\//, roles: ["agent", "educatrice", "admin"] },
  { motif: /^admin\/demo\//, roles: ["agent", "educatrice", "pilotage", "admin"] },
  { motif: /^simulation\/reponse$/, roles: ["agent", "educatrice", "pilotage", "admin"] },
  { motif: /^admin\/(structures|comptes)(\/|$)/, roles: ["pilotage", "admin"] },
];

/** Vérifie le jeton de session auprès de Supabase et lit le rôle de l'utilisateur (compte actif seulement). */
async function utilisateurDe(req: NextRequest): Promise<{ id: string; role: Role } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const auth = req.headers.get("authorization");
  if (!url || !cle || !auth?.startsWith("Bearer ")) return null;
  const entetes = { apikey: cle, authorization: auth };
  try {
    const u = await fetch(`${url}/auth/v1/user`, { headers: entetes, cache: "no-store" });
    if (!u.ok) return null;
    const { id } = (await u.json()) as { id?: string };
    if (!id) return null;
    const p = await fetch(`${url}/rest/v1/profiles?select=*&id=eq.${encodeURIComponent(id)}`, { headers: entetes, cache: "no-store" });
    if (!p.ok) return null;
    const lignes = (await p.json()) as { role?: Role; active?: boolean }[];
    const role = lignes[0]?.role;
    if (!role || lignes[0].active === false) return null;
    return { id, role };
  } catch {
    return null;
  }
}

async function relayer(req: NextRequest, { params }: { params: Promise<{ chemin: string[] }> }) {
  const url = process.env.BACKEND_URL;
  const jeton = process.env.BACKEND_TOKEN;
  if (!url || !jeton) {
    return NextResponse.json({ detail: "BACKEND_URL ou BACKEND_TOKEN non configuré" }, { status: 503 });
  }
  const chemin = (await params).chemin.map(encodeURIComponent).join("/");
  const regle = AUTORISEES.find((r) => r.motif.test(chemin));
  if (!regle) {
    return NextResponse.json({ detail: "route non autorisée" }, { status: 404 });
  }
  const utilisateur = await utilisateurDe(req);
  if (!utilisateur) {
    return NextResponse.json({ detail: "connexion requise" }, { status: 401 });
  }
  if (!regle.roles.includes(utilisateur.role)) {
    return NextResponse.json({ detail: "action non permise pour ce compte" }, { status: 403 });
  }
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/${chemin}${req.nextUrl.search}`, {
      method: req.method,
      headers: { "content-type": "application/json", authorization: `Bearer ${jeton}`, "x-devi-utilisateur": utilisateur.id },
      body: req.method === "GET" ? undefined : await req.text(),
      cache: "no-store",
    });
    return new NextResponse(await r.text(), {
      status: r.status,
      headers: { "content-type": r.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    // Render (offre gratuite) met le service en veille : le premier appel peut échouer.
    return NextResponse.json({ detail: "backend injoignable" }, { status: 502 });
  }
}

export { relayer as GET, relayer as POST, relayer as PATCH };
