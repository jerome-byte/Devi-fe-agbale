import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Confidentialité" };

export default function Confidentialite() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <Link href="/">
        <Logo />
      </Link>
      <h1 className="mt-10 font-vitrine text-4xl font-bold tracking-tight">Confidentialité</h1>
      <div className="mt-6 space-y-4 text-[0.98rem] leading-relaxed">
        <p>
          ɖevi ƒe agbalẽ est un prototype réalisé pour le Hack4Children 2026 (UNICEF Togo). Il ne contient que des enfants
          fictifs.
        </p>
        <p>
          Les seules données réelles traitées sont les numéros de téléphone des membres de l&apos;équipe qui testent les
          messages WhatsApp. Ils servent uniquement à envoyer les rappels vocaux de la démonstration et à recevoir les
          réponses « 1 » ou « 2 ». Ils ne sont ni vendus ni transmis à des tiers, en dehors de Meta qui achemine les
          messages WhatsApp.
        </p>
        <p>Les données sont hébergées chez Supabase et supprimées à la fin du concours.</p>
        <p>Pour toute demande, écrivez à l&apos;équipe du projet par l&apos;intermédiaire des organisateurs du Hack4Children.</p>
      </div>
    </div>
  );
}
