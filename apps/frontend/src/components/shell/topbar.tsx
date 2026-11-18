"use client";

import {
  Bell,
  Check,
  ChevronDown,
  LogOut,
  Menu as IconeMenu,
  Monitor,
  Moon,
  Play,
  RotateCcw,
  Search,
  Sun,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { heure } from "@/lib/dates";
import { usePrefs, type Theme } from "@/lib/prefs";
import { COMPTES_DEMO, useStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LogoMarque } from "../logo";
import { Avatar, useFermetureExterieure } from "../ui";
import { useCompteurs } from "./compteurs";
import { ACCUEIL, LIBELLE_ROLE } from "./nav";

function Popover({ ouvert, children, className }: { ouvert: boolean; children: ReactNode; className?: string }) {
  if (!ouvert) return null;
  return <div className={cn("absolute right-0 top-full z-50 mt-1.5 origin-top-right animate-scale-in rounded-md border border-line bg-card shadow-lg", className)}>{children}</div>;
}

const THEMES: { valeur: Theme; libelle: string; icone: LucideIcon }[] = [
  { valeur: "light", libelle: "Clair", icone: Sun },
  { valeur: "dark", libelle: "Sombre", icone: Moon },
  { valeur: "system", libelle: "Automatique", icone: Monitor },
];

function ChoixTheme() {
  const theme = usePrefs((s) => s.theme);
  const setTheme = usePrefs((s) => s.setTheme);
  const [ouvert, setOuvert] = useState(false);
  const ref = useFermetureExterieure<HTMLDivElement>(ouvert, () => setOuvert(false));
  const Actuel = theme === "system" ? Monitor : theme === "dark" ? Moon : Sun;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOuvert(!ouvert)} className="grid size-9 place-items-center rounded-md text-fg-soft hover:bg-card-muted hover:text-fg" aria-label="Thème clair ou sombre" title="Thème clair ou sombre">
        <Actuel size={18} />
      </button>
      <Popover ouvert={ouvert} className="w-52 p-1.5">
        <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-muted">Apparence</p>
        {THEMES.map((t) => (
          <button
            key={t.valeur}
            onClick={() => {
              setTheme(t.valeur);
              setOuvert(false);
            }}
            className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left font-medium", theme === t.valeur ? "bg-brand-soft text-brand-fg" : "text-fg hover:bg-card-muted")}
          >
            <t.icone size={17} />
            <span className="flex-1">{t.libelle}</span>
            {theme === t.valeur && <Check size={16} />}
          </button>
        ))}
      </Popover>
    </div>
  );
}

