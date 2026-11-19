"use client";

// app/alertes/page.tsx
// Alertes ouvertes : prise en charge et résolution par l'agent.

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/dashboard";
import { ALERT_LABELS } from "../dashboard/components";

type AlertRow = {
  id: string;
  first_name: string;
  zone: string | null;
  center_name: string | null;
  type: string;
  status: string;
  created_at: string;
};

const STATUTS: Record<string, string> = {
  open: "Ouverte",
  acknowledged: "En cours",
};

export default function AlertesPage() {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [filtre, setFiltre] = useState<"open" | "acknowledged" | "all">("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function charger() {
      const statuts = filtre === "all" ? ["open", "acknowledged"] : [filtre];
      const { data, error: fetchError } = await supabase
        .from("v_alerts_list")
        .select("*")
        .in("status", statuts)
        .order("created_at", { ascending: false })
        .limit(150);

      if (!active) return;
      if (fetchError) setError(fetchError.message);
      else {
        setRows((data ?? []) as AlertRow[]);
        setError(null);
      }
      setLoading(false);
    }
    void charger();
    return () => {
      active = false;
    };
  }, [filtre]);

  async function agir(id: string, rpc: "ack_alert" | "resolve_alert") {
    setBusy(id);
    const { error: rpcError } = await supabase.rpc(rpc, { p_id: id });
    if (rpcError) {
      setError(rpcError.message);
    } else {
      const nouveau = rpc === "ack_alert" ? "acknowledged" : "resolved";
      setRows((actuelles) =>
        actuelles
          .map((row) => (row.id === id ? { ...row, status: nouveau } : row))
          .filter((row) => filtre === "all" || row.status === filtre)
      );
    }
    setBusy(null);
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="no-print h-1 bg-unicef" />

      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
        <header className="border-b border-line pb-6">
          <nav aria-label="Navigation" className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-bold text-deep">
            <Link href="/dashboard" className="underline-offset-4 hover:underline">Tableau de bord</Link>
            <Link href="/regles" className="underline-offset-4 hover:underline">Règles</Link>
            <Link href="/journal" className="underline-offset-4 hover:underline">Journal des messages</Link>
          </nav>
          <h1 className="mt-3 text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-ink sm:text-[32px]">
            Alertes
          </h1>
          <p className="mt-2 max-w-[64ch] text-sm leading-relaxed text-muted">
            Prise en charge des alertes générées par le moteur : vaccin manqué,
            croissance, acte de naissance. Données de démonstration.
          </p>
        </header>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <p className="text-xs text-muted">
            {loading ? "Chargement…" : `${rows.length} alertes affichées`}
          </p>
          <label className="flex items-center gap-2 text-xs text-muted">
            Statut
            <select
              value={filtre}
              onChange={(event) => {
                setLoading(true);
                setFiltre(event.target.value as "open" | "acknowledged" | "all");
              }}
              className="h-9 border border-line bg-surface px-2 text-xs text-ink"
            >
              <option value="open">Ouvertes</option>
              <option value="acknowledged">En cours</option>
              <option value="all">Toutes</option>
            </select>
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-4 border border-bad/30 bg-[#fdf4f4] px-4 py-3 text-sm text-bad">
            {error}
          </p>
        )}

        <div className="mt-4 border border-line bg-surface">
          {loading ? (
            <ul className="divide-y divide-line">
              {Array.from({ length: 6 }).map((_, index) => (
                <li key={index} className="flex items-center gap-4 px-4 py-4">
                  <div className="h-3 w-40 animate-pulse bg-line motion-reduce:animate-none" />
                  <div className="ml-auto h-7 w-32 animate-pulse bg-line motion-reduce:animate-none" />
                </li>
              ))}
            </ul>
          ) : rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">Aucune alerte pour ce filtre.</p>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <p className="text-[13px] font-bold text-ink">
                      {ALERT_LABELS[row.type] ?? row.type}
                      <span className="ml-2 text-[11px] font-normal text-muted">
                        {STATUTS[row.status] ?? row.status}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                      {row.first_name} · {row.center_name ?? "centre inconnu"} ·{" "}
                      {formatDate(row.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {row.status === "open" && (
                      <button
                        type="button"
                        disabled={busy === row.id}
                        onClick={() => agir(row.id, "ack_alert")}
                        className="h-8 border border-line px-2.5 text-xs font-bold text-ink transition-colors hover:bg-canvas disabled:opacity-50"
                      >
                        Prendre en charge
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy === row.id}
                      onClick={() => agir(row.id, "resolve_alert")}
                      className="h-8 border border-deep px-2.5 text-xs font-bold text-deep transition-colors hover:bg-deep hover:text-white disabled:opacity-50"
                    >
                      Résoudre
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="mt-10 border-t border-line pt-5 text-xs leading-relaxed text-muted">
          <p>ɖevi ƒe agbalẽ, Hack4Children 2026, UNICEF Togo.</p>
        </footer>
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
