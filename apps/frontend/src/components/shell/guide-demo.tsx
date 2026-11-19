"use client";

import { ArrowRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { MODE_BASE } from "@/lib/base";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

export function GuideDemo({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  const router = useRouter();
  const connecter = useStore((s) => s.connecter);
  const deconnecter = useStore((s) => s.deconnecter);
  const roleActuel = useStore((s) => s.session?.role);
  const dernier = useStore((s) => s.dernierInscrit);
  if (!ouvert) return null;

  const aller = (role: Role, href: string) => {
    onFermer();
    if (MODE_BASE && role !== roleActuel) {
      // Étape d'un autre rôle : connexion avec le compte de ce rôle, puis retour à l'étape.
      deconnecter();
      router.push(`/connexion?role=${role}&suite=${encodeURIComponent(href)}`);
      return;
    }
    connecter(role);
    router.push(href);
  };

  const etapes = [
    {
      titre: "Inscrire un enfant",
      texte: "L'agente inscrit « Kossi ». Le code QR et le calendrier des vaccins apparaissent aussitôt.",
      role: "agent" as Role,
      href: "/inscription",
      bouton: "Ouvrir l'inscription",
    },
    {
      titre: "Message de bienvenue",
      texte: "La mère reçoit un vocal en éwé sur WhatsApp avec la carte QR. On l'écoute ici, sans téléphone.",
      role: "agent" as Role,
      href: dernier ? `/enfant/${dernier}?onglet=telephone` : "/inscription",
      bouton: dernier ? "Voir le téléphone de la mère" : "Inscrire d'abord un enfant",
    },
    {
      titre: "Avance rapide",
      texte: "Rappel deux jours avant, puis rendez-vous manqué : la mère répond 1 ou 2, la réponse remonte.",
      role: "agent" as Role,
      href: dernier ? `/enfant/${dernier}?onglet=telephone` : "/inscription",
      bouton: "Ouvrir l'avance rapide",
    },
    {
      titre: "Scan au centre de santé",
      texte: "L'agente scanne la carte : le vaccin prévu est prérempli. Elle saisit la pesée, la courbe OMS se trace.",
      role: "agent" as Role,
      href: "/scan",
      bouton: "Ouvrir le scanner",
    },
    {
      titre: "Tableau de bord",
      texte: "Couverture vaccinale, abandons et actes de naissance manquants, mis à jour pour le district.",
      role: "pilotage" as Role,
      href: "/pilotage",
      bouton: "Voir le tableau de bord",
    },
  ];

  return (
    <div className="fixed inset-0 z-[75] flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={onFermer} />
      <aside className="relative flex h-full w-full max-w-md animate-slide-in-right flex-col border-l border-line bg-card shadow-2xl" aria-label="Parcours de démonstration">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p className="text-[0.82rem] font-medium text-brand-fg">Parcours de démonstration</p>
            <h2 className="text-lg font-semibold">Trois minutes, cinq étapes</h2>
            <p className="mt-0.5 text-[0.88rem] text-muted">Chaque étape ouvre le bon écran avec le bon compte.</p>
          </div>
          <button onClick={onFermer} className="grid size-8 place-items-center rounded-md text-muted hover:bg-card-muted hover:text-fg" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <ol className="flex-1 overflow-y-auto">
          {etapes.map((e, i) => (
            <li key={e.titre} className="border-b border-line">
              <button onClick={() => aller(e.role, e.href)} className="group flex w-full gap-4 px-5 py-4 text-left hover:bg-card-muted">
                <span className="tnum grid size-7 shrink-0 place-items-center rounded-full bg-primary-600 text-sm font-semibold text-white">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{e.titre}</span>
                  <span className="mt-0.5 block text-[0.88rem] text-muted">{e.texte}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-[0.88rem] font-medium text-brand-fg group-hover:underline">
                    {e.bouton} <ArrowRight size={14} />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className="border-t border-line px-5 py-3 text-[0.82rem] text-muted">Pour recommencer, menu du compte, « Réinitialiser la démo ».</p>
      </aside>
    </div>
  );
}
