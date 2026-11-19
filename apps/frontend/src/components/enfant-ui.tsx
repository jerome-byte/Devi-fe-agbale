"use client";

import Link from "next/link";
import type { Alerte } from "@/lib/regles";
import type { Enfant } from "@/lib/types";
import { Avatar, Pastille, type Ton } from "./ui";

export const TON_ALERTE: Record<Alerte["ton"], Ton> = {
  rouge: "danger",
  orange: "warn",
  jaune: "warn",
  bleu: "info",
  vert: "ok",
};

export function PastilleAlerte({ a, taille = "sm" }: { a: Alerte; taille?: "sm" | "md" }) {
  return (
    <Pastille ton={TON_ALERTE[a.ton]} point taille={taille}>
      {a.titre}
    </Pastille>
  );
}

/** Avatar, nom et ligne secondaire : première colonne des tableaux. */
export function Personne({ enfant, sous, lien = true }: { enfant: Enfant; sous?: string; lien?: boolean }) {
  const nom = (
    <span className="block truncate font-medium text-fg">
      {enfant.prenom} {enfant.nom}
    </span>
  );
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar prenom={enfant.prenom} nom={enfant.nom} taille="sm" />
      <span className="min-w-0">
        {lien ? (
          <Link href={`/enfant/${enfant.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-brand-fg hover:underline">
            {nom}
          </Link>
        ) : (
          nom
        )}
        {sous && <span className="block truncate text-[0.82rem] text-muted">{sous}</span>}
      </span>
    </span>
  );
}

export function Alertes({ alertes, max = 2 }: { alertes: Alerte[]; max?: number }) {
  if (!alertes.length) return <span className="text-[0.85rem] text-muted">Rien à signaler</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {alertes.slice(0, max).map((a) => (
        <PastilleAlerte key={a.type} a={a} />
      ))}
      {alertes.length > max && <span className="text-xs font-medium text-muted">+{alertes.length - max}</span>}
    </span>
  );
}
