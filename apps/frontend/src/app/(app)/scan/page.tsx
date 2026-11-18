"use client";

import { Camera, CameraOff, CheckCircle2, Keyboard, Loader2, QrCode, ScanLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { useEnfantsDuPerimetre } from "@/components/shell/compteurs";
import { Bouton, Carte, CarteEntete, EntetePage, Pastille } from "@/components/ui";
import { libelleAge } from "@/lib/dates";
import { useAuJour, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Scanner = { stop: () => Promise<void>; clear: () => void; isScanning: boolean };

export default function Scan() {
  const router = useRouter();
  const role = useStore((s) => s.session?.role);
  const dernier = useStore((s) => s.dernierInscrit);
  const pointer = useStore((s) => s.pointer);
  const perimetre = useEnfantsDuPerimetre();
  const auJour = useAuJour();
  const [camera, setCamera] = useState<"off" | "demarrage" | "on" | "erreur">("off");
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [trouve, setTrouve] = useState<string | null>(null);
  const scanner = useRef<Scanner | null>(null);

  const arreter = async () => {
    const s = scanner.current;
    scanner.current = null;
    if (s?.isScanning) {
      try {
        await s.stop();
        s.clear();
      } catch {}
    }
    setCamera((c) => (c === "erreur" ? c : "off"));
  };

  const ouvrir = (brut: string) => {
    const id = brut.trim().toUpperCase().replace(/^.*\/(DV-[A-Z0-9]{6}).*$/, "$1");
    const e = useStore.getState().enfants.find((x) => x.id === id);
    if (!e) {
      setErreur(`Aucun enfant avec le code ${id || "saisi"}.`);
      return;
    }
    setErreur(null);
    setTrouve(e.id);
    if (role === "educatrice" && !e.presences.includes(auJour)) pointer(e.id);
    void arreter();
    setTimeout(() => router.push(`/enfant/${e.id}?scan=1`), 700);
  };

  const demarrer = async () => {
    setCamera("demarrage");
    setErreur(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const s = new Html5Qrcode("lecteur-qr", { verbose: false });
      scanner.current = s as unknown as Scanner;
      await s.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: (w, h) => ({ width: Math.min(w, h) * 0.7, height: Math.min(w, h) * 0.7 }) },
        (texte) => ouvrir(texte),
        () => {},
      );
      setCamera("on");
    } catch {
      setCamera("erreur");
      setErreur("Impossible d'ouvrir la caméra. Autorisez l'accès, ou saisissez le code de la carte.");
    }
  };

  useEffect(() => {
    return () => {
      void arreter();
    };
  }, []);

  const cartes = [...perimetre.filter((e) => e.id === dernier), ...perimetre.filter((e) => e.demo && e.id !== dernier), ...perimetre.filter((e) => !e.demo)].slice(0, 6);
  const enfantTrouve = perimetre.find((e) => e.id === trouve);

  return (
    <>
      <EntetePage
        titre="Scanner une carte"
        description={role === "educatrice" ? "Le scan note l'arrivée de l'enfant et ouvre sa fiche." : "Le carnet s'ouvre avec le vaccin du jour déjà prérempli."}
        ariane={[{ libelle: "Suivi des enfants" }, { libelle: "Scanner une carte" }]}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Carte className="overflow-hidden">
          <CarteEntete
            titre="Caméra"
            icone={Camera}
            action={
              camera === "on" ? (
                <Bouton taille="sm" variante="secondaire" icone={CameraOff} onClick={arreter}>
                  Éteindre
                </Bouton>
              ) : undefined
            }
          />
          <div className="relative aspect-square bg-dark-950 sm:aspect-[4/3] lg:aspect-square">
            <div id="lecteur-qr" className="absolute inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
            {camera !== "on" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-grille p-8 text-center text-white">
                <span className="grid size-14 place-items-center rounded-full bg-white/10">
                  {camera === "demarrage" ? <Loader2 className="size-6 animate-spin" /> : camera === "erreur" ? <CameraOff className="size-6" /> : <QrCode className="size-6" />}
                </span>
                <p className="mt-3 font-semibold">{camera === "demarrage" ? "Ouverture de la caméra..." : "Caméra éteinte"}</p>
                <p className="mt-1 max-w-xs text-[0.88rem] text-white/60">Placez la carte de l&apos;enfant dans le cadre. Le scan se fait tout seul.</p>
                {camera !== "demarrage" && (
                  <Bouton variante="accent" className="mt-4" icone={ScanLine} onClick={demarrer}>
                    Allumer la caméra
                  </Bouton>
                )}
              </div>
            )}
            <div className="pointer-events-none absolute inset-[16%]">
              {["left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-xl", "right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-xl", "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-xl", "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-xl"].map((c) => (
                <span key={c} className={cn("absolute size-10 border-accent-400", c)} />
              ))}
            </div>
            {enfantTrouve && (
              <div className="absolute inset-0 z-10 flex animate-fade-in flex-col items-center justify-center bg-primary-800/95 text-white">
                <CheckCircle2 className="size-12 text-accent-300" />
                <p className="mt-3 text-xl font-semibold">
                  {enfantTrouve.prenom} {enfantTrouve.nom}
                </p>
                <p className="text-white/70">Ouverture du carnet...</p>
              </div>
            )}
          </div>
        </Carte>

        <div className="space-y-4">
          <Carte>
            <CarteEntete titre="Saisir le code de la carte" description="Si la caméra ne marche pas" icone={Keyboard} />
            <form
              className="flex gap-2 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                ouvrir(code);
              }}
            >
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="DV-XXXXXX" className="input font-mono tracking-widest" aria-label="Code de la carte" />
              <Bouton type="submit" disabled={code.length < 4}>
                Ouvrir
              </Bouton>
            </form>
            {erreur && <p className="-mt-2 px-4 pb-3 text-[0.88rem] text-danger">{erreur}</p>}
          </Carte>

          <Carte>
            <CarteEntete titre="Cartes de démonstration" description="Sans caméra, cliquez sur une carte pour simuler le scan" icone={QrCode} />
            <ul className="grid gap-px bg-line sm:grid-cols-2">
              {cartes.map((e) => (
                <li key={e.id} className="bg-card">
                  <button onClick={() => ouvrir(e.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-card-muted">
                    <span className="rounded border border-line bg-white p-1">
                      <QRCodeSVG value={e.id} size={44} fgColor="#1c1d1f" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {e.prenom} {e.nom}
                      </span>
                      <span className="block truncate text-[0.82rem] text-muted">
                        {libelleAge(e.naissance, auJour)} · <span className="font-mono">{e.id}</span>
                      </span>
                    </span>
                    {e.id === dernier && (
                      <Pastille ton="brand" taille="sm">
                        Nouveau
                      </Pastille>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </Carte>
        </div>
      </div>
    </>
  );
}
