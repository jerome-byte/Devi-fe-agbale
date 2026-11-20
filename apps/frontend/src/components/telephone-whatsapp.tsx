"use client";

import Image from "next/image";
import { BadgeCheck, CheckCheck, ChevronLeft, Phone, Video } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useRef, useState } from "react";
import { heure } from "@/lib/dates";
import { useStore } from "@/lib/store";
import type { Enfant, MessageEnvoye } from "@/lib/types";
import { cn, masquerTelephone } from "@/lib/utils";
import { audioPour, messageCatalogue, texteMessage } from "@/lib/voix";
import { LecteurAudio } from "./lecteur-audio";

export function TelephoneWhatsApp({ enfant, className }: { enfant: Enfant; className?: string }) {
  const tous = useStore((s) => s.messages);
  const repondre = useStore((s) => s.repondre);
  const ecouter = useStore((s) => s.ecouter);
  const fil = useMemo(
    () => tous.filter((m) => m.enfantId === enfant.id).sort((a, b) => a.date.localeCompare(b.date)),
    [tous, enfant.id],
  );
  const bas = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bas.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [fil.length]);

  return (
    <div className={cn("relative mx-auto w-full max-w-[340px]", className)}>
      <div className="rounded-[44px] bg-dark-950 p-2.5 shadow-xl ring-1 ring-black/10">
        <div className="relative overflow-hidden rounded-[36px] bg-[#efe7dd]">
          <div className="absolute left-1/2 top-2 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-dark-950" />
          {/* entête WhatsApp */}
          <div className="relative z-10 flex items-center gap-2 bg-[#075e54] px-3 pb-2.5 pt-10 text-white">
            <ChevronLeft className="size-5 opacity-80" />
            <Image src="/images/logo-marque-v2.png" unoptimized alt="" width={72} height={72} className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="flex items-center gap-1 truncate text-[14px] font-semibold">
                ɖevi ƒe agbalẽ <BadgeCheck className="size-3.5 fill-[#25d366] text-[#075e54]" />
              </p>
              <p className="text-[11px] text-white/70">Compte professionnel</p>
            </div>
            <Video className="size-5 opacity-80" />
            <Phone className="ml-3 size-[18px] opacity-80" />
          </div>
          <div
            className="sans-barre h-[460px] overflow-y-auto px-3 py-3"
            style={{
              backgroundImage:
                "radial-gradient(circle at 10px 10px, rgb(7 94 84 / 0.06) 1.5px, transparent 0), radial-gradient(circle at 30px 25px, rgb(7 94 84 / 0.05) 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          >
            <p className="mx-auto mb-3 w-fit rounded-lg bg-[#fff5c4] px-3 py-1.5 text-center text-[11px] leading-snug text-[#3b4a54] shadow-sm">
              Téléphone de {enfant.mere.nom.split(" ")[0]}
              <br />
              <span className="text-[#667781]">{masquerTelephone(enfant.mere.telephone)}</span>
            </p>
            {fil.length === 0 && (
              <p className="mt-16 text-center text-xs text-[#667781]">Aucun message pour l&apos;instant.</p>
            )}
            <AnimatePresence initial={false}>
              {fil.map((m) => (
                <Bulle key={m.id} m={m} enfant={enfant} onRepondre={(c) => repondre(m.id, c)} onEcoute={() => ecouter(m.id)} />
              ))}
            </AnimatePresence>
            <div ref={bas} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Bulle({
  m,
  enfant,
  onRepondre,
  onEcoute,
}: {
  m: MessageEnvoye;
  enfant: Enfant;
  onRepondre: (c: "1" | "2") => void;
  onEcoute: () => void;
}) {
  const cat = messageCatalogue(m.messageId);
  const audio = audioPour(m.messageId, enfant);
  const texte = texteMessage(m.messageId, enfant);
  const [voirTexte, setVoirTexte] = useState(false);
  if (!cat) return null;
  const attendReponse = cat.boutons.length > 0 && !m.reponse;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="mb-2"
    >
      <div className="max-w-[86%] rounded-2xl rounded-tl-sm bg-white px-2.5 pb-1.5 pt-2 shadow-sm">
        {audio ? (
          <LecteurAudio src={audio.src} duree={audio.duree} variante="whatsapp" nbBarres={26} onLecture={onEcoute} />
        ) : (
          <p className="text-[13px] text-[#111b21]">{texte.fr}</p>
        )}
        {voirTexte && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 space-y-1.5 border-t border-black/10 pt-2 text-[12px] leading-snug">
            <p className="text-[#111b21]">{texte.ewe}</p>
            <p className="italic text-[#667781]">{texte.fr}</p>
          </motion.div>
        )}
        <div className="mt-1 flex items-center justify-between gap-3">
          <button onClick={() => setVoirTexte((v) => !v)} className="text-[11px] font-semibold text-[#128c7e]">
            {voirTexte ? "Masquer le texte" : "Voir le texte"}
          </button>
          <span className="flex items-center gap-1 text-[10px] text-[#667781]">
            {heure(m.date)}
            <CheckCheck className={cn("size-3.5", m.statut !== "envoye" ? "text-[#34b7f1]" : "text-[#8696a0]")} />
          </span>
        </div>
      </div>

      {m.messageId === "bienvenue" && (
        <div className="mt-2 max-w-[70%] rounded-2xl rounded-tl-sm bg-white p-2 shadow-sm">
          <div className="flex items-center gap-2 rounded-xl bg-primary-700 p-2.5 text-white">
            <div className="rounded-lg bg-white p-1">
              <QRCodeSVG value={enfant.id} size={52} fgColor="#14211b" />
            </div>
            <div className="text-[11px] leading-tight">
              <p className="font-display text-[13px] font-bold">{enfant.prenom}</p>
              <p className="opacity-75">Carte de suivi</p>
              <p className="mt-1 font-mono text-[10px] opacity-90">{enfant.id}</p>
            </div>
          </div>
          <p className="px-1 pt-1.5 text-[11px] text-[#667781]">Montrez cette carte au centre de santé.</p>
        </div>
      )}

      {cat.boutons.length > 0 && (
        <div className="mt-1 flex max-w-[86%] gap-1">
          {cat.boutons.map(({ bouton: b, libelle }) => (
            <button
              key={b}
              title={libelle}
              disabled={!attendReponse}
              onClick={() => onRepondre(b as "1" | "2")}
              className={cn(
                "flex-1 rounded-xl bg-white py-2 text-center text-[15px] font-bold text-[#128c7e] shadow-sm transition",
                attendReponse ? "hover:bg-[#f0fdf4] active:scale-95" : "opacity-50",
                m.reponse === b && "ring-2 ring-[#25d366]",
              )}
            >
              {b}
            </button>
          ))}
        </div>
      )}
      {attendReponse && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-1.5 max-w-[86%] text-center text-[11px] font-medium text-[#075e54]"
        >
          Touchez 1 ou 2 pour répondre à la place de la mère
        </motion.p>
      )}

      {m.reponse && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="ml-auto mt-2 w-fit rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3 py-1.5 shadow-sm"
        >
          <p className="text-[15px] font-bold text-[#111b21]">{m.reponse}</p>
          <p className="text-right text-[10px] text-[#667781]">{m.reponse === "1" ? "Je viendrai" : "J'ai un empêchement"}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
