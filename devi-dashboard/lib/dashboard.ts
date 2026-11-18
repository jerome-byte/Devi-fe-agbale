// lib/dashboard.ts — couche de données du tableau de bord (Next.js + supabase-js)
// Le rôle « pilotage » ne lit que les vues v_* (agrégées, anonymisées).
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type Kpis = {
  children_total: number; coverage_pct: number; penta_dropout_pct: number;
  missing_birth_certs: number; listen_pct: number; open_alerts: number;
  growth_flagged_pct: number; high_risk_children: number;
};
export type ZoneSummary = {
  zone_id: number; zone: string; children: number; due_count: number; done_count: number;
  missed_count: number; coverage_pct: number; on_time_pct: number; level: "bon" | "moyen" | "en difficulté";
};
export type Dropout = { zone_id: number; zone: string; penta1_cohort: number; penta3_done: number; dropout_pct: number };
export type BirthCert = { zone_id: number; zone: string; children: number; missing: number; resolved: number; missing_pct: number };
export type Engagement = { zone_id: number; zone: string; sent: number; listened: number; listen_pct: number; responses: number };
export type Growth = { zone_id: number; zone: string; weighed_children: number; stagnation: number; chute: number; flagged_pct: number; underweight_pct: number };
export type TrendPoint = { month: string; due_count: number; done_count: number; coverage_pct: number };
export type AlertSummary = { zone_id: number; zone: string; type: string; open_count: number };
export type DemoBanner = { demo_children: number; total_children: number; contains_demo_data: boolean };

async function view<T>(name: string, order?: string): Promise<T[]> {
  let q = supabase.from(name).select("*");
  if (order) q = q.order(order);
  const { data, error } = await q;
  if (error) throw new Error(`${name}: ${error.message}`);
  return (data ?? []) as T[];
}

export async function loadDashboard() {
  const [kpis, zones, dropout, cert, engagement, growth, trend, alerts, banner] = await Promise.all([
    view<Kpis>("v_kpis"),
    view<ZoneSummary>("v_zone_summary", "coverage_pct"),
    view<Dropout>("v_penta_dropout", "zone_id"),
    view<BirthCert>("v_birth_cert", "zone_id"),
    view<Engagement>("v_message_engagement", "zone_id"),
    view<Growth>("v_growth_by_zone", "zone_id"),
    view<TrendPoint>("v_coverage_trend", "month"),
    view<AlertSummary>("v_alerts_summary"),
    view<DemoBanner>("v_demo_banner"),
  ]);
  return {
    kpis: kpis[0], zones, dropout, cert, engagement, growth, trend, alerts,
    banner: banner[0], // afficher « Données de démonstration » si banner.contains_demo_data
  };
}

// Forme complète des données du tableau de bord, partagée entre la page et
// les composants de présentation.
export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;
