"use client";

import { Check, Download, Eye, Phone, ScanLine, SearchX, UserPlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Alertes, Personne } from "@/components/enfant-ui";
import { useEnfantsDuPerimetre } from "@/components/shell/compteurs";
import { Bouton, Carte, EntetePage, LienBouton, MenuActions, Onglets, Pagination, Recherche, Selecteur, Tableau, Vide, usePagination } from "@/components/ui";
import { ageMois, dateSansAnnee, libelleAge, relatif } from "@/lib/dates";
import { prioriser, type TypeAlerte } from "@/lib/regles";
import { useAuJour, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Filtre = "tous" | "urgent" | "vaccin" | "croissance" | "acte" | "jour" | "presents";

const TYPES: Partial<Record<Filtre, TypeAlerte[]>> = {
  vaccin: ["retard", "retard_grave", "empechement", "perdu"],
  croissance: ["croissance", "pesee"],
  acte: ["acte"],
  jour: ["aujourdhui"],
};

const TRANCHES = [
  { v: "", l: "Tous les âges" },
  { v: "0-12", l: "Moins de 1 an" },
  { v: "12-24", l: "1 à 2 ans" },
  { v: "24-72", l: "2 à 6 ans" },
];

const PAR_PAGE = 20;

export default function Enfants() {
  const session = useStore((s) => s.session)!;
  const pointer = useStore((s) => s.pointer);
  const auJour = useAuJour();
  const router = useRouter();
  const params = useSearchParams();
  const educ = session.role === "educatrice";
  const base = useEnfantsDuPerimetre();
  const liste = useMemo(() => prioriser(base, auJour), [base, auJour]);

  const initial = (params.get("filtre") as Filtre) ?? "tous";
  const [filtre, setFiltre] = useState<Filtre>(initial);
  const [q, setQ] = useState("");
  const [quartier, setQuartier] = useState("");
  const [tranche, setTranche] = useState("");

  const correspond = (f: Filtre, x: (typeof liste)[number]) => {
    if (f === "tous") return true;
    if (f === "urgent") return x.alertes.some((a) => a.ton === "rouge" || a.ton === "orange");
    if (f === "presents") return x.enfant.presences.includes(auJour);
    return x.alertes.some((a) => TYPES[f]!.includes(a.type));
  };

  const filtres = useMemo(() => {
    const t = q.trim().toLowerCase();
    const [min, max] = tranche ? tranche.split("-").map(Number) : [0, 999];
    return liste.filter((x) => {
      if (!correspond(filtre, x)) return false;
      if (quartier && x.enfant.quartier !== quartier) return false;
      const m = ageMois(x.enfant.naissance, auJour);
      if (m < min || m >= max) return false;
      if (t && !`${x.enfant.prenom} ${x.enfant.nom} ${x.enfant.mere.nom} ${x.enfant.id}`.toLowerCase().includes(t)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liste, filtre, q, quartier, tranche, auJour]);

  const { page, pages, elements, setPage } = usePagination(filtres, PAR_PAGE, `${filtre}|${q}|${quartier}|${tranche}`);
  const quartiers = [...new Set(base.map((e) => e.quartier))].sort();
  const aDesFiltres = !!(q || quartier || tranche);

  const onglets = (educ ? (["tous", "presents", "croissance", "acte"] as Filtre[]) : (["tous", "urgent", "jour", "vaccin", "croissance", "acte"] as Filtre[])).map((f) => ({
    valeur: f,
    libelle: { tous: "Tous", urgent: "À appeler", jour: "Vaccin aujourd'hui", vaccin: "Vaccins en retard", croissance: "Croissance", acte: "Sans acte", presents: "Présents aujourd'hui" }[f],
    compte: liste.filter((x) => correspond(f, x)).length,
  }));

  const exporter = () => {
    const lignes = [
      ["Code", "Prénom", "Nom", "Âge", "Quartier", "Mère", "Téléphone", "Alertes"],
      ...filtres.map((x) => [
        x.enfant.id,
        x.enfant.prenom,
        x.enfant.nom,
        libelleAge(x.enfant.naissance, auJour),
        x.enfant.quartier,
        x.enfant.mere.nom,
        x.enfant.mere.telephone,
        x.alertes.map((a) => a.titre).join(" ; "),
      ]),
    ];
    const csv = "﻿" + lignes.map((l) => l.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `enfants_${auJour}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <EntetePage
        titre={educ ? "Enfants de la garderie" : "Enfants suivis"}
        description={`${base.length} enfants · ${session.lieu} · Cliquez sur un enfant pour voir son dossier.`}
        ariane={[{ libelle: "Suivi des enfants" }, { libelle: "Enfants" }]}
        actions={
          educ ? (
            <LienBouton href="/scan" icone={ScanLine}>
              Scanner une arrivée
            </LienBouton>
          ) : (
            <>
              <Bouton variante="secondaire" icone={Download} onClick={exporter} disabled={!filtres.length}>
                Exporter
              </Bouton>
              <LienBouton href="/inscription" icone={UserPlus}>
                Inscrire un enfant
              </LienBouton>
            </>
          )
        }
      />

      <Carte>
        <div className="px-3 pt-1">
          <Onglets valeur={filtre} onChange={setFiltre} onglets={onglets} />
        </div>
        <div className="space-y-2 border-b border-line p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <Recherche valeur={q} onChange={setQ} placeholder="Prénom, nom de la mère ou code de la carte" className="lg:max-w-md lg:flex-1" />
            <div className="grid gap-2 sm:grid-cols-2 lg:ml-auto lg:w-[26rem]">
              <Selecteur value={quartier} onChange={(e) => setQuartier(e.target.value)} aria-label="Filtrer par quartier">
                <option value="">Tous les quartiers</option>
                {quartiers.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </Selecteur>
              <Selecteur value={tranche} onChange={(e) => setTranche(e.target.value)} aria-label="Filtrer par âge">
                {TRANCHES.map((t) => (
                  <option key={t.v} value={t.v}>
                    {t.l}
                  </option>
                ))}
              </Selecteur>
            </div>
          </div>
          {aDesFiltres && (
            <p className="text-[0.85rem] text-muted">
              {filtres.length} résultat{filtres.length > 1 ? "s" : ""}.{" "}
              <button
                onClick={() => {
                  setQ("");
                  setQuartier("");
                  setTranche("");
                }}
                className="font-medium text-brand-fg hover:underline"
              >
                Effacer les filtres
              </button>
            </p>
          )}
        </div>

        {!elements.length ? (
          <Vide icone={SearchX} titre="Aucun enfant ne correspond" description="Essayez un autre prénom ou retirez un filtre." />
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>Enfant</th>
                <th className="hidden lg:table-cell">Quartier</th>
                {educ ? <th>Arrivée</th> : <th className="hidden md:table-cell">Prochain vaccin</th>}
                <th>Suivi</th>
                {!educ && <th className="hidden xl:table-cell">Mère</th>}
                <th className="w-10">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {elements.map(({ enfant: e, alertes, prochain }) => {
                const visibles = educ ? alertes.filter((a) => ["acte", "pesee", "depistage", "croissance"].includes(a.type)) : alertes;
                const present = e.presences.includes(auJour);
                return (
                  <tr key={e.id} className="cursor-pointer" onClick={() => router.push(`/enfant/${e.id}`)}>
                    <td className="min-w-56">
                      <Personne enfant={e} sous={`${libelleAge(e.naissance, auJour)} · ${e.id}`} />
                    </td>
                    <td className="hidden whitespace-nowrap text-fg-soft lg:table-cell">{e.quartier}</td>
                    {educ ? (
                      <td onClick={(ev) => ev.stopPropagation()}>
                        <button
                          onClick={() => pointer(e.id)}
                          className={cn(
                            "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[0.85rem] font-medium",
                            present ? "bg-ok-soft text-ok" : "border border-line-strong text-fg-soft hover:bg-card-muted",
                          )}
                        >
                          {present && <Check size={14} />}
                          {present ? "Présent" : "Noter l'arrivée"}
                        </button>
                      </td>
                    ) : (
                      <td className="hidden whitespace-nowrap md:table-cell">
                        {prochain ? (
                          <>
                            <span className={cn("block", prochain.joursRetard ? "text-danger" : "text-fg")}>
                              {prochain.libelle}, {dateSansAnnee(prochain.date)}
                            </span>
                            <span className="block text-[0.82rem] text-muted">
                              {prochain.joursRetard > 90 ? "Jamais fait, perdu de vue" : prochain.joursRetard ? `${prochain.joursRetard} j de retard` : relatif(prochain.date, auJour)}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted">Calendrier terminé</span>
                        )}
                      </td>
                    )}
                    <td>
                      <Alertes alertes={visibles} />
                    </td>
                    {!educ && <td className="hidden whitespace-nowrap text-fg-soft xl:table-cell">{e.mere.nom}</td>}
                    <td onClick={(ev) => ev.stopPropagation()}>
                      <MenuActions
                        elements={[
                          { libelle: "Ouvrir le carnet", icone: Eye, onClick: () => router.push(`/enfant/${e.id}`) },
                          ...(!educ ? [{ libelle: "Appeler la mère", icone: Phone, onClick: () => (window.location.href = `tel:${e.mere.telephone.replaceAll(" ", "")}`) }] : []),
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Tableau>
        )}
        {filtres.length > 0 && <Pagination page={page} pages={pages} onChange={setPage} total={filtres.length} parPage={PAR_PAGE} libelle="enfants" />}
      </Carte>
    </>
  );
}
