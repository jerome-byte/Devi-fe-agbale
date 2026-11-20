"use client";

import { AlertTriangle, BarChart3, Baby, ChevronRight, FileX2, Headphones, Info, LineChart as IconeCourbe, MapPin, Megaphone, RefreshCw, Ruler, ShieldAlert, Syringe, TableProperties } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Carte, CarteEntete, EntetePage, Indicateur, Onglets, Pastille, Selecteur, Tableau } from "@/components/ui";
import { MODE_BASE } from "@/lib/base";
import { dateLongue } from "@/lib/dates";
import { ZONES_LOCALES, chargerVuesPilotage, pilotageBase, pilotageLocal, zonesBase, type DonneesPilotage, type VuesPilotage } from "@/lib/pilotage";
import { couleursGraphe, useSombre } from "@/lib/prefs";
import { useAuJour, useStore } from "@/lib/store";
import type { CentreId } from "@/lib/types";
import { cn } from "@/lib/utils";

const CIBLE = 90;
const AIDE_RISQUE =
  "Score de risque d'abandon calculé pour chaque enfant : 3 points par rendez-vous de vaccin manqué, 2 sans acte de naissance, 2 si la courbe de poids stagne ou chute, 1 par message vocal non écouté (3 au plus), 1 si la famille habite à plus de 4 km du centre. Risque élevé : 10 points ou plus. Seuls les totaux sont affichés ici.";
const RAFRAICHIR_MS = 30_000;

/**
 * Mode base : les vues agrégées de Cherif, relues toutes les 30 secondes.
 * Mode local : les calculs dans le navigateur, sur les enfants fictifs.
 */
