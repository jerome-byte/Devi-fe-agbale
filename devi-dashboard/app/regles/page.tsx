"use client";

// app/regles/page.tsx
// Règles du moteur : rappels, croissance, vitamine A, calendrier PEV.

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/dashboard";

type Calendrier = {
  contact: number;
  age_libelle: string;
  age_valeur: number;
  age_unite: string;
  vaccin_code: string;
  vaccin_nom: string;
  dose: string;
  statut: string;
};

const RAPPELS = [
  ["J-2", "rappel_j2", "Vocal WhatsApp deux jours avant le rendez-vous."],
  ["Veille", "rappel_veille", "Vocal WhatsApp la veille, avec le prénom et le centre."],
  ["Jour J", "rappel_jour_j", "Vocal WhatsApp le matin du rendez-vous."],
  ["J+3", "manque_3j", "Vocal avec les boutons 1 (je viens) et 2 (empêchement)."],
  ["J+7", "alerte agent", "Alerte à l’agent de santé, dans la liste priorisée."],
  ["Réponse 2", "reponse_empechement", "Confirmation à la famille et alerte à l’agent."],
];

const CROISSANCE = [
  ["z < −2", "À surveiller", "Poids, taille ou IMC : message croissance et alerte agent."],
  ["z < −3", "À orienter", "Alerte prioritaire à l’agent de santé."],
  ["IMC > +2", "À surveiller", "Surpoids : alerte à l’agent de santé."],
  ["Stagnation", "À surveiller", "Poids identique ou en baisse après un mois, ou chute d’une ligne de z."],
];

const VITAMINE = [
  ["Vitamine A", "6, 12, 18, 24, 30, 36, 42, 48 et 54 mois", "100 000 UI à 6 mois, 200 000 UI ensuite"],
  ["Déparasitage", "12, 18, 24, 30, 36, 42, 48 et 54 mois", "Albendazole 200 mg avant 24 mois, 400 mg ensuite"],
];