function Notifications() {
  const [ouvert, setOuvert] = useState(false);
  const ref = useFermetureExterieure<HTMLDivElement>(ouvert, () => setOuvert(false));
  const session = useStore((s) => s.session)!;
  const enfants = useStore((s) => s.enfants);
  const { recentes, urgents, reponses } = useCompteurs();
  const router = useRouter();
  const total = reponses + (urgents ? 1 : 0);
  if (session.role === "pilotage") return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOuvert(!ouvert)}
        className="relative grid size-9 place-items-center rounded-md text-fg-soft hover:bg-card-muted hover:text-fg"
        aria-label={`Notifications${total ? `, ${total} à voir` : ""}`}
        title="Notifications"
      >
        <Bell size={18} />
        {total > 0 && <span className="tnum absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[0.62rem] font-semibold text-white ring-2 ring-card">{total}</span>}
      </button>
      <Popover ouvert={ouvert} className="w-[min(24rem,calc(100vw-1.5rem))] max-sm:fixed max-sm:right-3 max-sm:top-14">
        <div className="border-b border-line px-4 py-2.5">
          <p className="font-semibold">Notifications</p>
          <p className="text-sm text-muted">{urgents ? `${urgents} enfants à appeler en priorité` : "Rien d'urgent"}</p>
        </div>
        <ul className="max-h-[22rem] overflow-y-auto py-1">
          {urgents > 0 && (
            <li>
              <button
                onClick={() => {
                  setOuvert(false);
                  router.push("/enfants?filtre=urgent");
                }}
                className="flex w-full gap-3 px-4 py-2.5 text-left hover:bg-card-muted"
              >
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-danger" />
                <span className="text-[0.92rem]">
                  <span className="font-semibold">{urgents} enfants</span> ont un vaccin manqué ou une courbe à surveiller.
                </span>
              </button>
            </li>
          )}
          {recentes.map((m) => {
            const e = enfants.find((x) => x.id === m.enfantId);
            if (!e) return null;
            return (
              <li key={m.id}>
                <button
                  onClick={() => {
                    setOuvert(false);
                    router.push(`/enfant/${e.id}`);
                  }}
                  className="flex w-full gap-3 px-4 py-2.5 text-left hover:bg-card-muted"
                >
                  <span className={cn("tnum grid size-7 shrink-0 place-items-center rounded font-semibold", m.reponse === "1" ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger")}>{m.reponse}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.92rem] font-medium">
                      {e.prenom} {e.nom}
                    </span>
                    <span className="block text-sm text-muted">
                      {m.reponse === "1" ? "La mère viendra au centre" : "La mère a un empêchement"} · {heure(m.date)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {!recentes.length && !urgents && <li className="px-5 py-8 text-center text-muted">Aucune notification</li>}
        </ul>
        <Link href="/messages" onClick={() => setOuvert(false)} className="block border-t border-line px-4 py-2 text-center text-[0.85rem] font-medium text-brand-fg hover:bg-card-muted">
          Voir le journal des messages
        </Link>
      </Popover>
    </div>
  );
}

function MenuCompte() {
  const session = useStore((s) => s.session)!;
  const connecter = useStore((s) => s.connecter);
  const deconnecter = useStore((s) => s.deconnecter);
  const reinitialiser = useStore((s) => s.reinitialiser);
  const [ouvert, setOuvert] = useState(false);
  const [confirme, setConfirme] = useState(false);
  const ref = useFermetureExterieure<HTMLDivElement>(ouvert, () => {
    setOuvert(false);
    setConfirme(false);
  });
  const router = useRouter();

  const changer = (r: Role) => {
    connecter(r);
    setOuvert(false);
    router.push(ACCUEIL[r]);
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOuvert(!ouvert)} className="flex items-center gap-2 rounded-md p-1 pr-1.5 hover:bg-card-muted" aria-label="Mon compte">
        <Avatar prenom={session.nom} taille="sm" />
        <span className="hidden text-left leading-tight xl:block">
          <span className="block text-[0.85rem] font-medium text-fg">{session.nom}</span>
          <span className="block text-xs text-muted">{LIBELLE_ROLE[session.role]}</span>
        </span>
        <ChevronDown size={16} className="hidden text-muted xl:block" />
      </button>
      <Popover ouvert={ouvert} className="w-72 p-1.5">
        <div className="flex items-center gap-3 px-3 py-3">
          <Avatar prenom={session.nom} taille="lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{session.nom}</p>
            <p className="truncate text-sm text-muted">
              {session.fonction}, {session.lieu}
            </p>
          </div>
        </div>
        <div className="my-1 h-px bg-line" />
        <p className="px-3 pb-1 pt-1.5 text-xs font-bold uppercase tracking-wider text-muted">Changer de compte</p>
        {(Object.keys(COMPTES_DEMO) as Role[]).map((r) => (
          <button
            key={r}
            onClick={() => changer(r)}
            className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left", r === session.role ? "bg-brand-soft text-brand-fg" : "text-fg hover:bg-card-muted")}
          >
            <UserRound size={17} className={r === session.role ? "" : "text-muted"} />
            <span className="flex-1">
              <span className="block text-[0.9rem] font-medium">{LIBELLE_ROLE[r]}</span>
              <span className="block text-xs text-muted">{COMPTES_DEMO[r].nom}</span>
            </span>
            {r === session.role && <Check size={16} />}
          </button>
        ))}
        <div className="my-1 h-px bg-line" />
        {confirme ? (
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="flex-1 text-sm text-muted">Recharger les données fictives ?</span>
            <button
              onClick={() => {
                reinitialiser();
                setConfirme(false);
                setOuvert(false);
              }}
              className="rounded-md bg-red-700 px-2.5 py-1 text-sm font-medium text-white hover:bg-red-800"
            >
              Oui
            </button>
            <button onClick={() => setConfirme(false)} className="rounded-md border border-line-strong px-2.5 py-1 text-sm font-medium hover:bg-card-muted">
              Non
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirme(true)} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left font-medium text-fg hover:bg-card-muted">
            <RotateCcw size={17} className="text-muted" />
            Réinitialiser la démo
          </button>
        )}
        <button
          onClick={() => {
            deconnecter();
            router.push("/connexion");
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left font-medium text-danger hover:bg-danger-soft"
        >
          <LogOut size={17} />
          Se déconnecter
        </button>
      </Popover>
    </div>
  );
}

export function Topbar({ onMenu, onRecherche, onGuide }: { onMenu: () => void; onRecherche: () => void; onGuide: () => void }) {
  return (
    <div className="sticky top-0 z-30 border-b border-line bg-card">
      <div className="flex h-13 items-center gap-2 px-3 sm:px-5 lg:px-6">
        <button onClick={onMenu} className="grid size-9 place-items-center rounded-md text-fg-soft hover:bg-card-muted lg:hidden" aria-label="Ouvrir le menu">
          <IconeMenu size={20} />
        </button>
        <LogoMarque className="size-7 lg:hidden" />

        <button
          onClick={onRecherche}
          className="ml-auto flex h-9 items-center gap-2 rounded-md border border-line bg-card-muted px-3 text-[0.9rem] text-muted transition-colors hover:border-line-strong hover:text-fg sm:w-64 lg:ml-0 lg:w-80"
          aria-label="Rechercher un enfant ou une page"
        >
          <Search size={16} />
          <span className="hidden flex-1 truncate text-left sm:block">Rechercher un enfant, une page...</span>
          <kbd className="hidden rounded border border-line-strong bg-card px-1.5 font-sans text-[0.72rem] md:block">Ctrl K</kbd>
        </button>

        <div className="flex items-center gap-1 lg:ml-auto">
          <button onClick={onGuide} className="hidden h-9 items-center gap-2 rounded-md bg-brand-soft px-3 text-[0.88rem] font-medium text-brand-fg hover:bg-primary-100 sm:flex dark:hover:bg-primary-900/60" title="Les 5 étapes de la démo">
            <Play size={14} className="fill-current" />
            Parcours de démo
          </button>
          <button onClick={onGuide} className="grid size-9 place-items-center rounded-md text-brand-fg hover:bg-card-muted sm:hidden" aria-label="Parcours de démo">
            <Play size={16} className="fill-current" />
          </button>
          <ChoixTheme />
          <Notifications />
          <MenuCompte />
        </div>
      </div>
    </div>
  );
}
