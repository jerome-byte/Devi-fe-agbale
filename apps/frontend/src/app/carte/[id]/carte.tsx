"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { LogoMarque } from "@/components/logo";
import { Bouton, Squelette } from "@/components/ui";
import { dateCourte } from "@/lib/dates";
import { calendrierEnfant } from "@/lib/pev";
import { useEnfant, useStore } from "@/lib/store";
import { codeCarte } from "@/lib/utils";
import { CENTRES } from "@/lib/voix";

export function CarteImprimable({ id }: { id: string }) {
  const hydrate = useStore((s) => s.hydrate);
  const e = useEnfant(id);
  if (!hydrate) return <Squelette className="m-10 h-80" />;
  if (!e) return <p className="p-10 text-center">Carte introuvable.</p>;
  const cal = calendrierEnfant(e, e.naissance);

  return (
    <div className="min-h-dvh bg-app px-4 py-8 print:bg-white print:p-0">
      <div className="pas-imprime mx-auto mb-6 flex max-w-3xl items-center justify-between">
        <Link href={`/enfant/${e.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg">
          <ArrowLeft className="size-4" /> Retour au carnet
        </Link>
        <Bouton onClick={() => window.print()} icone={Printer}>
          Imprimer
        </Bouton>
      </div>

      <div className="mx-auto grid max-w-3xl gap-6 print:max-w-none print:grid-cols-2 print:gap-4 md:grid-cols-2">
        {/* recto */}
        <div className="relative aspect-[1.586] overflow-hidden rounded-[22px] bg-primary-800 p-5 text-white shadow-lg print:shadow-none">
          <div className="bg-grille absolute inset-0" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-center gap-2">
              <LogoMarque className="size-7" />
              <span className="font-vitrine text-sm font-bold">ɖevi ƒe agbalẽ</span>
              <span className="ml-auto text-[10px] uppercase tracking-wider text-accent-300">Carte de suivi</span>
            </div>
            <div className="mt-auto flex items-end gap-4">
              <div className="rounded-xl bg-white p-2">
                <QRCodeSVG value={e.id} size={104} fgColor="#14211b" />
              </div>
              <div className="min-w-0 pb-1">
                <p className="font-vitrine text-2xl font-bold leading-tight">{e.prenom}</p>
                <p className="text-sm text-white/80">{e.nom}</p>
                <p className="mt-2 font-mono text-sm tracking-widest text-accent-300">{codeCarte(e.id)}</p>
              </div>
            </div>
          </div>
        </div>
        {/* verso */}
        <div className="aspect-[1.586] overflow-hidden rounded-[22px] border border-line bg-white p-5 text-[#1c1d1f] shadow-sm print:shadow-none">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#696a6e]">Rendez-vous de vaccination</p>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
            {cal.map((r) => (
              <li key={r.numero} className="flex justify-between border-b border-dashed border-line py-0.5">
                <span className="font-semibold">{r.libelle}</span>
                <span className="text-muted">{dateCourte(r.date)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-snug text-muted">
            {e.centreNom ?? CENTRES[e.centre]} · Montrez cette carte à chaque visite. Le code ne contient aucune donnée personnelle.
          </p>
        </div>
      </div>
    </div>
  );
}
