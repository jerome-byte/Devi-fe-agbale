"use client";

import { CalendarClock, CircleAlert, PanelLeftClose, PanelLeftOpen, Plus, ScanLine, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SESSION_EXPIREE } from "@/lib/base";
import { dateLongue } from "@/lib/dates";
import { usePrefs } from "@/lib/prefs";
import { useAuJour, useStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LogoMarque } from "./logo";
import { useCompteurs } from "./shell/compteurs";
import { GuideDemo } from "./shell/guide-demo";
import { ACCUEIL, ACTION_PRINCIPALE, liensPour, type LienNav } from "./shell/nav";
import { Palette } from "./shell/palette";
import { Topbar } from "./shell/topbar";
import { Squelette } from "./ui";

function actif(pathname: string, lien: string) {
  const href = lien.split("?")[0]; // « /messages?filtre=reponses » est actif sur /messages
  if (href === "/pilotage") return pathname === "/pilotage";
  return pathname === href || pathname.startsWith(href + "/");
}

function Marque({ replie, role }: { replie?: boolean; role: Role }) {
  return (
    <Link href={ACCUEIL[role]} className="flex min-w-0 items-center gap-2.5" aria-label="ɖevi ƒe agbalẽ, accueil">
      <LogoMarque className="size-7 shrink-0" />
      {!replie && (
        <span className="truncate text-[1.02rem] font-semibold leading-none tracking-tight text-side-fg">
          ɖevi ƒe agbalẽ
        </span>
      )}
    </Link>
  );
}