function useDonneesPilotage(zone: string) {
  const enfants = useStore((s) => s.enfants);
  const messages = useStore((s) => s.messages);
  const auJour = useAuJour();
  const [vues, setVues] = useState<VuesPilotage | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(MODE_BASE);

  // Lecture des vues : l'état n'est modifié qu'après la réponse de la base.
  const lireVues = useCallback(async () => {
    try {
      const v = await chargerVuesPilotage();
      setVues(v);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    if (!MODE_BASE) return;
    const premier = window.setTimeout(() => void lireVues(), 0);
    const t = window.setInterval(() => void lireVues(), RAFRAICHIR_MS);
    return () => {
      window.clearTimeout(premier);
      window.clearInterval(t);
    };
  }, [lireVues]);

  const recharger = useCallback(() => {
    setChargement(true);
    void lireVues();
  }, [lireVues]);

  const donnees: DonneesPilotage | null = useMemo(() => {
    if (!MODE_BASE) return pilotageLocal(enfants, messages, zone as "tout" | CentreId, auJour);
    return vues ? pilotageBase(vues, Number(zone)) : null;
  }, [vues, enfants, messages, zone, auJour]);

  const options = MODE_BASE ? (vues ? zonesBase(vues) : [{ valeur: "0", libelle: "Toutes les zones" }]) : ZONES_LOCALES;
  return { donnees, options, erreur, chargement, recharger, auJour };
}

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
  const c = couleursGraphe(useSombre());
  const [zone, setZone] = useState<string>(MODE_BASE ? "0" : "tout");
  const [vue, setVue] = useState<"graphe" | "tableau">("graphe");
  const { donnees: d, options, erreur, chargement, recharger, auJour } = useDonneesPilotage(zone);

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
          <Selecteur value={zone} onChange={(e) => setZone(e.target.value)} className="w-60" aria-label="Zone">
            {options.map((o) => (
              <option key={o.valeur} value={o.valeur}>
                {o.libelle}
              </option>
            ))}
          </Selecteur>
        }
      />

      {erreur && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-[0.88rem] text-danger">
          <AlertTriangle size={16} className="shrink-0" />
          <span className="flex-1">Les indicateurs de la base sont indisponibles. {erreur}</span>
          <button onClick={recharger} className="inline-flex items-center gap-1 font-medium underline">
            <RefreshCw size={14} /> Réessayer
          </button>
        </div>
      )}

      {!d ? (
        <div className="card px-4 py-10 text-center text-muted">{chargement ? "Chargement des indicateurs…" : "Aucun indicateur à afficher."}</div>
      ) : (
      <>
      <div className="mb-4 flex items-center gap-2 rounded-md border border-info/20 bg-info-soft px-3 py-2 text-[0.88rem] text-info">
        <Info size={16} className="shrink-0" /> Données de démonstration : {d.total} enfants fictifs.{" "}
        {d.source === "base" ? "Chiffres calculés par le moteur de règles, mis à jour toutes les 30 secondes." : ""} Aucune donnée nominative n&apos;est affichée ici.
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Indicateur libelle="Penta 3 à jour" valeur={`${Math.round(d.penta3.taux)} %`} sous={`${d.penta3.faits} enfants sur ${d.penta3.eligibles} · cible ${CIBLE} %`} icone={Syringe} ton={d.penta3.taux >= CIBLE ? "ok" : "warn"} />
        <Indicateur libelle="Abandon Penta 1 à 3" valeur={`${Math.round(d.abandon.taux)} %`} sous={`${d.abandon.perdus} enfants perdus en route`} icone={AlertTriangle} ton={d.abandon.taux <= 10 ? "ok" : "danger"} />
        <Indicateur libelle="Sans acte de naissance" valeur={`${Math.round(d.sansActe.taux)} %`} sous={`${d.sansActe.n} enfants à accompagner`} icone={FileX2} ton={d.sansActe.taux <= 10 ? "ok" : "warn"} />
        <Indicateur
          libelle={
            <span className="inline-flex items-center gap-1" title={AIDE_RISQUE}>
              Enfants à risque élevé <Info size={13} className="shrink-0" aria-label={AIDE_RISQUE} />
            </span>
          }
          valeur={d.risque.n}
          sous={`${Math.round(d.risque.taux)} % des enfants · score de 10 ou plus`}
          icone={ShieldAlert}
          ton={d.risque.taux <= 10 ? "ok" : d.risque.taux <= 25 ? "warn" : "danger"}
        />
        <Indicateur libelle="Vocaux écoutés" valeur={`${Math.round(d.ecoute.taux)} %`} sous={d.ecoute.detail} icone={Headphones} ton={d.ecoute.taux >= 70 ? "ok" : "warn"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Carte>
            <CarteEntete titre={d.textes.zones} description={`Du plus faible au plus fort, cible ${CIBLE} %`} icone={MapPin} />
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
              <div className="px-2 py-3" style={{ height: Math.max(240, d.zones.length * 30 + 40) }}>
                <ResponsiveContainer>
                  <BarChart data={d.zones} layout="vertical" margin={{ left: 4, right: 40, top: 14, bottom: 0 }} barCategoryGap={5}>
                    <CartesianGrid horizontal={false} stroke={c.grille} />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v} %`} {...axe} />
                    <YAxis type="category" dataKey="q" width={112} {...axe} tick={{ fontSize: 12.5, fill: c.texte }} />
                    <ReferenceLine x={CIBLE} stroke={c.cible} strokeDasharray="4 4" label={{ value: "cible", position: "top", fontSize: 11, fill: c.axe }} />
                    <Tooltip cursor={{ fill: c.primaireDouce, opacity: 0.4 }} content={({ active, payload }) => {
                      const p = payload?.[0]?.payload as (typeof d.zones)[number] | undefined;
                      return active && p ? <Infobulle titre={p.q} valeur={`${p.penta3} % à jour`} detail={`${p.n} enfants · abandon ${p.abandon} % · sans acte ${p.sansActe} % · ${p.risque} à risque élevé`} /> : null;
                    }} />
                    <Bar dataKey="penta3" fill={c.primaire} radius={[0, 3, 3, 0]} maxBarSize={16} label={{ position: "right", fontSize: 11.5, fill: c.axe, formatter: (v: unknown) => `${v} %` }}>
                      {d.zones.map((q) => (
                        <Cell key={q.q} fill={c.primaire} fillOpacity={d.zones.some((z) => z.choisie) && !q.choisie ? 0.35 : 1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Tableau>
                <thead>
                  <tr>
                    <th>{d.source === "base" ? "Zone" : "Quartier"}</th>
                    <th className="text-right">Enfants</th>
                    <th className="text-right">Penta 3</th>
                    <th className="text-right">Abandon</th>
                    <th className="text-right">Sans acte</th>
                    <th className="text-right" title={AIDE_RISQUE}>
                      Risque élevé
                    </th>
                    <th className="text-right">{d.source === "base" ? "RDV manqués" : "Retards"}</th>
                    <th>Niveau</th>
                  </tr>
                </thead>
                <tbody>
                  {d.zones.map((q) => {
                    const n = niveau(q.penta3);
                    return (
                      <tr key={q.q} className={cn(q.choisie && "bg-brand-soft")}>
                        <td className="font-medium">{q.q}</td>
                        <td className="tnum text-right">{q.n}</td>
                        <td className="tnum text-right">{q.penta3} %</td>
                        <td className={cn("tnum text-right", q.abandon > 10 && "text-danger")}>{q.abandon} %</td>
                        <td className={cn("tnum text-right", q.sansActe > 15 && "text-warn")}>{q.sansActe} %</td>
                        <td className={cn("tnum text-right", q.n > 0 && q.risque / q.n > 0.25 && "font-semibold text-danger")}>{q.risque}</td>
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
            <CarteEntete titre="Couverture par vaccin" description={d.textes.vaccins} icone={Syringe} />
            <div className="h-60 px-2 py-3">
              <ResponsiveContainer>
                <BarChart data={d.antigenes} margin={{ left: -16, right: 8, top: 14, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke={c.grille} />
                  <XAxis dataKey="nom" interval={0} {...axe} />
                  <YAxis domain={[0, 100]} {...axe} />
                  <ReferenceLine y={CIBLE} stroke={c.cible} strokeDasharray="4 4" />
                  <Tooltip cursor={{ fill: c.primaireDouce, opacity: 0.4 }} content={({ active, payload }) => {
                    const p = payload?.[0]?.payload as (typeof d.antigenes)[number] | undefined;
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
            <CarteEntete titre="Évolution sur 12 mois" description={d.textes.courbe} icone={IconeCourbe} />
            <div className="h-52 px-2 py-3">
              <ResponsiveContainer>
                <LineChart data={d.courbe} margin={{ left: -18, right: 10, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={c.grille} />
                  <XAxis dataKey="mois" interval={2} {...axe} />
                  <YAxis domain={[0, 100]} {...axe} />
                  <ReferenceLine y={CIBLE} stroke={c.cible} strokeDasharray="4 4" />
                  <Tooltip cursor={{ stroke: c.axe, strokeDasharray: "3 3" }} content={({ active, payload }) => {
                    const p = payload?.[0]?.payload as (typeof d.courbe)[number] | undefined;
                    return active && p ? <Infobulle titre={d.source === "base" ? `Échéances de ${p.mois}` : `Nés en ${p.mois}`} valeur={`${p.taux} %`} detail={d.source === "base" ? `${p.n} rendez-vous` : `${p.n} enfants`} /> : null;
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
                { i: Baby, v: d.signaux.enRetard, l: d.textes.enRetard },
                { i: Ruler, v: d.signaux.croissance, l: "enfants à surveiller ou à orienter pour la croissance" },
                { i: Headphones, v: d.signaux.reponses, l: d.signaux.reponsesDetail },
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
      )}
    </>
  );
}
