"use client";

// app/journal/page.tsx
// Journal des messages : chaque vocal du parcours, écoutable sans téléphone.
// Données de démonstration uniquement ; les prénoms sont fictifs.

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/dashboard";
import {
  MESSAGE_LABELS,
  PARCOURS,
  resolveAudio,
  type ResolvedAudio,
} from "@/lib/audio-catalog";

type LogRow = {
  id: string;
  first_name: string;
  center_name: string | null;
  zone: string | null;
  template_code: string;
  channel: string;
  status: string;
  language: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  response_key: number | null;
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Programmé",
  sent: "Envoyé",
  delivered: "Livré",
  listened: "Écouté",
  failed: "Échec",
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  voice: "Appel",
};

const DEMO_NAME = "Kossi";
const DEMO_CENTER = "Centre de santé de Bè-Kpota";

export default function JournalPage() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [onlyAudio, setOnlyAudio] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error: fetchError } = await supabase
        .from("v_message_log")
        .select("*")
        .order("scheduled_for", { ascending: false })
        .limit(60);

      if (!active) return;
      if (fetchError) setError(fetchError.message);
      else setRows((data ?? []) as LogRow[]);
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const parcours = PARCOURS.map((template) => ({
    template,
    audio: resolveAudio(template, DEMO_NAME, DEMO_CENTER),
  }));

  const withAudio = rows.filter(
    (row) => resolveAudio(row.template_code, row.first_name, row.center_name ?? "") !== null
  ).length;

  const visible = rows
    .filter((row) => (filter === "all" ? true : row.template_code === filter))
    .filter((row) =>
      onlyAudio
        ? resolveAudio(row.template_code, row.first_name, row.center_name ?? "") !== null
        : true
    );

  return (
    <div className="min-h-screen bg-canvas">
      <div className="no-print h-1 bg-unicef" />

      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
        <header className="border-b border-line pb-6">
          <Link
            href="/dashboard"
            className="text-xs font-bold text-deep underline-offset-4 hover:underline"
          >
            Retour au tableau de bord
          </Link>
          <h1 className="mt-3 text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-ink sm:text-[32px]">
            Journal des messages
          </h1>
          <p className="mt-2 max-w-[64ch] text-sm leading-relaxed text-muted">
            Chaque vocal du parcours, écoutable sans téléphone. Les messages sont
            préparés par la base et envoyés sur WhatsApp par l’application.
          </p>
        </header>

        <p className="mt-4 border-l-2 border-demo bg-demo-bg px-4 py-2 text-xs leading-relaxed text-demo">
          <span className="font-bold">Données de démonstration.</span> Prénoms et
          centres fictifs, aucune donnée réelle.
        </p>

        <section className="mt-8" aria-labelledby="parcours-title">
          <h2 id="parcours-title" className="text-[15px] font-bold text-ink">
            Parcours de {DEMO_NAME}
          </h2>
          <p className="mt-1 text-xs text-muted">
            Bè-Kpota, les six messages du parcours de démonstration.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {parcours.map(({ template, audio }) => (
              <article key={template} className="border border-line bg-surface p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-bold text-ink">
                    {MESSAGE_LABELS[template] ?? template}
                  </h3>
                  {audio && (
                    <span className="text-[10px] tabular-nums text-muted">
                      {audio.duree.toFixed(1).replace(".", ",")} s
                    </span>
                  )}
                </div>
                {audio ? (
                  <>
                    <p className="mt-2 text-xs leading-relaxed text-muted">
                      {audio.texteFr}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink">
                      {audio.texteEwe}
                    </p>
                    <AudioPlayer audio={audio} />
                  </>
                ) : (
                  <p className="mt-3 text-xs text-muted">
                    Audio indisponible pour ce message.
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="log-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="log-title" className="text-[15px] font-bold text-ink">
                Journal
              </h2>
              <p className="mt-1 text-xs text-muted">
                {loading
                  ? "Chargement…"
                  : `${visible.length} messages affichés, ${withAudio} avec audio`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={onlyAudio}
                  onChange={(event) => setOnlyAudio(event.target.checked)}
                  className="h-3.5 w-3.5 accent-[#0e4c92]"
                />
                Avec audio
              </label>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="h-9 border border-line bg-surface px-2 text-xs text-ink"
                aria-label="Filtrer par type de message"
              >
                <option value="all">Tous les messages</option>
                {Object.entries(MESSAGE_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-4 border border-bad/30 bg-[#fdf4f4] px-4 py-3 text-sm text-bad">
              Impossible de charger le journal : {error}
            </p>
          )}

          <div className="mt-4 border border-line bg-surface">
            {loading ? (
              <ul className="divide-y divide-line">
                {Array.from({ length: 6 }).map((_, index) => (
                  <li key={index} className="flex items-center gap-4 px-4 py-4">
                    <div className="h-3 w-16 animate-pulse bg-line motion-reduce:animate-none" />
                    <div className="h-3 w-40 animate-pulse bg-line motion-reduce:animate-none" />
                    <div className="ml-auto h-7 w-40 animate-pulse bg-line motion-reduce:animate-none" />
                  </li>
                ))}
              </ul>
            ) : visible.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">
                Aucun message pour ce filtre.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {visible.map((row) => {
                  const audio = resolveAudio(
                    row.template_code,
                    row.first_name,
                    row.center_name ?? ""
                  );
                  return (
                    <li
                      key={row.id}
                      className="grid gap-3 px-4 py-3 sm:grid-cols-[7rem_1fr_minmax(0,18rem)] sm:items-center"
                    >
                      <div className="text-xs leading-relaxed text-muted">
                        <p className="font-bold text-ink">{formatDate(row.scheduled_for)}</p>
                        <p>{STATUS_LABELS[row.status] ?? row.status}</p>
                      </div>

                      <div>
                        <p className="text-[13px] font-bold text-ink">
                          {MESSAGE_LABELS[row.template_code] ?? row.template_code}
                        </p>
                        <p className="text-[11px] leading-relaxed text-muted">
                          {row.first_name} · {row.center_name ?? "centre inconnu"}
                        </p>
                        <p className="text-[11px] leading-relaxed text-muted">
                          {CHANNEL_LABELS[row.channel] ?? row.channel}
                          {row.response_key === 1 && " · réponse : viendra"}
                          {row.response_key === 2 && " · réponse : empêchement"}
                        </p>
                      </div>

                      <div>
                        {audio ? (
                          <AudioPlayer audio={audio} compact />
                        ) : (
                          <p className="text-[11px] leading-relaxed text-muted">
                            Audio non disponible pour ce prénom ou ce centre.
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <footer className="mt-10 border-t border-line pt-5 text-xs leading-relaxed text-muted">
          <p>
            Voix en éwé : Meta MMS-TTS (facebook/mms-tts-ewe), licence CC BY-NC 4.0.
          </p>
          <p className="mt-1">ɖevi ƒe agbalẽ, Hack4Children 2026, UNICEF Togo.</p>
        </footer>
      </div>
    </div>
  );
}

function AudioPlayer({ audio, compact = false }: { audio: ResolvedAudio; compact?: boolean }) {
  return (
    <audio
      controls
      preload="none"
      src={audio.url}
      className={`w-full ${compact ? "h-9" : "mt-3 h-10"}`}
    >
      Votre navigateur ne peut pas lire cet audio.
    </audio>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "Sans date";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}
