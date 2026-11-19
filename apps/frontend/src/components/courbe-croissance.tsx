"use client";

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ageMois, dateCourte } from "@/lib/dates";
import { courbeReference, zScore } from "@/lib/oms";
import { couleursGraphe, useSombre } from "@/lib/prefs";
import type { Enfant } from "@/lib/types";

export function CourbeCroissance({ enfant, auJour }: { enfant: Enfant; auJour: string }) {
  const c = couleursGraphe(useSombre());
  const age = ageMois(enfant.naissance, auJour);
  const jusqua = age < 21 ? 24 : Math.min(60, Math.ceil((age + 6) / 6) * 6);
  const pas = jusqua <= 24 ? 3 : 6;
  const ref = courbeReference(enfant.sexe, jusqua).map((r) => ({
    mois: r.mois,
    zoneOrienter: [0, r.m3] as [number, number],
    zoneSurveiller: [r.m3, r.m2] as [number, number],
    zoneNormale: [r.m2, r.p2] as [number, number],
    m3: r.m3,
    m2: r.m2,
    med: r.med,
    p2: r.p2,
    p3: r.p3,
  }));
  const points = enfant.pesees.map((p) => ({
    mois: Math.round(ageMois(enfant.naissance, p.date) * 100) / 100,
    poids: p.poidsKg,
    taille: p.tailleCm,
    date: p.date,
    lieu: p.lieu,
  }));
  const data = [...ref, ...points].sort((a, b) => a.mois - b.mois);
  const axe = { tick: { fontSize: 12, fill: c.axe }, axisLine: false, tickLine: false } as const;

  return (
    <div className="h-72 w-full sm:h-80">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 4, left: -14 }}>
          <CartesianGrid stroke={c.grille} strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="mois"
            type="number"
            domain={[0, jusqua]}
            ticks={Array.from({ length: jusqua / pas + 1 }, (_, i) => i * pas)}
            tickFormatter={(v) => `${v} m`}
            {...axe}
          />
          <YAxis unit=" kg" width={58} {...axe} />
          <Area dataKey="zoneOrienter" stroke="none" fill={c.dangerDoux} fillOpacity={0.8} isAnimationActive={false} connectNulls />
          <Area dataKey="zoneSurveiller" stroke="none" fill={c.warnDoux} fillOpacity={0.9} isAnimationActive={false} connectNulls />
          <Area dataKey="zoneNormale" stroke="none" fill={c.normalDoux} fillOpacity={0.6} isAnimationActive={false} connectNulls />
          {(["m3", "m2", "p2", "p3"] as const).map((k) => (
            <Line key={k} dataKey={k} stroke={k === "m3" ? c.danger : k === "m2" ? c.warn : c.axe} strokeOpacity={0.6} strokeWidth={1} dot={false} isAnimationActive={false} connectNulls />
          ))}
          <Line dataKey="med" stroke={c.primaire} strokeDasharray="5 5" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
          <Line
            dataKey="poids"
            stroke={c.texte}
            strokeWidth={2}
            connectNulls
            dot={{ r: 4, fill: c.carte, stroke: c.texte, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: c.texte, stroke: c.carte, strokeWidth: 2 }}
            animationDuration={900}
          />
          <Tooltip
            cursor={{ stroke: c.axe, strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const p = payload?.find((x) => x.dataKey === "poids")?.payload as (typeof points)[number] | undefined;
              if (!active || !p?.poids) return null;
              const z = zScore(enfant.sexe, p.mois, p.poids);
              return (
                <div className="rounded-md border border-line bg-card px-3 py-2 text-sm shadow-lg">
                  <p className="font-semibold">
                    {p.poids.toLocaleString("fr-FR")} kg{p.taille ? ` · ${p.taille.toLocaleString("fr-FR")} cm` : ""}
                  </p>
                  <p className="text-xs text-muted">
                    {dateCourte(p.date)} · {p.lieu === "garderie" ? "garderie" : "centre de santé"}
                  </p>
                  <p className="text-xs text-muted">z-score {(Math.round(z * 10) / 10).toLocaleString("fr-FR")}</p>
                </div>
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LegendeCroissance() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-4 rounded-sm bg-primary-100 dark:bg-primary-900" /> Entre -2 et +2
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-4 rounded-sm bg-accent-200 dark:bg-[#3a2c18]" /> Sous -2 : à surveiller
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-4 rounded-sm bg-[#fbe2d5] dark:bg-[#3a2020]" /> Sous -3 : à orienter
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0 w-4 border-t-2 border-dashed border-primary-600" /> Médiane
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full border-2 border-fg bg-card" /> Mesures de l&apos;enfant
      </span>
    </div>
  );
}
