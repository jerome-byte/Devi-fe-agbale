// app/dashboard/components.tsx
// Présentation du tableau de bord. Aucune requête ici : les données agrégées
// arrivent de lib/dashboard.ts, déjà filtrées par les vues v_*.

import Link from "next/link";
import type {
  AlertSummary,
  DashboardData,
  TrendPoint,
  ZoneSummary,
} from "@/lib/dashboard";

const intFmt = new Intl.NumberFormat("fr-FR");

export function fmtInt(value: number | null | undefined): string {
  return value == null ? "–" : intFmt.format(value);
}

export function fmtPct(value: number | null | undefined, digits = 1): string {
  if (value == null) return "–";
  return `${Number(value).toFixed(digits).replace(".", ",")}\u00A0%`;
}

type Level = ZoneSummary["level"];

const LEVEL: Record<Level, { color: string; label: string }> = {
  bon: { color: "var(--color-good)", label: "Bon" },
  moyen: { color: "var(--color-warn)", label: "Moyen" },
  "en difficulté": { color: "var(--color-bad)", label: "En difficulté" },
};

const ALERT_LABELS: Record<string, string> = {
  missed_7d: "Vaccin manqué depuis 7 jours",
  growth_stagnation: "Croissance qui stagne ou chute",
  growth_surveiller: "Insuffisance pondérale à surveiller",
  growth_orient: "Insuffisance pondérale à orienter",
  birth_cert_missing: "Acte de naissance manquant",
  screening_due: "Dépistage à faire",
  referral: "Orientation à suivre",
};

export function PageHeader({
  updatedLabel,
  alertCount,
  busy,
  onRefresh,
}: {
  updatedLabel: string | null;
  alertCount: number | null;
  busy: boolean;
  onRefresh: () => void;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
      <div>
        <p className="text-[15px] font-bold tracking-[-0.01em] text-ink">
          ɖevi ƒe agbalẽ
        </p>
        <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-deep">
          Hack4Children 2026 · UNICEF Togo
        </p>
        <h1 className="mt-3 text-[24px] font-bold leading-[1.15] tracking-[-0.02em] text-ink sm:text-[32px]">
          Suivi des enfants de 0 à 6 ans
        </h1>
        <p className="mt-2 max-w-[64ch] text-sm leading-relaxed text-muted">
          Couverture vaccinale, croissance et alertes par zone. Données agrégées
          et anonymisées pour le pilotage du programme.
        </p>
        <Link
          href="/journal"
          className="mt-3 inline-block text-sm font-bold text-deep underline-offset-4 hover:underline"
        >
          Journal des messages
        </Link>
      </div>

      <div className="ml-auto flex w-full items-end justify-between gap-5 sm:w-auto sm:justify-end">
        <p className="text-left text-xs leading-relaxed text-muted sm:text-right">
          {alertCount != null && (
            <span className="block text-sm font-bold text-ink">
              {fmtInt(alertCount)} alertes ouvertes
            </span>
          )}
          <span className="block">
            {updatedLabel ? `Mis à jour le ${updatedLabel}` : "Chargement…"}
          </span>
        </p>
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className="no-print inline-flex h-10 items-center border border-deep bg-deep px-4 text-sm font-bold text-white transition-colors hover:bg-deep-hover disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? "Actualisation…" : "Actualiser"}
        </button>
      </div>
    </header>
  );
}

export type KpiItem = {
  label: string;
  value: string;
  unit?: string;
  note?: string;
};

export function KpiBand({ items }: { items: KpiItem[] }) {
  return (
    <section
      aria-label="Indicateurs clés"
      className="grid grid-cols-2 gap-px border border-t-2 border-line border-t-unicef bg-line sm:grid-cols-4"
    >
      {items.map((item) => (
        <div key={item.label} className="bg-surface px-4 py-4 sm:px-5 sm:py-5">
          <p className="min-h-[2.5rem] text-[11px] font-bold uppercase leading-snug tracking-[0.1em] text-muted">
            {item.label}
          </p>
          <p className="mt-3 flex items-baseline gap-1 text-[28px] font-bold leading-none tracking-[-0.02em] tabular-nums text-ink">
            {item.value}
            {item.unit && (
              <span className="text-base font-bold text-muted">{item.unit}</span>
            )}
          </p>
          {item.note && (
            <p className="mt-2 text-[11px] leading-snug text-muted">{item.note}</p>
          )}
        </div>
      ))}
    </section>
  );
}

