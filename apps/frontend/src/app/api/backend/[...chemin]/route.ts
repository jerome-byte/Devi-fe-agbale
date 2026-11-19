// Relais vers le backend FastAPI. Le jeton BACKEND_TOKEN reste côté serveur :
// le navigateur appelle /api/backend/..., jamais le backend directement.
import { NextResponse, type NextRequest } from "next/server";

// Seules ces routes du backend sont accessibles depuis l'application.
const AUTORISEES = [/^app\//, /^admin\/demo\//, /^simulation\/reponse$/];

async function relayer(req: NextRequest, { params }: { params: Promise<{ chemin: string[] }> }) {
  const url = process.env.BACKEND_URL;
  const jeton = process.env.BACKEND_TOKEN;
  if (!url || !jeton) {
    return NextResponse.json({ detail: "BACKEND_URL ou BACKEND_TOKEN non configuré" }, { status: 503 });
  }
  const chemin = (await params).chemin.map(encodeURIComponent).join("/");
  if (!AUTORISEES.some((r) => r.test(chemin))) {
    return NextResponse.json({ detail: "route non autorisée" }, { status: 404 });
  }
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/${chemin}`, {
      method: req.method,
      headers: { "content-type": "application/json", authorization: `Bearer ${jeton}` },
      body: await req.text(),
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

export { relayer as POST, relayer as PATCH };
