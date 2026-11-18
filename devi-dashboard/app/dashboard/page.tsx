"use client";

// app/dashboard/page.tsx
// Écran de pilotage (UNICEF, ministère, districts). La page ne lit que les
// vues agrégées v_* exposées par lib/dashboard.ts.

import { useCallback, useEffect, useState } from "react";
import { loadDashboard, type DashboardData } from "@/lib/dashboard";
import {
  CoverageTrend,
  fmtInt,
  fmtPct,
  KpiBand,
  OpenAlerts,
  PageFooter,
  PageHeader,
  Panel,
  PriorityTable,
  ZoneRanking,
  type KpiItem,
} from "./components";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await loadDashboard();
      setData(next);
      setError(null);
      setUpdatedAt(new Date());
    } catch (caught) {
      setError((caught as Error).message);
    }
  }, []);

  // Chargement initial puis rafraîchissement toutes les 30 s : les vues sont
  // recalculées à chaque lecture, il suffit de les relire.
  useEffect(() => {
    let active = true;
    const tick = () => {
      if (active) void load();
    };
    tick();
    const timer = setInterval(tick, 30_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [load]);

  const refresh = () => {
    setBusy(true);
    void load().finally(() => setBusy(false));
  };

  const updatedLabel = updatedAt
    ? `${updatedAt.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      })} à ${updatedAt.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : null;

  const alertTotal = data
    ? data.alerts.reduce((sum, row) => sum + row.open_count, 0)
    : null;

  return (
    <div className="min-h-screen bg-canvas">
      <div className="no-print h-1 bg-unicef" />

      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
        <PageHeader
          updatedLabel={updatedLabel}
          alertCount={alertTotal}
          busy={busy}
          onRefresh={refresh}
        />

        {data?.banner?.contains_demo_data && (
          <p className="mt-4 border-l-2 border-demo bg-demo-bg px-4 py-2 text-xs leading-relaxed text-demo">
            <span className="font-bold">Données de démonstration.</span>{" "}
            {fmtInt(data.banner.demo_children)} enfants fictifs, aucune donnée
            réelle.
          </p>
        )}

        <main className="mt-6 space-y-6">
          {error && <ErrorPanel message={error} onRetry={refresh} />}
          {!data && !error && <DashboardSkeleton />}

          {data?.kpis && (
            <>
              <KpiBand items={buildKpis(data)} />

              <div className="grid gap-6 lg:grid-cols-12">
                <Panel
                  className="lg:col-span-7"
                  title="Couverture vaccinale par zone"
                  description="Rendez-vous échus honorés, zone par zone."
                >
                  <ZoneRanking zones={data.zones} />
                </Panel>

                <Panel
                  className="lg:col-span-5"
                  title="Alertes ouvertes"
                  description="Ce qui attend une action sur le terrain."
                >
                  <OpenAlerts rows={data.alerts} />
                </Panel>
              </div>

              <Panel
                title="Où agir en priorité"
                description="Quatre signaux comparés entre zones, toutes zones confondues en première ligne."
                bodyClassName="px-0 py-0"
              >
                <PriorityTable data={data} />
              </Panel>

              <Panel
                title="Évolution sur 12 mois"
                description="Part des rendez-vous échus honorés, par mois d’échéance."
                aside={
                  data.trend.length > 1 ? (
                    <span className="text-xs text-muted">
                      Dernier mois{" "}
                      <span className="font-bold tabular-nums text-ink">
                        {fmtPct(data.trend[data.trend.length - 1].coverage_pct)}
                      </span>
                    </span>
                  ) : undefined
                }
              >
                <CoverageTrend points={data.trend} />
              </Panel>
            </>
          )}
        </main>

        <PageFooter />
      </div>
    </div>
  );
}

function buildKpis(data: DashboardData): KpiItem[] {
  const kpis = data.kpis;
  return [
    { label: "Enfants suivis", value: fmtInt(kpis.children_total) },
    {
      label: "Couverture vaccinale",
      value: fmtPct(kpis.coverage_pct),
      note: "rendez-vous échus honorés",
    },
    {
      label: "Abandon Penta 1→3",
      value: fmtPct(kpis.penta_dropout_pct),
      note: "cohorte Penta 3 échue",
    },
    {
      label: "Sans acte de naissance",
      value: fmtInt(kpis.missing_birth_certs),
      note: `sur ${fmtInt(kpis.children_total)} enfants`,
    },
    {
      label: "Messages écoutés",
      value: fmtPct(kpis.listen_pct),
      note: "vocal WhatsApp et appel",
    },
    { label: "Alertes ouvertes", value: fmtInt(kpis.open_alerts), note: "tous types" },
    {
      label: "Croissance à surveiller",
      value: fmtPct(kpis.growth_flagged_pct),
      note: "stagnation ou chute",
    },
    {
      label: "Enfants à risque élevé",
      value: fmtInt(kpis.high_risk_children),
      note: "score de risque de 10 et plus",
    },
  ];
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Chargement des indicateurs">
      <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="bg-surface px-4 py-5">
            <div className="h-2.5 w-20 animate-pulse bg-line motion-reduce:animate-none" />
            <div className="mt-4 h-7 w-24 animate-pulse bg-line motion-reduce:animate-none" />
            <div className="mt-3 h-2 w-16 animate-pulse bg-line motion-reduce:animate-none" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="h-64 animate-pulse border border-line bg-surface motion-reduce:animate-none lg:col-span-7" />
        <div className="h-64 animate-pulse border border-line bg-surface motion-reduce:animate-none lg:col-span-5" />
      </div>
      <span className="sr-only">Chargement des indicateurs…</span>
    </div>
  );
}

function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="border border-bad/30 bg-[#fdf4f4] px-5 py-4">
      <p className="text-sm font-bold text-bad">Impossible de charger les indicateurs</p>
      <p className="mt-1 text-sm leading-relaxed text-ink/80">
        Vérifiez la connexion à Supabase et les droits de lecture sur les vues.
        Détail technique : {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 h-9 border border-ink px-3 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-white"
      >
        Réessayer
      </button>
    </div>
  );
}
