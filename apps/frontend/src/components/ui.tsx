"use client";

import { ChevronLeft, ChevronRight, Loader2, MoreHorizontal, Search, X, type LucideIcon } from "lucide-react";
import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react";
import Link from "next/link";
import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import { cn, couleurDe, initiales } from "@/lib/utils";

/* ------------------------------------------------------------------ boutons */

export type Variante = "primaire" | "secondaire" | "contour" | "fantome" | "doux" | "danger" | "accent";
export type Taille = "sm" | "md" | "lg" | "icone";

const VARIANTES: Record<Variante, string> = {
  primaire: "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 dark:bg-primary-500 dark:hover:bg-primary-600",
  secondaire: "border border-line-strong bg-card text-fg hover:bg-card-muted",
  contour: "border border-primary-600/50 text-brand-fg hover:bg-brand-soft dark:border-primary-400/50",
  fantome: "text-fg-soft hover:bg-card-muted hover:text-fg",
  doux: "bg-brand-soft text-brand-fg hover:bg-primary-100 dark:hover:bg-primary-900/60",
  danger: "bg-red-700 text-white hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-700",
  accent: "bg-accent-400 text-dark-950 hover:bg-accent-300",
};

const TAILLES: Record<Taille, string> = {
  sm: "h-8 px-2.5 text-[0.85rem] gap-1.5 rounded-md",
  md: "h-10 px-3.5 text-[0.92rem] gap-2 rounded-md",
  lg: "h-11 px-5 text-[0.95rem] gap-2 rounded-md",
  icone: "h-9 w-9 rounded-md justify-center",
};

const classesBouton = (v: Variante, t: Taille, c?: string) =>
  cn(
    "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-colors duration-100 disabled:pointer-events-none disabled:opacity-50",
    VARIANTES[v],
    TAILLES[t],
    c,
  );

type Commun = {
  variante?: Variante;
  taille?: Taille;
  icone?: LucideIcon;
  iconeDroite?: LucideIcon;
  chargement?: boolean;
  className?: string;
  children?: ReactNode;
};

export const Bouton = forwardRef<HTMLButtonElement, Commun & React.ButtonHTMLAttributes<HTMLButtonElement>>(function Bouton(
  { variante = "primaire", taille = "md", icone: Icone, iconeDroite: IconeD, chargement, className, children, type = "button", disabled, ...rest },
  ref,
) {
  const s = taille === "sm" ? 15 : taille === "lg" ? 18 : 17;
  return (
    <button ref={ref} type={type} disabled={disabled || chargement} className={classesBouton(variante, taille, className)} {...rest}>
      {chargement ? <Loader2 size={s} className="animate-spin" /> : Icone && <Icone size={s} strokeWidth={2} aria-hidden />}
      {children}
      {IconeD && !chargement && <IconeD size={s} strokeWidth={2} aria-hidden />}
    </button>
  );
});

export function LienBouton({
  href,
  variante = "primaire",
  taille = "md",
  icone: Icone,
  iconeDroite: IconeD,
  className,
  children,
  ...rest
}: Commun & { href: string; title?: string; "aria-label"?: string }) {
  const s = taille === "sm" ? 15 : taille === "lg" ? 18 : 17;
  return (
    <Link href={href} className={classesBouton(variante, taille, className)} {...rest}>
      {Icone && <Icone size={s} strokeWidth={2} aria-hidden />}
      {children}
      {IconeD && <IconeD size={s} strokeWidth={2} aria-hidden />}
    </Link>
  );
}

/* ------------------------------------------------------------------- cartes */

export function Carte({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card", className)} {...rest}>
      {children}
    </div>
  );
}

