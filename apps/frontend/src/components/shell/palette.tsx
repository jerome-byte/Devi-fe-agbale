"use client";

import { CornerDownLeft, Search, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { libelleAge } from "@/lib/dates";
import { useAuJour, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEnfantsDuPerimetre } from "./compteurs";
import { liensPour } from "./nav";

type Resultat = { cle: string; libelle: string; sous: string; href: string; type: "page" | "enfant"; icone?: React.ElementType };

const sansAccents = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function Palette({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  if (!ouvert) return null;
  return <PaletteOuverte onFermer={onFermer} />;
}

function PaletteOuverte({ onFermer }: { onFermer: () => void }) {
  const session = useStore((s) => s.session)!;
  const enfants = useEnfantsDuPerimetre();
  const auJour = useAuJour();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const liste = useRef<HTMLUListElement>(null);

  const resultats = useMemo<Resultat[]>(() => {
    const t = sansAccents(q.trim());
    const pages: Resultat[] = liensPour(session.role)
      .flatMap((s) => s.liens)
      .filter((l) => !t || sansAccents(`${l.libelle} ${l.motsCles ?? ""}`).includes(t))
      .map((l) => ({ cle: l.href, libelle: l.libelle, sous: "Page", href: l.href, type: "page", icone: l.icone }));
    const peutVoirEnfants = session.role !== "pilotage";
    const trouves: Resultat[] =
      peutVoirEnfants && t
        ? enfants
            .filter((e) => sansAccents(`${e.prenom} ${e.nom} ${e.mere.nom} ${e.id} ${e.quartier}`).includes(t))
            .slice(0, 8)
            .map((e) => ({
              cle: e.id,
              libelle: `${e.prenom} ${e.nom}`,
              sous: `${libelleAge(e.naissance, auJour)} · ${e.quartier} · ${e.id}`,
              href: `/enfant/${e.id}`,
              type: "enfant",
            }))
        : [];
    return [...trouves, ...pages];
  }, [q, session.role, enfants, auJour]);

  const aller = (r: Resultat) => {
    onFermer();
    router.push(r.href);
  };

  const position = Math.min(sel, Math.max(0, resultats.length - 1));

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-3 pt-[12vh]">
      <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={onFermer} />
      <div className="relative w-full max-w-xl animate-scale-in overflow-hidden rounded-lg border border-line bg-card shadow-2xl" role="dialog" aria-label="Recherche">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={18} className="text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onFermer();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((s) => Math.min(s + 1, resultats.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((s) => Math.max(s - 1, 0));
              }
              if (e.key === "Enter" && resultats[position]) aller(resultats[position]);
            }}
            placeholder={session.role === "pilotage" ? "Aller à une page..." : "Prénom, nom de la mère, code de la carte, page..."}
            className="h-12 flex-1 bg-transparent text-[0.95rem] outline-none placeholder:text-muted"
          />
          <kbd className="rounded border border-line-strong px-1.5 text-[0.72rem] text-muted">Échap</kbd>
        </div>
        <ul ref={liste} className="max-h-[50vh] overflow-y-auto p-1.5">
          {resultats.map((r, i) => {
            const Icone = r.icone ?? User;
            return (
              <li key={r.cle}>
                <button
                  onMouseEnter={() => setSel(i)}
                  onClick={() => aller(r)}
                  className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left", i === position ? "bg-brand-soft" : "hover:bg-card-muted")}
                >
                  <Icone size={17} className={i === position ? "text-brand-fg" : "text-muted"} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.92rem] font-medium">{r.libelle}</span>
                    <span className="block truncate text-xs text-muted">{r.sous}</span>
                  </span>
                  {i === position && <CornerDownLeft size={15} className="text-muted" />}
                </button>
              </li>
            );
          })}
          {!resultats.length && <li className="px-4 py-8 text-center text-muted">Aucun résultat pour « {q} »</li>}
        </ul>
      </div>
    </div>
  );
}