export default function ReglesPage() {
  const [calendrier, setCalendrier] = useState<Calendrier[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function charger() {
      const { data, error: fetchError } = await supabase
        .from("calendrier_vaccinal")
        .select("*")
        .order("contact");
      if (!active) return;
      if (fetchError) setError(fetchError.message);
      else setCalendrier((data ?? []) as Calendrier[]);
    }
    void charger();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-canvas">
      <div className="no-print h-1 bg-unicef" />

      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
        <header className="border-b border-line pb-6">
          <nav aria-label="Navigation" className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-bold text-deep">
            <Link href="/dashboard" className="underline-offset-4 hover:underline">Tableau de bord</Link>
            <Link href="/alertes" className="underline-offset-4 hover:underline">Alertes</Link>
            <Link href="/journal" className="underline-offset-4 hover:underline">Journal des messages</Link>
          </nav>
          <h1 className="mt-3 text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-ink sm:text-[32px]">
            Règles du moteur
          </h1>
          <p className="mt-2 max-w-[64ch] text-sm leading-relaxed text-muted">
            Ce que la base décide, quand, et avec quel message. Les valeurs sont
            celles validées par le référent médical.
          </p>
        </header>

        <div className="mt-6 space-y-6">
          <section className="border border-line bg-surface">
            <div className="border-b border-line px-5 py-3.5">
              <h2 className="text-[15px] font-bold text-ink">Rappels vaccinaux</h2>
              <p className="mt-1 text-xs text-muted">
                Un message par enfant et par contact vaccinal, pas un par vaccin.
              </p>
            </div>
            <ul className="divide-y divide-line">
              {RAPPELS.map(([quand, code, texte]) => (
                <li key={quand} className="grid gap-1 px-5 py-3 sm:grid-cols-[6rem_11rem_1fr] sm:gap-4">
                  <span className="text-xs font-bold text-ink">{quand}</span>
                  <span className="text-xs tabular-nums text-muted">{code}</span>
                  <span className="text-[13px] leading-relaxed text-ink">{texte}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="border border-line bg-surface">
            <div className="border-b border-line px-5 py-3.5">
              <h2 className="text-[15px] font-bold text-ink">Croissance</h2>
              <p className="mt-1 text-xs text-muted">
                Trois indicateurs : poids, taille et IMC pour l’âge. Le statut retenu
                est le plus grave. Mesure mensuelle avant 2 ans, trimestrielle ensuite.
              </p>
            </div>
            <ul className="divide-y divide-line">
              {CROISSANCE.map(([regle, statut, texte]) => (
                <li key={regle} className="grid gap-1 px-5 py-3 sm:grid-cols-[6rem_8rem_1fr] sm:gap-4">
                  <span className="text-xs font-bold text-ink">{regle}</span>
                  <span className="text-xs text-muted">{statut}</span>
                  <span className="text-[13px] leading-relaxed text-ink">{texte}</span>
                </li>
              ))}
            </ul>
            <p className="border-t border-line px-5 py-3 text-[11px] leading-relaxed text-muted">
              Taille et IMC : table 0-2 ans avant 24 mois, 2-5 ans ensuite. Aucun
              diagnostic n’est affiché, seulement « à surveiller » ou « à orienter ».
            </p>
          </section>

          <section className="border border-line bg-surface">
            <div className="border-b border-line px-5 py-3.5">
              <h2 className="text-[15px] font-bold text-ink">Vitamine A et déparasitage</h2>
            </div>
            <ul className="divide-y divide-line">
              {VITAMINE.map(([produit, ages, dose]) => (
                <li key={produit} className="grid gap-1 px-5 py-3 sm:grid-cols-[8rem_1fr] sm:gap-4">
                  <span className="text-xs font-bold text-ink">{produit}</span>
                  <span className="text-[13px] leading-relaxed text-ink">
                    {ages}
                    <span className="block text-[11px] text-muted">{dose}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="border border-line bg-surface">
            <div className="border-b border-line px-5 py-3.5">
              <h2 className="text-[15px] font-bold text-ink">Calendrier PEV du Togo</h2>
              <p className="mt-1 text-xs text-muted">
                23 doses en 9 contacts, de la naissance à 15 mois.
              </p>
            </div>

            {error && (
              <p role="alert" className="px-5 py-3 text-sm text-bad">
                Impossible de charger le calendrier : {error}
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink/20 text-[11px] uppercase tracking-[0.08em] text-muted">
                    <th scope="col" className="px-5 py-2 text-left font-bold">Contact</th>
                    <th scope="col" className="px-3 py-2 text-left font-bold">Âge</th>
                    <th scope="col" className="px-3 py-2 text-left font-bold">Vaccin</th>
                    <th scope="col" className="px-3 py-2 text-left font-bold">Dose</th>
                    <th scope="col" className="px-5 py-2 text-left font-bold">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {calendrier.map((row) => (
                    <tr key={`${row.contact}-${row.vaccin_code}-${row.dose}`} className="border-b border-line">
                      <td className="px-5 py-2 tabular-nums">{row.contact}</td>
                      <td className="px-3 py-2">{row.age_libelle}</td>
                      <td className="px-3 py-2">
                        {row.vaccin_nom}
                        <span className="ml-2 text-[11px] text-muted">{row.vaccin_code}</span>
                      </td>
                      <td className="px-3 py-2 tabular-nums">{row.dose}</td>
                      <td className="px-5 py-2 text-[11px] text-muted">{row.statut}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="border border-line bg-surface px-5 py-4">
            <h2 className="text-[15px] font-bold text-ink">Canaux</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink">
              Pour le prototype, tous les messages partent sur WhatsApp, y compris
              l’accusé de rendez-vous manqué avec les boutons 1 et 2. L’appel vocal
              automatique est prévu pour la finale.
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-deep">
              <Link href="/journal" className="underline-offset-4 hover:underline">Écouter les messages</Link>
              <Link href="/alertes" className="underline-offset-4 hover:underline">Voir les alertes</Link>
            </div>
          </section>
        </div>

        <footer className="mt-10 border-t border-line pt-5 text-xs leading-relaxed text-muted">
          <p>ɖevi ƒe agbalẽ, Hack4Children 2026, UNICEF Togo.</p>
        </footer>
      </div>
    </div>
  );
}