export function CarteEntete({
  titre,
  description,
  icone: Icone,
  action,
  lien,
  className,
}: {
  titre: ReactNode;
  description?: ReactNode;
  icone?: LucideIcon;
  action?: ReactNode;
  lien?: { href: string; libelle: string };
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-line px-4 py-2.5", className)}>
      <div className="flex min-w-0 items-center gap-2">
        {Icone && <Icone size={16} className="shrink-0 text-muted" />}
        <div className="min-w-0">
          <h2 className="text-[0.95rem] font-semibold leading-tight text-fg">{titre}</h2>
          {description && <p className="text-[0.82rem] text-muted">{description}</p>}
        </div>
      </div>
      {action}
      {lien && (
        <Link href={lien.href} className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[0.85rem] font-medium text-brand-fg hover:underline">
          {lien.libelle}
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

export function CarteCorps({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-4", className)}>{children}</div>;
}

/* --------------------------------------------------------------- pastilles */

export type Ton = "ok" | "warn" | "danger" | "info" | "neutre" | "violet" | "brand";

const TONS: Record<Ton, string> = {
  ok: "bg-ok-soft text-ok ring-ok/20",
  warn: "bg-warn-soft text-warn ring-warn/25",
  danger: "bg-danger-soft text-danger ring-danger/20",
  info: "bg-info-soft text-info ring-info/20",
  neutre: "bg-card-muted text-muted ring-line-strong",
  violet: "bg-violet-soft text-violet ring-violet/20",
  brand: "bg-brand-soft text-brand-fg ring-primary-500/20",
};

const POINTS: Record<Ton, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  danger: "bg-danger",
  info: "bg-info",
  neutre: "bg-muted",
  violet: "bg-violet",
  brand: "bg-primary-500",
};

export function Pastille({
  ton = "neutre",
  children,
  icone: Icone,
  point,
  className,
  taille = "md",
}: {
  ton?: Ton;
  children: ReactNode;
  icone?: LucideIcon;
  point?: boolean;
  className?: string;
  taille?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded font-medium",
        taille === "sm" ? "px-1.5 py-px text-xs" : "px-2 py-0.5 text-[0.8rem]",
        TONS[ton],
        className,
      )}
    >
      {point && <span className={cn("size-1.5 rounded-full", POINTS[ton])} />}
      {Icone && <Icone size={taille === "sm" ? 12 : 14} strokeWidth={2.5} />}
      {children}
    </span>
  );
}

/* ------------------------------------------------------- en-tête de page */

export function EntetePage({
  titre,
  description,
  actions,
  ariane,
  children,
}: {
  titre: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  ariane?: { libelle: string; href?: string }[];
  children?: ReactNode;
}) {
  return (
    <header className="mb-4">
      {ariane && (
        <nav aria-label="Fil d'Ariane" className="mb-1 flex flex-wrap items-center gap-0.5 text-[0.82rem] text-muted">
          {ariane.map((b, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronRight size={14} className="opacity-60" />}
              {b.href ? (
                <Link href={b.href} className="rounded hover:text-brand-fg hover:underline">
                  {b.libelle}
                </Link>
              ) : (
                <span className="text-fg-soft">{b.libelle}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="page-title">{titre}</h1>
          {description && <p className="mt-0.5 text-[0.9rem] text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

/* ------------------------------------------------------------ indicateurs */

const TEXTE_TON = { brand: "text-fg", ok: "text-ok", warn: "text-warn", danger: "text-danger", violet: "text-violet", neutre: "text-fg", info: "text-info" };

export function Indicateur({
  libelle,
  valeur,
  sous,
  icone: Icone,
  ton = "brand",
  href,
  onClick,
  actif,
}: {
  libelle: ReactNode;
  valeur: ReactNode;
  sous?: ReactNode;
  icone: LucideIcon;
  ton?: keyof typeof TEXTE_TON;
  href?: string;
  onClick?: () => void;
  actif?: boolean;
}) {
  const corps = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.85rem] font-medium leading-snug text-muted">{libelle}</p>
        <Icone size={16} className="shrink-0 text-muted" />
      </div>
      <p className={cn("tnum mt-1.5 text-[1.65rem] font-semibold leading-none", TEXTE_TON[ton])}>{valeur}</p>
      {sous && <p className="mt-1 text-[0.82rem] leading-snug text-muted">{sous}</p>}
    </>
  );
  const cls = cn("card group block px-4 py-3 text-left transition-colors", actif && "border-primary-500 ring-1 ring-primary-500/30");
  if (href)
    return (
      <Link href={href} className={cn(cls, "hover:border-primary-400 dark:hover:border-primary-600")}>
        {corps}
      </Link>
    );
  if (onClick)
    return (
      <button onClick={onClick} className={cn(cls, "w-full hover:border-primary-400 dark:hover:border-primary-600")}>
        {corps}
      </button>
    );
  return <div className={cls}>{corps}</div>;
}

/* ------------------------------------------------------------------- vide */

export function Vide({
  icone: Icone,
  titre,
  description,
  action,
  className,
}: {
  icone: LucideIcon;
  titre: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      <Icone size={28} strokeWidth={1.6} className="mb-3 text-muted" />
      <h3 className="text-base font-semibold">{titre}</h3>
      {description && <p className="mt-1 max-w-md text-[0.9rem] text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ----------------------------------------------------------------- onglets */

export function Onglets<T extends string>({
  valeur,
  onChange,
  onglets,
  className,
}: {
  valeur: T;
  onChange: (v: T) => void;
  onglets: { valeur: T; libelle: string; icone?: LucideIcon; compte?: number }[];
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("sans-barre -mx-1 flex gap-1 overflow-x-auto border-b border-line px-1", className)}>
      {onglets.map((t) => {
        const actif = t.valeur === valeur;
        return (
          <button
            key={t.valeur}
            role="tab"
            aria-selected={actif}
            onClick={() => onChange(t.valeur)}
            className={cn(
              "relative inline-flex items-center gap-2 whitespace-nowrap px-3 py-2 text-[0.92rem] font-medium transition",
              actif ? "text-brand-fg" : "text-muted hover:text-fg",
            )}
          >
            {t.icone && <t.icone size={15} />}
            {t.libelle}
            {t.compte !== undefined && <span className={cn("tnum rounded-full px-1.5 text-xs", actif ? "bg-brand-soft" : "bg-card-muted")}>{t.compte}</span>}
            {actif && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary-600 dark:bg-primary-400" />}
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- tableau */

export function Tableau({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-left text-[0.9rem] [&_tbody_tr]:border-t [&_tbody_tr]:border-line [&_tbody_tr:hover]:bg-card-muted [&_td]:px-3 [&_td]:py-2 [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-2 [&_th]:text-[0.8rem] [&_th]:font-medium [&_th]:text-muted [&_th:first-child]:pl-4 [&_th:last-child]:pr-4 [&_thead]:border-b [&_thead]:border-line [&_thead]:bg-card-muted">
        {children}
      </table>
    </div>
  );
}

export function Pagination({
  page,
  pages,
  onChange,
  total,
  parPage,
  libelle = "éléments",
}: {
  page: number;
  pages: number;
  onChange: (p: number) => void;
  total: number;
  parPage: number;
  libelle?: string;
}) {
  const debut = (page - 1) * parPage + 1;
  const fin = Math.min(total, page * parPage);
  const numeros: (number | "...")[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) numeros.push(i);
    else if (numeros[numeros.length - 1] !== "...") numeros.push("...");
  }
  return (
    <div className="flex flex-col gap-2 border-t border-line px-4 py-2.5 text-[0.85rem] sm:flex-row sm:items-center sm:justify-between">
      <p className="tnum text-muted">
        {debut} à {fin} sur {total} {libelle}
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChange(page - 1)}
            disabled={page <= 1}
            className="grid size-8 place-items-center rounded-md text-fg-soft hover:bg-card-muted disabled:opacity-40"
            aria-label="Page précédente"
          >
            <ChevronLeft size={16} />
          </button>
          {numeros.map((n, i) =>
            n === "..." ? (
              <span key={`p${i}`} className="px-1 text-muted">
                ...
              </span>
            ) : (
              <button
                key={n}
                onClick={() => onChange(n)}
                aria-current={n === page ? "page" : undefined}
                className={cn(
                  "tnum grid h-8 min-w-8 place-items-center rounded-md px-2 font-medium",
                  n === page ? "bg-primary-600 text-white dark:bg-primary-500" : "text-fg-soft hover:bg-card-muted",
                )}
              >
                {n}
              </button>
            ),
          )}
          <button
            onClick={() => onChange(page + 1)}
            disabled={page >= pages}
            className="grid size-8 place-items-center rounded-md text-fg-soft hover:bg-card-muted disabled:opacity-40"
            aria-label="Page suivante"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

/** Découpe une liste en pages et ramène la page dans les bornes. */
export function usePagination<T>(liste: T[], parPage: number, cle: unknown = null) {
  const [etat, setEtat] = useState({ page: 1, cle });
  const page = etat.cle === cle ? etat.page : 1;
  const pages = Math.max(1, Math.ceil(liste.length / parPage));
  const p = Math.min(page, pages);
  return {
    page: p,
    pages,
    elements: liste.slice((p - 1) * parPage, p * parPage),
    setPage: (n: number) => setEtat({ page: n, cle }),
  };
}

/* --------------------------------------------------------------- champs */

export function Recherche({
  valeur,
  onChange,
  placeholder = "Rechercher...",
  className,
}: {
  valeur: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input value={valeur} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input pl-9 pr-8" aria-label={placeholder} />
      {valeur && (
        <button onClick={() => onChange("")} className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-muted hover:text-fg" aria-label="Effacer">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export function Selecteur({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("input pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

export function Champ({ label, aide, children, className }: { label: string; aide?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="label">{label}</span>
      {children}
      {aide && <span className="mt-1 block text-[0.82rem] text-muted">{aide}</span>}
    </label>
  );
}

/* ------------------------------------------------------------- mesures */

export function Barre({ valeur, max = 100, ton = "brand", className }: { valeur: number; max?: number; ton?: "brand" | "ok" | "warn" | "danger"; className?: string }) {
  const pct = Math.max(0, Math.min(100, (valeur / max) * 100));
  const c = { brand: "bg-primary-600 dark:bg-primary-400", ok: "bg-ok", warn: "bg-warn", danger: "bg-danger" }[ton];
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-line", className)} role="progressbar" aria-valuenow={valeur} aria-valuemax={max}>
      <div className={cn("h-full rounded-full transition-all duration-700", c)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Anneau({ valeur, taille = 64, epaisseur = 7, children, ton = "brand" }: { valeur: number; taille?: number; epaisseur?: number; children?: ReactNode; ton?: "brand" | "ok" | "warn" | "danger" }) {
  const r = (taille - epaisseur) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, valeur / 100));
  const trait = { brand: "stroke-primary-600 dark:stroke-primary-400", ok: "stroke-ok", warn: "stroke-warn", danger: "stroke-danger" }[ton];
  return (
    <div className="relative shrink-0" style={{ width: taille, height: taille }}>
      <svg width={taille} height={taille} className="-rotate-90">
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" strokeWidth={epaisseur} className="stroke-line" />
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={r}
          fill="none"
          strokeWidth={epaisseur}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className={cn("transition-[stroke-dashoffset] duration-1000", trait)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Compteur({ valeur, suffixe = "" }: { valeur: number; suffixe?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const vu = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const txt = useTransform(mv, (v) => Math.round(v).toLocaleString("fr-FR") + suffixe);
  useEffect(() => {
    if (!vu) return;
    const a = animate(mv, valeur, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
    return () => a.stop();
  }, [vu, valeur, mv]);
  return <motion.span ref={ref}>{txt}</motion.span>;
}

/* ------------------------------------------------------------------ menu */

export function useFermetureExterieure<T extends HTMLElement>(ouvert: boolean, fermer: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && fermer();
    const echap = (e: KeyboardEvent) => e.key === "Escape" && fermer();
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert, fermer]);
  return ref;
}

export function MenuActions({
  elements,
  libelle = "Plus d'actions",
}: {
  elements: ({ libelle: string; icone?: LucideIcon; onClick: () => void; danger?: boolean } | "separateur")[];
  libelle?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useFermetureExterieure<HTMLDivElement>(ouvert, () => setOuvert(false));
  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOuvert((o) => !o);
        }}
        aria-label={libelle}
        title={libelle}
        aria-expanded={ouvert}
        className="grid size-8 place-items-center rounded-md text-muted hover:bg-card-muted hover:text-fg"
      >
        <MoreHorizontal size={18} />
      </button>
      {ouvert && (
        <div role="menu" className="absolute right-0 z-50 mt-1 min-w-52 origin-top-right animate-scale-in overflow-hidden rounded-md border border-line bg-card p-1 shadow-lg">
          {elements.map((it, i) =>
            it === "separateur" ? (
              <div key={i} className="my-1 h-px bg-line" />
            ) : (
              <button
                key={i}
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setOuvert(false);
                  it.onClick();
                }}
                className={cn("flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-[0.9rem]", it.danger ? "text-danger hover:bg-danger-soft" : "text-fg hover:bg-card-muted")}
              >
                {it.icone && <it.icone size={16} className={it.danger ? "" : "text-muted"} />}
                {it.libelle}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- divers */

export function Avatar({ prenom, nom, taille = "md", className }: { prenom: string; nom?: string; taille?: "sm" | "md" | "lg"; className?: string }) {
  const px = { sm: 28, md: 34, lg: 44 }[taille];
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-semibold text-white", className)}
      style={{ width: px, height: px, background: couleurDe(prenom + (nom ?? "")), fontSize: px * 0.38 }}
      aria-hidden
    >
      {initiales(prenom, nom).toUpperCase()}
    </span>
  );
}

export function LigneInfo({ libelle, children, icone: Icone }: { libelle: string; children: ReactNode; icone?: LucideIcon }) {
  return (
    <div className="flex gap-3 py-2">
      {Icone && <Icone size={17} className="mt-0.5 shrink-0 text-muted" />}
      <div className="min-w-0 flex-1 sm:flex sm:gap-4">
        <dt className="text-[0.85rem] text-muted sm:w-40 sm:shrink-0 sm:pt-px">{libelle}</dt>
        <dd className="break-words text-fg">{children}</dd>
      </div>
    </div>
  );
}

export function Squelette({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-line/60", className)} />;
}

export function Chargement({ libelle = "Chargement..." }: { libelle?: string }) {
  return (
    <p className="flex items-center gap-2 px-4 py-6 text-muted">
      <Loader2 size={16} className="animate-spin" /> {libelle}
    </p>
  );
}
