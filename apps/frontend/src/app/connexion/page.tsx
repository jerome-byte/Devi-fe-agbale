"use client";

import { ArrowLeft, BarChart3, ChevronRight, HeartPulse, Info, LockKeyhole, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { LogoMarque } from "@/components/logo";
import { ACCUEIL, LIBELLE_ROLE } from "@/components/shell/nav";
import { EMAILS_DEMO, MODE_BASE, seConnecter } from "@/lib/base";
import { COMPTES_DEMO, useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

const ROLES: { role: Role; icone: typeof HeartPulse; texte: string }[] = [
  { role: "agent", icone: HeartPulse, texte: "Inscrire, scanner une carte, voir qui appeler en premier." },
  { role: "educatrice", icone: Store, texte: "Pointer les arrivées, mesurer, faire les dépistages du mois." },
  { role: "pilotage", icone: BarChart3, texte: "Couverture, abandons, actes manquants et annonces vocales." },
];

/** Mode base : vraie connexion (Supabase Auth). Le rôle vient du compte, pas d'un bouton. */
function FormulaireConnexion() {
  const ouvrirSession = useStore((s) => s.ouvrirSession);
  const router = useRouter();
  const params = useSearchParams();
  const roleDemande = params.get("role") as Role | null;
  const suite = params.get("suite");
  const [email, setEmail] = useState(roleDemande && EMAILS_DEMO[roleDemande] ? EMAILS_DEMO[roleDemande] : "");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const valider = async (e: FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const session = await seConnecter(email, motDePasse);
      ouvrirSession(session);
      router.push(suite && suite.startsWith("/") ? suite : ACCUEIL[session.role]);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : String(err));
      setEnvoi(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-semibold">Se connecter</h1>
      <p className="mt-1 text-muted">Chaque compte voit uniquement ce dont il a besoin : l&apos;espace s&apos;ouvre selon votre rôle.</p>

      <form onSubmit={valider} className="mt-6 space-y-4">
        <label className="block">
          <span className="label">Adresse e-mail</span>
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </label>
        <label className="block">
          <span className="label">Mot de passe</span>
          <input type="password" required autoComplete="current-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} className="input" />
        </label>
        {erreur && <p className="rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-[0.88rem] text-danger">{erreur}</p>}
        <button type="submit" disabled={envoi} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary-600 font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60">
          <LockKeyhole size={17} /> {envoi ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <div className="mt-6 rounded-lg border border-line">
        <p className="border-b border-line px-4 py-2.5 text-[0.85rem] font-medium">Comptes de test (jury)</p>
        <ul className="divide-y divide-line">
          {ROLES.map((r) => (
            <li key={r.role}>
              <button type="button" onClick={() => setEmail(EMAILS_DEMO[r.role])} className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-card-muted">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand-soft text-brand-fg">
                  <r.icone size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9rem] font-medium">{LIBELLE_ROLE[r.role]}</span>
                  <span className="block truncate text-[0.82rem] text-muted">{EMAILS_DEMO[r.role]}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-muted group-hover:text-brand-fg" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-5 flex items-start gap-2 text-[0.85rem] text-muted">
        <Info size={15} className="mt-0.5 shrink-0" />
        Le mot de passe des comptes de test figure dans les notes du dépôt. Enfants, mères et numéros sont fictifs.
      </p>
    </>
  );
}

export default function Connexion() {
  const connecter = useStore((s) => s.connecter);
  const router = useRouter();

  const entrer = (r: Role) => {
    connecter(r);
    router.push(ACCUEIL[r]);
  };

  return (
    <div className="grid min-h-screen bg-card lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-dark-900 lg:block">
        <Image src="/images/mere-bebe.jpg" alt="" fill priority sizes="45vw" className="object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-900/70 to-dark-900/40" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link href="/" className="flex items-center gap-3">
            <LogoMarque className="size-9" />
            <span className="font-vitrine text-xl font-bold text-white">ɖevi ƒe agbalẽ</span>
          </Link>
          <div className="max-w-md">
            <p className="text-[1.6rem] font-semibold leading-snug text-white">Le carnet vivant de chaque enfant, de la naissance à 6 ans.</p>
            <p className="mt-3 text-white/65">Vaccins, croissance, acte de naissance et rappels vocaux en éwé, pour les centres de santé et les garderies de Lomé.</p>
          </div>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col px-5 py-8 sm:px-12">
        <Link href="/" className="inline-flex w-fit items-center gap-1.5 text-[0.88rem] text-muted hover:text-fg">
          <ArrowLeft size={15} /> Retour au site
        </Link>
        <div className="flex w-full max-w-md flex-1 flex-col justify-center py-10 sm:mx-auto lg:mx-0 lg:ml-[10%]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <LogoMarque className="size-8" />
            <span className="font-vitrine text-xl font-bold">ɖevi ƒe agbalẽ</span>
          </div>
          {MODE_BASE ? (
            <Suspense fallback={null}>
              <FormulaireConnexion />
            </Suspense>
          ) : (
          <>
          <h1 className="text-2xl font-semibold">Choisir un compte de démonstration</h1>
          <p className="mt-1 text-muted">Chaque compte voit uniquement ce dont il a besoin. Vous pourrez en changer à tout moment depuis le menu du compte.</p>

          <ul className="mt-6 divide-y divide-line overflow-hidden rounded-lg border border-line">
            {ROLES.map((r) => {
              const c = COMPTES_DEMO[r.role];
              return (
                <li key={r.role}>
                  <button onClick={() => entrer(r.role)} className="group flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-card-muted">
                    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-soft text-brand-fg">
                      <r.icone size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{LIBELLE_ROLE[r.role]}</span>
                      <span className="block text-[0.85rem] text-muted">
                        {c.nom} · {c.lieu}
                      </span>
                      <span className="mt-0.5 block text-[0.85rem] text-fg-soft">{r.texte}</span>
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-fg" />
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="mt-5 flex items-start gap-2 text-[0.85rem] text-muted">
            <Info size={15} className="mt-0.5 shrink-0" />
            Enfants, mères et numéros sont fictifs. Vos actions restent dans ce navigateur.
          </p>
          </>
          )}
        </div>
      </main>
    </div>
  );
}