export function Panel({
  title,
  description,
  aside,
  children,
  className = "",
  bodyClassName = "px-5 py-5",
}: {
  title: string;
  description?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`border border-line bg-surface ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-3.5">
        <div>
          <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs leading-snug text-muted">{description}</p>
          )}
        </div>
        {aside}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function ZoneRanking({ zones }: { zones: ZoneSummary[] }) {
  if (zones.length === 0) {
    return (
      <p className="text-sm text-muted">
        Aucun rendez-vous échu à comparer pour le moment.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-4">
        {zones.map((zone) => {
          const level = LEVEL[zone.level] ?? LEVEL["en difficulté"];
          const coverage = Math.max(0, Math.min(100, Number(zone.coverage_pct ?? 0)));
          return (
            <li
              key={zone.zone_id}
              className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-3 sm:grid-cols-[8rem_1fr_5.25rem]"
            >
              <span className="truncate text-[13px] font-bold text-ink">
                {zone.zone}
              </span>
              <div
                className="relative h-2.5 bg-[#e9f0f6]"
                role="img"
                aria-label={`${zone.zone} : ${fmtPct(zone.coverage_pct)}, ${level.label}`}
              >
                <div
                  className="h-full"
                  style={{ width: `${coverage}%`, backgroundColor: level.color }}
                />
                {[70, 85].map((threshold) => (
                  <span
                    key={threshold}
                    aria-hidden="true"
                    className="absolute -top-1 h-[18px] w-px bg-ink/40"
                    style={{ left: `${threshold}%` }}
                  />
                ))}
              </div>
              <span
                className="text-right text-[13px] font-bold tabular-nums"
                style={{ color: level.color }}
              >
                {fmtPct(zone.coverage_pct)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-muted">
        Seuils : bon à partir de 85 %, moyen de 70 à 85 %, en difficulté sous 70 %.
        Les repères verticaux marquent 70 % et 85 %.
      </p>
    </>
  );
}

export function CoverageTrend({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-muted">
        Pas encore assez d’échéances pour tracer une tendance.
      </p>
    );
  }

  const W = 760;
  const H = 220;
  const insetRight = 12;
  const top = 16;
  const bottom = 12;
  const values = points.map((point) => Number(point.coverage_pct));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const lo = Math.max(0, Math.floor((min - 4) / 10) * 10);
  const hi = Math.min(100, Math.ceil((max + 4) / 10) * 10);
  const span = hi - lo || 10;

  const x = (index: number) => (index * (W - insetRight)) / (points.length - 1);
  const y = (value: number) => top + (1 - (value - lo) / span) * (H - top - bottom);
  const yPct = (value: number) => (y(value) / H) * 100;

  const coords = points.map(
    (point, index) => `${x(index)},${y(Number(point.coverage_pct))}`
  );
  const area = `M 0 ${H - bottom} L ${coords.join(" L ")} L ${W - insetRight} ${H - bottom} Z`;
  const grid = ticksFor(lo, hi);

  const lastIndex = points.length - 1;
  const lastValue = Number(points[lastIndex].coverage_pct);

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative w-8 shrink-0" aria-hidden="true">
          {grid.map((value) => (
            <span
              key={value}
              className="absolute right-0 -translate-y-1/2 text-[10px] tabular-nums text-muted"
              style={{ top: `${yPct(value)}%` }}
            >
              {Math.round(value)}
            </span>
          ))}
        </div>

        <div className="relative h-44 flex-1 sm:h-52">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-full w-full"
            role="img"
            aria-labelledby="trend-title trend-desc"
          >
            <title id="trend-title">Couverture vaccinale sur douze mois</title>
            <desc id="trend-desc">
              De {fmtPct(values[0])} à {fmtPct(lastValue)} de rendez-vous échus
              honorés entre {monthLabel(points[0].month)} et{" "}
              {monthLabel(points[lastIndex].month)}.
            </desc>

            {grid.map((value) => (
              <line
                key={value}
                x1={0}
                x2={W}
                y1={y(value)}
                y2={y(value)}
                stroke="var(--color-line)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}

            <path d={area} fill="var(--color-unicef)" opacity={0.08} />
            <polyline
              points={coords.join(" ")}
              fill="none"
              stroke="var(--color-unicef)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <span
            aria-hidden="true"
            className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 border-2 border-white bg-unicef"
            style={{ left: `${(x(lastIndex) / W) * 100}%`, top: `${yPct(lastValue)}%` }}
          />
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        <div className="w-8 shrink-0" aria-hidden="true" />
        <div
          className="grid flex-1"
          style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
          aria-hidden="true"
        >
          {points.map((point, index) => (
            <span
              key={point.month}
              className={`text-center text-[10px] text-muted ${
                index % 2 === 1 ? "max-sm:invisible" : ""
              }`}
            >
              {monthLabel(point.month)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ticksFor(lo: number, hi: number): number[] {
  const span = hi - lo;
  const step = [5, 10, 20, 25, 50].find((candidate) => span / candidate <= 5) ?? 50;
  const ticks: number[] = [];
  for (let value = Math.ceil(lo / step) * step; value <= hi; value += step) {
    ticks.push(value);
  }
  return ticks;
}

function monthLabel(value: string): string {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR", {
    month: "short",
  });
}

export function OpenAlerts({ rows }: { rows: AlertSummary[] }) {
  const totals = Object.entries(
    rows.reduce<Record<string, number>>(
      (acc, row) => ({ ...acc, [row.type]: (acc[row.type] ?? 0) + row.open_count }),
      {}
    )
  )
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (totals.length === 0) {
    return (
      <p className="text-sm text-muted">
        Aucune alerte ouverte. Les alertes apparaissent dès qu’un rappel reste
        sans réponse ou qu’une croissance décroche.
      </p>
    );
  }

  const max = Math.max(...totals.map(([, count]) => count));

  return (
    <>
      <ul className="space-y-3.5">
        {totals.map(([type, count]) => (
          <li key={type} className="flex items-center justify-between gap-4">
            <span className="text-[13px] leading-snug text-ink">
              {ALERT_LABELS[type] ?? type}
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="h-1 w-24 bg-[#e3ebf2]" aria-hidden="true">
                <span
                  className="block h-full bg-deep/70"
                  style={{ width: `${Math.round((count / max) * 100)}%` }}
                />
              </span>
              <span className="w-7 text-right text-sm font-bold tabular-nums text-ink">
                {count}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-5 border-t border-line pt-3 text-[11px] leading-relaxed text-muted">
        Toutes zones et tous types confondus. Une alerte prise en charge sort de ce
        décompte.
      </p>
    </>
  );
}

export function PriorityTable({ data }: { data: DashboardData }) {
  const find = <T extends { zone_id: number }>(rows: T[], id: number) =>
    rows.find((row) => row.zone_id === id);

  const ids = [0, ...data.zones.map((zone) => zone.zone_id)];
  const name = (id: number) =>
    id === 0
      ? "Toutes zones"
      : (data.zones.find((zone) => zone.zone_id === id)?.zone ?? "–");

  const rows = ids.map((id) => ({
    id,
    zone: name(id),
    dropout: find(data.dropout, id)?.dropout_pct,
    missing: find(data.cert, id)?.missing ?? 0,
    missingPct: find(data.cert, id)?.missing_pct,
    listen: find(data.engagement, id)?.listen_pct,
    growth: find(data.growth, id)?.flagged_pct,
  }));

  return (
    <>
      {/* Tableau à partir de 1024 px : en dessous, les cartes gardent les mêmes chiffres */}
      <div className="hidden lg:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink/20">
              <th scope="col" className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                Zone
              </th>
              <th scope="col" className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                Abandon Penta 1→3
              </th>
              <th scope="col" className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                Sans acte de naissance
              </th>
              <th scope="col" className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                Messages écoutés
              </th>
              <th scope="col" className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                Croissance à surveiller
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-line transition-colors hover:bg-canvas ${
                  row.id === 0 ? "border-t-2 border-t-ink/20 font-bold" : ""
                }`}
              >
                <th scope="row" className="px-5 py-3 text-left font-bold text-ink">
                  {row.zone}
                </th>
                <td className="px-3 py-3 text-right tabular-nums">{fmtPct(row.dropout)}</td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {fmtInt(row.missing)}
                  <span className="ml-2 text-xs font-normal text-muted">
                    {fmtPct(row.missingPct)}
                  </span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{fmtPct(row.listen)}</td>
                <td className="px-5 py-3 text-right tabular-nums">{fmtPct(row.growth)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cartes en dessous de 1024 px : mêmes chiffres, lisible sans défilement */}
      <ul className="divide-y divide-line lg:hidden">
        {rows.map((row) => (
          <li key={row.id} className={`px-5 py-4 ${row.id === 0 ? "bg-canvas" : ""}`}>
            <p className="text-sm font-bold text-ink">{row.zone}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              <Metric label="Abandon Penta 1→3" value={fmtPct(row.dropout)} />
              <Metric
                label="Sans acte de naissance"
                value={`${fmtInt(row.missing)} (${fmtPct(row.missingPct)})`}
              />
              <Metric label="Messages écoutés" value={fmtPct(row.listen)} />
              <Metric label="Croissance à surveiller" value={fmtPct(row.growth)} />
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="min-h-[2rem] text-[10.5px] uppercase leading-snug tracking-[0.06em] text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-[13px] font-bold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

const VIEWS = [
  "v_kpis",
  "v_zone_summary",
  "v_penta_dropout",
  "v_birth_cert",
  "v_message_engagement",
  "v_growth_by_zone",
  "v_coverage_trend",
  "v_alerts_summary",
];

export function PageFooter() {
  return (
    <footer className="mt-10 border-t border-line pt-5 text-xs leading-relaxed text-muted">
      <p>
        Source : vues agrégées{" "}
        {VIEWS.map((view, index) => (
          <span key={view}>
            <code className="text-ink">{view}</code>
            {index < VIEWS.length - 1 ? ", " : ". "}
          </span>
        ))}
        Aucune donnée nominative n’est exposée au rôle pilotage.
      </p>
      <p className="mt-1">ɖevi ƒe agbalẽ, Hack4Children 2026, UNICEF Togo.</p>
    </footer>
  );
}
