"use client";

import { AlertTriangle, BarChart3, Baby, ChevronRight, FileX2, Headphones, Info, LineChart as IconeCourbe, MapPin, Megaphone, Ruler, Syringe, TableProperties } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Carte, CarteEntete, EntetePage, Indicateur, Onglets, Pastille, Selecteur, Tableau } from "@/components/ui";
import { dateLongue } from "@/lib/dates";
import { abandon, couverture, indicateurs, parAntigene, tendance } from "@/lib/indicateurs";
import { calendrierEnfant } from "@/lib/pev";
import { couleursGraphe, useSombre } from "@/lib/prefs";
import { QUARTIERS } from "@/lib/seed";
import { useAuJour, useStore } from "@/lib/store";
import type { CentreId } from "@/lib/types";
import { cn } from "@/lib/utils";

type Zone = "tout" | CentreId;
const CIBLE = 90;

function Infobulle({ titre, valeur, detail }: { titre: string; valeur: string; detail?: string }) {
  return (
    <div className="rounded-md border border-line bg-card px-3 py-2 text-sm shadow-lg">
      <p className="text-xs text-muted">{titre}</p>
      <p className="font-semibold">{valeur}</p>
      {detail && <p className="text-xs text-muted">{detail}</p>}
    </div>
  );
}

