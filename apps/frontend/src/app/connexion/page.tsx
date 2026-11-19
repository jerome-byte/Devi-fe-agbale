"use client";

import { ArrowLeft, BarChart3, ChevronRight, HeartPulse, Info, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoMarque } from "@/components/logo";
import { ACCUEIL, LIBELLE_ROLE } from "@/components/shell/nav";
import { COMPTES_DEMO, useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

const ROLES: { role: Role; icone: typeof HeartPulse; texte: string }[] = [
  { role: "agent", icone: HeartPulse, texte: "Inscrire, scanner une carte, voir qui appeler en premier." },
  { role: "educatrice", icone: Store, texte: "Pointer les arrivées, mesurer, faire les dépistages du mois." },
  { role: "pilotage", icone: BarChart3, texte: "Couverture, abandons, actes manquants et annonces vocales." },
];

export default function Connexion() {
  const connecter = useStore((s) => s.connecter);
  const router = useRouter();

  const entrer = (r: Role) => {
    connecter(r);
    router.push(ACCUEIL[r]);
  };

  return (
    <div className="grid min-h-screen bg-card lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-dark-900 lg:block">
        <Image src="/images/mere-bebe.jpg" alt="" fill priority sizes="45vw" className="object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-900/70 to-dark-900/40" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link href="/" className="flex items-center gap-3">
            <LogoMarque className="size-9" />
            <span className="font-vitrine text-xl font-bold text-white">ɖevi ƒe agbalẽ</span>
          </Link>
          <div className="max-w-md">
            <p className="text-[1.6rem] font-semibold leading-snug text-white">Le carnet vivant de chaque enfant, de la naissance à 6 ans.</p>
            <p className="mt-3 text-white/65">Vaccins, croissance, acte de naissance et rappels vocaux en éwé, pour les centres de santé et les garderies de Lomé.</p>
          </div>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col px-5 py-8 sm:px-12">
        <Link href="/" className="inline-flex w-fit items-center gap-1.5 text-[0.88rem] text-muted hover:text-fg">
          <ArrowLeft size={15} /> Retour au site
        </Link>
        <div className="flex w-full max-w-md flex-1 flex-col justify-center py-10 sm:mx-auto lg:mx-0 lg:ml-[10%]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <LogoMarque className="size-8" />
            <span className="font-vitrine text-xl font-bold">ɖevi ƒe agbalẽ</span>
          </div>
          <h1 className="text-2xl font-semibold">Choisir un compte de démonstration</h1>
          <p className="mt-1 text-muted">Chaque compte voit uniquement ce dont il a besoin. Vous pourrez en changer à tout moment depuis le menu du compte.</p>

          <ul className="mt-6 divide-y divide-line overflow-hidden rounded-lg border border-line">
            {ROLES.map((r) => {
              const c = COMPTES_DEMO[r.role];
              return (
                <li key={r.role}>
                  <button onClick={() => entrer(r.role)} className="group flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-card-muted">
                    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-soft text-brand-fg">
                      <r.icone size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{LIBELLE_ROLE[r.role]}</span>
                      <span className="block text-[0.85rem] text-muted">
                        {c.nom} · {c.lieu}
                      </span>
                      <span className="mt-0.5 block text-[0.85rem] text-fg-soft">{r.texte}</span>
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-fg" />
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="mt-5 flex items-start gap-2 text-[0.85rem] text-muted">
            <Info size={15} className="mt-0.5 shrink-0" />
            Enfants, mères et numéros sont fictifs. Vos actions restent dans ce navigateur.
          </p>
        </div>
      </main>
    </div>
  );
}
