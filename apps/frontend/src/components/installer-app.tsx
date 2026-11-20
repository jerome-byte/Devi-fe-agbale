"use client";

// Message « Installer l'application ».
//
// - Android, Chrome, Edge : le navigateur annonce que l'application est installable
//   (événement beforeinstallprompt) ; le bouton « Installer » ouvre sa fenêtre d'installation.
// - iPhone et iPad (Safari) : pas d'installation automatique ; le message explique le geste
//   « Partager, puis Sur l'écran d'accueil ».
// - Rien n'est affiché si l'application est déjà installée (ouverte depuis l'écran d'accueil).
// - « Plus tard » est retenu dans ce navigateur : le message revient à la première visite,
//   après un effacement des données de navigation, ou 7 jours plus tard.

import { Download, Share, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Bouton } from "@/components/ui";

type InvitationInstallation = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const CLE_REFUS = "devi-installation-plus-tard";
const DELAI_REFUS_MS = 7 * 24 * 3600 * 1000;

function dejaInstallee() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function refusRecent() {
  try {
    const t = Number(localStorage.getItem(CLE_REFUS));
    return Boolean(t) && Date.now() - t < DELAI_REFUS_MS;
  } catch {
    return false;
  }
}

function surIos() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

export function InstallerApp() {
  const [invitation, setInvitation] = useState<InvitationInstallation | null>(null);
  const [mode, setMode] = useState<"cache" | "android" | "ios">("cache");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    if (dejaInstallee()) return;

    const surInvitation = (e: Event) => {
      e.preventDefault(); // on garde l'invitation pour notre propre bouton
      setInvitation(e as InvitationInstallation);
      if (!refusRecent()) setMode("android");
    };
    const surInstallee = () => {
      setMode("cache");
      setInvitation(null);
    };
    window.addEventListener("beforeinstallprompt", surInvitation);
    window.addEventListener("appinstalled", surInstallee);

    // Safari (iPhone, iPad) n'envoie jamais beforeinstallprompt : on explique le geste.
    const minuterie = setTimeout(() => {
      if (surIos() && !refusRecent()) setMode("ios");
    }, 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", surInvitation);
      window.removeEventListener("appinstalled", surInstallee);
      clearTimeout(minuterie);
    };
  }, []);

  if (mode === "cache") return null;

  const plusTard = () => {
    try {
      localStorage.setItem(CLE_REFUS, String(Date.now()));
    } catch {
      /* navigation privée : le message reviendra à la prochaine visite */
    }
    setMode("cache");
  };

  const installer = async () => {
    if (!invitation) return;
    await invitation.prompt();
    const { outcome } = await invitation.userChoice;
    setInvitation(null);
    if (outcome === "accepted") setMode("cache");
    else plusTard();
  };

  return (
    <div role="dialog" aria-labelledby="installer-titre" className="fixed inset-x-3 bottom-3 z-[65] animate-fade-in sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96">
      <div className="card flex gap-3 p-3.5 shadow-xl">
        <Image src="/icons/icon-192-v2.png" unoptimized alt="" width={48} height={48} className="size-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p id="installer-titre" className="font-semibold leading-tight">
            Installer ɖevi ƒe agbalẽ
          </p>
          {mode === "android" ? (
            <p className="mt-0.5 text-[0.85rem] text-muted">Ouvrez l&apos;application en un geste depuis l&apos;écran d&apos;accueil, comme une application du téléphone.</p>
          ) : (
            <p className="mt-0.5 text-[0.85rem] text-muted">
              Touchez <Share size={14} className="inline -translate-y-px" aria-label="Partager" /> Partager, puis <strong className="font-medium text-fg">Sur l&apos;écran d&apos;accueil</strong>.
            </p>
          )}
          <div className="mt-2.5 flex gap-2">
            {mode === "android" ? (
              <>
                <Bouton taille="sm" icone={Download} onClick={installer}>
                  Installer
                </Bouton>
                <Bouton taille="sm" variante="fantome" onClick={plusTard}>
                  Plus tard
                </Bouton>
              </>
            ) : (
              <Bouton taille="sm" variante="secondaire" onClick={plusTard}>
                Compris
              </Bouton>
            )}
          </div>
        </div>
        <button onClick={plusTard} aria-label="Fermer" className="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-card-muted hover:text-fg">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