export default function Pilotage() {
  const enfants = useStore((s) => s.enfants);
  const messages = useStore((s) => s.messages);
  const auJour = useAuJour();
  const c = couleursGraphe(useSombre());
  const [zone, setZone] = useState<Zone>("tout");
  const [vue, setVue] = useState<"graphe" | "tableau">("graphe");

  const dansZone = useMemo(() => (zone === "tout" ? enfants : enfants.filter((e) => e.centre === zone)), [enfants, zone]);
  const ids = useMemo(() => new Set(dansZone.map((e) => e.id)), [dansZone]);
  const ind = useMemo(() => indicateurs(dansZone, messages.filter((m) => m.enfantId && ids.has(m.enfantId)), auJour), [dansZone, messages, ids, auJour]);
  const antigenes = useMemo(() => parAntigene(dansZone, auJour), [dansZone, auJour]);
  const courbe = useMemo(() => tendance(dansZone, auJour), [dansZone, auJour]);

  const quartiers = useMemo(() => {
    const noms = zone === "tout" ? [...QUARTIERS.be_kpota, ...QUARTIERS.sylvanus_olympio] : QUARTIERS[zone];
    return noms
      .map((q) => {
        const l = dansZone.filter((e) => e.quartier === q);
        return {
          q,
          n: l.length,
          penta3: Math.round(couverture(l, "PENTA_3", 4, auJour).taux),
          abandon: Math.round(abandon(l, auJour).taux),
          sansActe: l.length ? Math.round((l.filter((e) => !e.acteNaissance).length / l.length) * 100) : 0,
          retards: l.filter((e) => calendrierEnfant(e, auJour).some((r) => r.joursRetard >= 7)).length,
        };
      })
      .sort((a, b) => a.penta3 - b.penta3);
  }, [dansZone, zone, auJour]);

  const axe = { tick: { fontSize: 12, fill: c.axe }, axisLine: false, tickLine: false } as const;
  const niveau = (v: number) => (v >= CIBLE ? { l: "Bon", t: "ok" as const } : v >= 75 ? { l: "Moyen", t: "warn" as const } : { l: "En difficulté", t: "danger" as const });

  return (
    <>
      <EntetePage
        titre="Tableau de bord"
        description={
          <span className="first-letter:uppercase">
            {dateLongue(auJour)} · données anonymes, agrégées par zone
          </span>
        }
        ariane={[{ libelle: "Pilotage" }, { libelle: "Tableau de bord" }]}
        actions={
          <Selecteur value={zone} onChange={(e) => setZone(e.target.value as Zone)} className="w-60" aria-label="Zone">
            <option value="tout">District du Golfe</option>
            <option value="be_kpota">Aire de santé de Bè-Kpota</option>
            <option value="sylvanus_olympio">Aire du CHU Sylvanus Olympio</option>
          </Selecteur>
        }
      />

      <div className="mb-4 flex items-center gap-2 rounded-md border border-info/20 bg-info-soft px-3 py-2 text-[0.88rem] text-info">
        <Info size={16} className="shrink-0" /> Données de démonstration : {ind.total} enfants fictifs. Aucune donnée nominative n&apos;est affichée ici.
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Indicateur libelle="Penta 3 à jour" valeur={`${Math.round(ind.penta3.taux)} %`} sous={`${ind.penta3.faits} enfants sur ${ind.penta3.eligibles} · cible ${CIBLE} %`} icone={Syringe} ton={ind.penta3.taux >= CIBLE ? "ok" : "warn"} />
        <Indicateur libelle="Abandon Penta 1 à 3" valeur={`${Math.round(ind.abandon.taux)} %`} sous={`${ind.abandon.p1 - ind.abandon.p3} enfants perdus en route`} icone={AlertTriangle} ton={ind.abandon.taux <= 10 ? "ok" : "danger"} />
        <Indicateur libelle="Sans acte de naissance" valeur={`${Math.round(ind.tauxSansActe)} %`} sous={`${ind.sansActe} enfants à accompagner`} icone={FileX2} ton={ind.tauxSansActe <= 10 ? "ok" : "warn"} />
        <Indicateur libelle="Vocaux écoutés" valeur={`${Math.round(ind.tauxEcoute)} %`} sous={`${ind.messages30} messages sur 30 jours`} icone={Headphones} ton={ind.tauxEcoute >= 70 ? "ok" : "warn"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Carte>
            <CarteEntete titre="Couverture Penta 3 par quartier" description={`Du plus faible au plus fort, cible ${CIBLE} %`} icone={MapPin} />
            <div className="px-3">
              <Onglets
                valeur={vue}
                onChange={setVue}
                onglets={[
                  { valeur: "graphe", libelle: "Graphique", icone: BarChart3 },
                  { valeur: "tableau", libelle: "Tableau", icone: TableProperties },
                ]}
              />
            </div>
            {vue === "graphe" ? (
              <div className="px-2 py-3" style={{ height: Math.max(240, quartiers.length * 30 + 40) }}>
                <ResponsiveContainer>
                  <BarChart data={quartiers} layout="vertical" margin={{ left: 4, right: 40, top: 14, bottom: 0 }} barCategoryGap={5}>
                    <CartesianGrid horizontal={false} stroke={c.grille} />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v} %`} {...axe} />
                    <YAxis type="category" dataKey="q" width={112} {...axe} tick={{ fontSize: 12.5, fill: c.texte }} />
                    <ReferenceLine x={CIBLE} stroke={c.cible} strokeDasharray="4 4" label={{ value: "cible", position: "top", fontSize: 11, fill: c.axe }} />
                    <Tooltip cursor={{ fill: c.primaireDouce, opacity: 0.4 }} content={({ active, payload }) => {
                      const p = payload?.[0]?.payload as (typeof quartiers)[number] | undefined;
                      return active && p ? <Infobulle titre={p.q} valeur={`${p.penta3} % à jour`} detail={`${p.n} enfants · abandon ${p.abandon} % · sans acte ${p.sansActe} %`} /> : null;
                    }} />
                    <Bar dataKey="penta3" fill={c.primaire} radius={[0, 3, 3, 0]} maxBarSize={16} label={{ position: "right", fontSize: 11.5, fill: c.axe, formatter: (v: unknown) => `${v} %` }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Tableau>
                <thead>
                  <tr>
                    <th>Quartier</th>
                    <th className="text-right">Enfants</th>
                    <th className="text-right">Penta 3</th>
                    <th className="text-right">Abandon</th>
                    <th className="text-right">Sans acte</th>
                    <th className="text-right">Retards</th>
                    <th>Niveau</th>
                  </tr>
                </thead>
                <tbody>
                  {quartiers.map((q) => {
                    const n = niveau(q.penta3);
                    return (
                      <tr key={q.q}>
                        <td className="font-medium">{q.q}</td>
                        <td className="tnum text-right">{q.n}</td>
                        <td className="tnum text-right">{q.penta3} %</td>
                        <td className={cn("tnum text-right", q.abandon > 10 && "text-danger")}>{q.abandon} %</td>
                        <td className={cn("tnum text-right", q.sansActe > 15 && "text-warn")}>{q.sansActe} %</td>
                        <td className="tnum text-right">{q.retards}</td>
                        <td>
                          <Pastille ton={n.t} point taille="sm">
                            {n.l}
                          </Pastille>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Tableau>
            )}
          </Carte>

          <Carte>
            <CarteEntete titre="Couverture par vaccin" description="Enfants en âge d'avoir reçu la dose depuis au moins 4 semaines" icone={Syringe} />
            <div className="h-60 px-2 py-3">
              <ResponsiveContainer>
                <BarChart data={antigenes} margin={{ left: -16, right: 8, top: 14, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke={c.grille} />
                  <XAxis dataKey="nom" interval={0} {...axe} />
                  <YAxis domain={[0, 100]} {...axe} />
                  <ReferenceLine y={CIBLE} stroke={c.cible} strokeDasharray="4 4" />
                  <Tooltip cursor={{ fill: c.primaireDouce, opacity: 0.4 }} content={({ active, payload }) => {
                    const p = payload?.[0]?.payload as (typeof antigenes)[number] | undefined;
                    return active && p ? <Infobulle titre={p.nom} valeur={`${p.taux} %`} detail={`${p.faits} sur ${p.eligibles} enfants`} /> : null;
                  }} />
                  <Bar dataKey="taux" fill={c.primaire} radius={[3, 3, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Carte>
        </div>

        <div className="space-y-4">
          <Carte>
            <CarteEntete titre="Évolution sur 12 mois" description="Penta 3 à jour, par mois de naissance" icone={IconeCourbe} />
            <div className="h-52 px-2 py-3">
              <ResponsiveContainer>
                <LineChart data={courbe} margin={{ left: -18, right: 10, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={c.grille} />
                  <XAxis dataKey="mois" interval={2} {...axe} />
                  <YAxis domain={[0, 100]} {...axe} />
                  <ReferenceLine y={CIBLE} stroke={c.cible} strokeDasharray="4 4" />
                  <Tooltip cursor={{ stroke: c.axe, strokeDasharray: "3 3" }} content={({ active, payload }) => {
                    const p = payload?.[0]?.payload as (typeof courbe)[number] | undefined;
                    return active && p ? <Infobulle titre={`Nés en ${p.mois}`} valeur={`${p.taux} %`} detail={`${p.n} enfants`} /> : null;
                  }} />
                  <Line dataKey="taux" stroke={c.primaire} strokeWidth={2} dot={{ r: 3.5, fill: c.primaire, stroke: c.carte, strokeWidth: 2 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Carte>

          <Carte>
            <CarteEntete titre="Signaux à suivre" icone={AlertTriangle} />
            <ul className="divide-y divide-line">
              {[
                { i: Baby, v: ind.enRetard, l: "enfants avec un vaccin manqué depuis plus de 7 jours" },
                { i: Ruler, v: ind.croissance, l: "enfants à surveiller ou à orienter pour la croissance" },
                { i: Headphones, v: `${Math.round(ind.tauxReponse)} %`, l: `des relances ont reçu une réponse 1 ou 2 (${ind.relances})` },
              ].map((x) => (
                <li key={x.l} className="flex items-center gap-3 px-4 py-2.5">
                  <x.i size={17} className="shrink-0 text-muted" />
                  <span className="tnum w-14 shrink-0 whitespace-nowrap text-[1.05rem] font-semibold">{x.v}</span>
                  <span className="text-[0.88rem] text-fg-soft">{x.l}</span>
                </li>
              ))}
            </ul>
          </Carte>

          <Link href="/pilotage/annonces" className="card group flex items-center gap-3 px-4 py-3 transition-colors hover:border-primary-400">
            <span className="grid size-9 place-items-center rounded-md bg-accent-400 text-dark-950">
              <Megaphone size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Envoyer une annonce vocale</span>
              <span className="block text-[0.85rem] text-muted">Campagne, vitamine A, journée de santé, en éwé</span>
            </span>
            <ChevronRight size={16} className="text-muted group-hover:text-brand-fg" />
          </Link>
        </div>
      </div>
    </>
  );
}
