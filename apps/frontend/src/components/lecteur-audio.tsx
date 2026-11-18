"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// un seul audio à la fois dans toute l'application
let audioCourant: HTMLAudioElement | null = null;

function barres(src: string, n: number) {
  let h = 7;
  for (const c of src) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  return Array.from({ length: n }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    const base = 0.25 + ((h >>> 16) % 1000) / 1400;
    const enveloppe = Math.sin((i / n) * Math.PI) * 0.35 + 0.65;
    return Math.min(1, base * enveloppe);
  });
}

function mmss(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

const STYLES = {
  clair: { bouton: "bg-primary-600 text-white dark:bg-primary-500", actif: "bg-primary-600 dark:bg-primary-400", inactif: "bg-line-strong", texte: "text-muted" },
  whatsapp: { bouton: "bg-[#25d366] text-white", actif: "bg-[#128c7e]", inactif: "bg-[#128c7e]/25", texte: "text-[#667781]" },
  sombre: { bouton: "bg-accent-400 text-dark-950", actif: "bg-accent-300", inactif: "bg-white/20", texte: "text-white/60" },
};

export function LecteurAudio({
  src,
  duree,
  onLecture,
  variante = "clair",
  nbBarres = 34,
  compact,
  className,
}: {
  src: string;
  duree: number;
  onLecture?: () => void;
  variante?: keyof typeof STYLES;
  nbBarres?: number;
  compact?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [lecture, setLecture] = useState(false);
  const [progres, setProgres] = useState(0);
  const [erreur, setErreur] = useState(false);
  const hauteurs = useMemo(() => barres(src, nbBarres), [src, nbBarres]);
  const s = STYLES[variante];

  useEffect(() => {
    const a = new Audio();
    a.preload = "none";
    a.src = src;
    ref.current = a;
    const maj = () => setProgres(a.duration ? a.currentTime / a.duration : 0);
    const fin = () => {
      setLecture(false);
      setProgres(0);
    };
    const pause = () => setLecture(false);
    const err = () => {
      setErreur(true);
      setLecture(false);
    };
    a.addEventListener("timeupdate", maj);
    a.addEventListener("ended", fin);
    a.addEventListener("pause", pause);
    a.addEventListener("error", err);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", maj);
      a.removeEventListener("ended", fin);
      a.removeEventListener("pause", pause);
      a.removeEventListener("error", err);
      if (audioCourant === a) audioCourant = null;
    };
  }, [src]);

  const basculer = async () => {
    const a = ref.current;
    if (!a) return;
    if (lecture) {
      a.pause();
      return;
    }
    if (audioCourant && audioCourant !== a) audioCourant.pause();
    audioCourant = a;
    try {
      await a.play();
      setLecture(true);
      setErreur(false);
      onLecture?.();
    } catch {
      setErreur(true);
    }
  };

  return (
    <div className={cn("flex items-center", compact ? "gap-2" : "gap-3", className)}>
      <button
        type="button"
        onClick={basculer}
        aria-label={lecture ? "Mettre en pause" : "Écouter le message"}
        className={cn("grid shrink-0 place-items-center rounded-full transition active:scale-90", compact ? "size-8" : "size-10", s.bouton)}
      >
        {lecture ? <Pause className="size-3.5 fill-current" /> : <Play className="ml-0.5 size-3.5 fill-current" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className={cn("flex items-center gap-[2px]", compact ? "h-5" : "h-7")}>
          {hauteurs.map((h, i) => (
            <span
              key={i}
              className={cn("w-[3px] shrink-0 rounded-full transition-colors", i / hauteurs.length < progres ? s.actif : s.inactif, lecture && "animate-pulse")}
              style={{ height: `${h * 100}%`, animationDelay: `${(i % 6) * 90}ms` }}
            />
          ))}
        </div>
        {!compact && (
          <div className={cn("mt-0.5 flex justify-between text-[11px] tabular-nums", s.texte)}>
            <span>{erreur ? "Audio indisponible" : lecture ? mmss(progres * duree) : "Message vocal"}</span>
            <span>{mmss(duree)}</span>
          </div>
        )}
      </div>
      {compact && <span className={cn("tnum text-xs", s.texte)}>{erreur ? "erreur" : mmss(lecture ? progres * duree : duree)}</span>}
    </div>
  );
}
