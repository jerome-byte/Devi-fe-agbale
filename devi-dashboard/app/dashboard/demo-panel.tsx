"use client";

// app/dashboard/demo-panel.tsx
// Commandes de démonstration : moteur de règles et avance rapide sur Kossi.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/dashboard";

type DemoChild = {
  id: string;
  first_name: string;
  center_name: string | null;
  zone: string | null;
};

type RuleRow = { rule: string; n: number };

const EVENTS = [
  { label: "J-2", event: "J-2" },
  { label: "Veille", event: "J-1" },
  { label: "Jour J", event: "J0" },
  { label: "Manqué +3 j", event: "MISSED_3" },
  { label: "Manqué +7 j", event: "MISSED_7" },
];

export function DemoPanel({ onDone }: { onDone: () => void }) {
  const [child, setChild] = useState<DemoChild | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ label: string; rows: RuleRow[] } | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("v_demo_child")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (!active) return;
        if (fetchError) setError(fetchError.message);
        else setChild(data as DemoChild);
      });
    return () => {
      active = false;
    };
  }, []);

  async function appeler(label: string, rpc: string, args: Record<string, unknown>) {
    setBusy(label);
    setError(null);
    setResult(null);
    const { data, error: rpcError } = await supabase.rpc(rpc, args);
    if (rpcError) {
      setError(rpcError.message);
    } else {
      setResult({ label, rows: Array.isArray(data) ? (data as RuleRow[]) : [] });
      onDone();
    }
    setBusy(null);
  }

  const actif = busy !== null;

  return (
    <section className="no-print border border-line bg-surface">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3.5">
        <div>
          <h2 className="text-[15px] font-bold text-ink">Commandes de démonstration</h2>
          <p className="mt-1 text-xs text-muted">
            {child
              ? `${child.first_name}, ${child.center_name ?? "centre inconnu"}`
              : "Chargement de l’enfant de démonstration…"}
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
          Données fictives
        </span>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={actif}
            onClick={() => appeler("Moteur de règles", "run_rules", {})}
            className="h-9 border border-deep bg-deep px-3 text-xs font-bold text-white transition-colors hover:bg-deep-hover disabled:opacity-60"
          >
            {busy === "Moteur de règles" ? "Exécution…" : "Exécuter le moteur"}
          </button>
          <span className="text-xs text-muted">
            Crée les rappels J-2, veille et jour J, puis les alertes.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-ink">Avance rapide :</span>
          {EVENTS.map((item) => (
            <button
              key={item.event}
              type="button"
              disabled={!child || actif}
              onClick={() =>
                child &&
                appeler(item.label, "demo_fast_forward", {
                  p_child_id: child.id,
                  p_event: item.event,
                })
              }
              className="h-8 border border-line px-2.5 text-xs font-bold text-ink transition-colors hover:bg-canvas disabled:opacity-50"
            >
              {busy === item.label ? "…" : item.label}
            </button>
          ))}
          <button
            type="button"
            disabled={!child || actif}
            onClick={() =>
              child && appeler("Réinitialiser", "demo_reset_child", { p_child_id: child.id })
            }
            className="ml-1 h-8 border border-bad/40 px-2.5 text-xs font-bold text-bad transition-colors hover:bg-[#fdf4f4] disabled:opacity-50"
          >
            Réinitialiser
          </button>
        </div>

        {error && (
          <p role="alert" className="border border-bad/30 bg-[#fdf4f4] px-3 py-2 text-xs text-bad">
            {error}
          </p>
        )}

        {result && (
          <div className="border-t border-line pt-3 text-xs">
            <p className="font-bold text-ink">{result.label}</p>
            {result.rows.length === 0 ? (
              <p className="mt-1 text-muted">Terminé, aucune action à signaler.</p>
            ) : (
              <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted">
                {result.rows.map((row) => (
                  <li key={row.rule}>
                    {row.rule} <span className="font-bold text-ink">{row.n}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