function ContenuMenu({ replie, onNaviguer, onBasculer }: { replie?: boolean; onNaviguer?: () => void; onBasculer?: () => void }) {
  const session = useStore((s) => s.session)!;
  const pathname = usePathname();
  const router = useRouter();
  const compteurs = useCompteurs();
  const action = ACTION_PRINCIPALE[session.role];

  const lien = (l: LienNav) => {
    const a = actif(pathname, l.href);
    const n = l.compteur ? compteurs[l.compteur] : 0;
    return (
      <Link
        key={l.href}
        href={l.href}
        onClick={onNaviguer}
        title={replie ? l.libelle : undefined}
        className={cn(
          "relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[0.9rem] transition-colors",
          replie && "justify-center px-0",
          a ? "bg-side-active font-medium text-white" : "text-side-fg/85 hover:bg-side-hover hover:text-side-fg",
        )}
      >
        <l.icone size={17} strokeWidth={1.9} className="shrink-0" />
        {!replie && <span className="flex-1 truncate">{l.libelle}</span>}
        {n > 0 && (
          <span
            className={cn(
              "tnum grid min-w-5 place-items-center rounded px-1 text-[0.72rem] font-semibold",
              l.compteur === "urgents" ? "bg-accent-400 text-dark-950" : "bg-white/90 text-dark-900",
              replie && "absolute -right-1 -top-1 min-w-4 text-[0.62rem]",
            )}
          >
            {n}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col bg-side">
      <div className={cn("flex h-13 shrink-0 items-center justify-between border-b border-side-line px-4", replie && "justify-center px-2")}>
        <Marque replie={replie} role={session.role} />
        {onBasculer && !replie && (
          <button onClick={onBasculer} className="grid size-7 place-items-center rounded text-side-muted hover:bg-side-hover hover:text-side-fg" aria-label="Replier le menu" title="Replier le menu">
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>
      <div className={cn("px-3 pt-3", replie && "px-2")}>
        <button
          onClick={() => {
            onNaviguer?.();
            router.push(action.href);
          }}
          title={action.libelle}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-white text-[0.9rem] font-medium text-dark-900 transition-colors hover:bg-white/90"
        >
          <Plus size={17} strokeWidth={2.4} />
          {!replie && action.libelle}
        </button>
      </div>
      <nav className={cn("flex-1 space-y-4 overflow-y-auto px-3 py-3", replie && "px-2")} aria-label="Navigation principale">
        {liensPour(session.role).map((s, i) => (
          <div key={i}>
            {s.titre && !replie && <p className="mb-1 px-2.5 text-[0.72rem] font-medium uppercase tracking-wide text-side-muted">{s.titre}</p>}
            {s.titre && replie && <div className="mx-auto mb-1.5 h-px w-5 bg-side-line" />}
            <div className="space-y-0.5">{s.liens.map(lien)}</div>
          </div>
        ))}
      </nav>
      <div className={cn("border-t border-side-line px-3 py-2.5", replie && "px-2")}>
        {!replie ? (
          <div className="rounded-md bg-side-hover px-2.5 py-2 text-[0.78rem] leading-snug text-side-muted">
            <p className="font-medium text-side-fg">{session.lieu}</p>
            Données de démonstration
          </div>
        ) : null}
        {onBasculer && replie && (
          <button onClick={onBasculer} className="flex h-9 w-full items-center justify-center rounded-md text-side-muted hover:bg-side-hover hover:text-side-fg" aria-label="Déplier le menu" title="Déplier le menu">
            <PanelLeftOpen size={17} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Erreur de la base ou du backend (mode base uniquement). */
function BandeauErreur() {
  const erreur = useStore((s) => s.erreur);
  const effacer = useStore((s) => s.effacerErreur);
  if (!erreur) return null;
  return (
    <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-clay-200 bg-clay-50 px-3 py-2 text-[0.9rem] text-clay-800">
      <CircleAlert size={17} className="mt-0.5 shrink-0" />
      <p className="flex-1 break-words">{erreur}</p>
      <button onClick={effacer} aria-label="Fermer" className="rounded p-0.5 hover:bg-clay-100">
        <X size={16} />
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrate = useStore((s) => s.hydrate);
  const session = useStore((s) => s.session);
  const replie = usePrefs((s) => s.menuReplie);
  const basculer = usePrefs((s) => s.basculerMenu);
  const router = useRouter();
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);
  const [palette, setPalette] = useState(false);
  const [guide, setGuide] = useState(false);
  const [cheminPrec, setCheminPrec] = useState(pathname);

  if (cheminPrec !== pathname) {
    setCheminPrec(pathname);
    setMobile(false);
  }

  // Page à rouvrir après une reconnexion forcée (session refusée par le serveur).
  const retourApres = useRef<string | null>(null);
  useEffect(() => {
    if (hydrate && !session) router.replace(retourApres.current ? `/connexion?suite=${encodeURIComponent(retourApres.current)}` : "/connexion");
  }, [hydrate, session, router]);

  // Session refusée par le serveur (expirée, ou fermée sur un autre appareil) :
  // on se déconnecte proprement, puis on revient sur la même page après la reconnexion.
  useEffect(() => {
    const expiree = () => {
      retourApres.current = window.location.pathname;
      useStore.getState().deconnecter();
    };
    window.addEventListener(SESSION_EXPIREE, expiree);
    return () => window.removeEventListener(SESSION_EXPIREE, expiree);
  }, []);

  // Le pilotage ne voit que ses pages (statistiques, structures, comptes, annonces) :
  // il n'inscrit pas d'enfant et n'ouvre aucun dossier. Les agents et éducatrices
  // n'ont pas accès aux pages du pilotage.
  const horsPerimetre = session && ((session.role === "pilotage") !== (pathname === "/pilotage" || pathname.startsWith("/pilotage/")));
  useEffect(() => {
    if (session && horsPerimetre) router.replace(ACCUEIL[session.role]);
  }, [session, horsPerimetre, router]);

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((o) => !o);
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, []);

  if (!hydrate || !session || horsPerimetre) {
    return (
      <div className="space-y-3 p-6">
        <Squelette className="h-8 w-56" />
        <Squelette className="h-24" />
        <Squelette className="h-72" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <a href="#contenu" className="sr-only z-[100] rounded-md bg-primary-600 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Aller au contenu
      </a>

      <aside className={cn("fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-150 lg:block", replie ? "w-15" : "w-58")}>
        <ContenuMenu replie={replie} onBasculer={basculer} />
      </aside>

      {mobile && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-black/50" onClick={() => setMobile(false)} />
          <aside className="relative h-full w-[min(17rem,85vw)] animate-slide-in-left shadow-2xl">
            <button onClick={() => setMobile(false)} className="absolute right-2 top-3 z-10 grid size-8 place-items-center rounded text-side-muted hover:bg-side-hover" aria-label="Fermer le menu">
              <X size={18} />
            </button>
            <ContenuMenu onNaviguer={() => setMobile(false)} />
          </aside>
        </div>
      )}

      <div className={cn("flex min-h-screen flex-col transition-[padding] duration-150", replie ? "lg:pl-15" : "lg:pl-58")}>
        <Topbar onMenu={() => setMobile(true)} onRecherche={() => setPalette(true)} onGuide={() => setGuide(true)} />
        <BandeauSimulation />
        <main id="contenu" className="w-full flex-1 px-4 py-4 sm:px-5 lg:px-6">
          <BandeauErreur />
          <div key={pathname} className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {session.role !== "pilotage" && pathname !== "/scan" && (
        <Link
          href="/scan"
          className="fixed bottom-4 right-4 z-30 grid size-14 place-items-center rounded-full bg-primary-600 text-white shadow-lg shadow-primary-900/30 lg:hidden"
          aria-label="Scanner une carte"
        >
          <ScanLine size={24} />
        </Link>
      )}

      <Palette ouvert={palette} onFermer={() => setPalette(false)} />
      <GuideDemo ouvert={guide} onFermer={() => setGuide(false)} />
    </div>
  );
}

function BandeauSimulation() {
  const decalage = useStore((s) => s.decalageJours);
  const revenir = useStore((s) => s.revenirAujourdhui);
  const auJour = useAuJour();
  if (!decalage) return null;
  return (
    <div className="sticky top-13 z-20 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-warn/20 bg-warn-soft px-4 py-1.5 text-[0.85rem] text-warn sm:px-5 lg:px-6">
      <CalendarClock size={15} className="shrink-0" />
      <span className="first-letter:uppercase">
        Avance rapide : <strong className="font-semibold">{dateLongue(auJour)}</strong> ({decalage > 0 ? "+" : ""}
        {decalage} jours)
      </span>
      <button onClick={revenir} className="ml-auto rounded px-2 py-0.5 font-medium underline-offset-2 hover:underline">
        Revenir à aujourd&apos;hui
      </button>
    </div>
  );
}
