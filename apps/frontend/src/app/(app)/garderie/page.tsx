"use client";

import { Check, ChevronRight, FileX2, Ruler, ScanLine, Sparkles, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Personne } from "@/components/enfant-ui";
import { useEnfantsDuPerimetre } from "@/components/shell/compteurs";
import { Avatar, Carte, CarteEntete, Indicateur, LienBouton, Pagination, Recherche, Tableau, Vide, usePagination } from "@/components/ui";
import { ageMois, dateLongue, libelleAge } from "@/lib/dates";
import { alertesEnfant } from "@/lib/regles";
import { useAuJour, useStore } from "@/lib/store";
import type { Enfant } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function Garderie() {
  const session = useStore((s) => s.session)!;
  const pointer = useStore((s) => s.pointer);
  const auJour = useAuJour();
  const perimetre = useEnfantsDuPerimetre();
  const [q, setQ] = useState("");

  const inscrits = useMemo(() => [...perimetre].sort((a, b) => a.prenom.localeCompare(b.prenom)), [perimetre]);
  const presents = inscrits.filter((e) => e.presences.includes(auJour));
  const avecAlertes = useMemo(() => inscrits.map((e) => ({ e, a: alertesEnfant(e, auJour) })), [inscrits, auJour]);
  const mesures = avecAlertes.filter((x) => x.a.some((a) => a.type === "pesee" || a.type === "croissance")).map((x) => x.e);
  const depistages = avecAlertes.filter((x) => x.a.some((a) => a.type === "depistage")).map((x) => x.e);
  const actes = avecAlertes.filter((x) => x.a.some((a) => a.type === "acte")).map((x) => x.e);

  const visibles = inscrits.filter((e) => !q || `${e.prenom} ${e.nom}`.toLowerCase().includes(q.toLowerCase()));
  const pag = usePagination(visibles, 24, q);

  return (
    <>
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.82rem] text-muted first-letter:uppercase">{dateLongue(auJour)}</p>
          <h1 className="page-title">Bonjour, {session.nom.split(" ")[0]}</h1>
          <p className="mt-0.5 text-[0.9rem] text-muted">
            {session.lieu} · {presents.length} enfant{presents.length > 1 ? "s" : ""} arrivé{presents.length > 1 ? "s" : ""} sur {inscrits.length}.
          </p>
        </div>
        <LienBouton href="/scan" icone={ScanLine}>
          Scanner une arrivée
        </LienBouton>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Indicateur libelle="Enfants inscrits" valeur={inscrits.length} icone={Users} href="/enfants" />
        <Indicateur libelle="Présents aujourd'hui" valeur={presents.length} sous={`${inscrits.length ? Math.round((presents.length / inscrits.length) * 100) : 0} % de l'effectif`} icone={UserCheck} ton="ok" />
        <Indicateur libelle="Mesures à faire" valeur={mesures.length} sous="Poids et taille du mois" icone={Ruler} ton={mesures.length ? "warn" : "neutre"} />
        <Indicateur libelle="Sans acte de naissance" valeur={actes.length} sous="Aider la famille" icone={FileX2} ton={actes.length ? "warn" : "neutre"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Carte className="xl:col-span-2">
          <CarteEntete titre="Arrivées du jour" description="Cliquez sur un enfant pour noter son arrivée ou son départ" icone={UserCheck} action={<Recherche valeur={q} onChange={setQ} placeholder="Chercher un enfant" className="w-48 sm:w-60" />} />
          {pag.elements.length ? (
            <ul className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-4">
              {pag.elements.map((e) => {
                const p = e.presences.includes(auJour);
                return (
                  <li key={e.id} className="bg-card">
                    <button onClick={() => pointer(e.id)} className={cn("flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors", p ? "bg-ok-soft/60" : "hover:bg-card-muted")}>
                      <span className={cn("relative", !p && "opacity-60 grayscale")}>
                        <Avatar prenom={e.prenom} nom={e.nom} taille="sm" />
                        {p && (
                          <span className="absolute -bottom-0.5 -right-0.5 grid size-3.5 place-items-center rounded-full bg-ok text-white ring-2 ring-card">
                            <Check size={9} strokeWidth={3} />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[0.9rem] font-medium">{e.prenom}</span>
                        <span className="block truncate text-xs text-muted">{p ? "Présent" : libelleAge(e.naissance, auJour)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Vide icone={Users} titre="Aucun enfant" />
          )}
          {visibles.length > 0 && <Pagination page={pag.page} pages={pag.pages} onChange={pag.setPage} total={visibles.length} parPage={24} libelle="enfants" />}
        </Carte>

        <div className="space-y-4">
          <Carte>
            <CarteEntete titre="Mesures à faire" description="Chaque mois avant 2 ans, tous les 3 mois ensuite" icone={Ruler} />
            {mesures.length ? (
              <Tableau>
                <tbody>
                  {mesures.slice(0, 6).map((e) => (
                    <LigneMesure key={e.id} e={e} auJour={auJour} />
                  ))}
                </tbody>
              </Tableau>
            ) : (
              <Vide icone={Ruler} titre="Tout est à jour" className="py-6" />
            )}
          </Carte>
          <ListeSimple titre="Dépistages à faire" icone={Sparkles} items={depistages} auJour={auJour} />
          <ListeSimple titre="Sans acte de naissance" icone={FileX2} items={actes} auJour={auJour} />
        </div>
      </div>
    </>
  );
}

function ListeSimple({ titre, icone, items, auJour }: { titre: string; icone: typeof Ruler; items: Enfant[]; auJour: string }) {
  return (
    <Carte>
      <CarteEntete titre={`${titre} (${items.length})`} icone={icone} />
      {items.length ? (
        <ul className="divide-y divide-line">
          {items.slice(0, 5).map((e) => (
            <li key={e.id}>
              <Link href={`/enfant/${e.id}`} className="group flex items-center gap-3 px-4 py-2 hover:bg-card-muted">
                <Personne enfant={e} sous={libelleAge(e.naissance, auJour)} lien={false} />
                <ChevronRight size={15} className="ml-auto text-muted group-hover:text-brand-fg" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-4 text-[0.88rem] text-muted">Rien à faire ici.</p>
      )}
    </Carte>
  );
}

function LigneMesure({ e, auJour }: { e: Enfant; auJour: string }) {
  const peser = useStore((s) => s.peser);
  const [v, setV] = useState("");
  const [t, setT] = useState("");
  const faite = e.pesees.some((p) => p.date === auJour);
  return (
    <tr>
      <td>
        <Personne enfant={e} sous={`${libelleAge(e.naissance, auJour)} · ${ageMois(e.naissance, auJour) < 24 ? "couché" : "debout"}`} />
      </td>
      <td className="w-40 text-right">
        {faite ? (
          <span className="inline-flex items-center gap-1 text-[0.85rem] font-medium text-ok">
            <Check size={15} /> Fait
          </span>
        ) : (
          <form
            className="flex justify-end gap-1"
            onSubmit={(ev) => {
              ev.preventDefault();
              const n = Number(v.replace(",", "."));
              const tc = Number(t.replace(",", "."));
              if (n > 1 && n < 40) peser(e.id, Math.round(n * 10) / 10, "garderie", tc > 30 && tc < 140 ? tc : undefined);
            }}
          >
            <input value={v} onChange={(ev) => setV(ev.target.value.replace(/[^\d.,]/g, ""))} inputMode="decimal" placeholder="kg" className="input h-8 w-14 px-1.5 text-center text-sm" aria-label={`Poids de ${e.prenom}`} />
            <input value={t} onChange={(ev) => setT(ev.target.value.replace(/[^\d.,]/g, ""))} inputMode="decimal" placeholder="cm" className="input h-8 w-14 px-1.5 text-center text-sm" aria-label={`Taille de ${e.prenom}`} />
            <button disabled={!v} className="grid size-8 place-items-center rounded-md bg-primary-600 text-white disabled:opacity-40" aria-label="Enregistrer">
              <Check size={15} />
            </button>
          </form>
        )}
      </td>
    </tr>
  );
}
