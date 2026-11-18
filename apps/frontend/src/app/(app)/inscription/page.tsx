"use client";

import {
  ArrowLeft,
  ArrowRight,
  Baby,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FastForward,
  FileCheck2,
  FileX2,
  Hospital,
  Info,
  Printer,
  Sparkles,
  Syringe,
  UserPlus,
  Users,
  Volume2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState } from "react";
import { TelephoneWhatsApp } from "@/components/telephone-whatsapp";
import { Bouton, Carte, CarteCorps, CarteEntete, Champ, EntetePage, LienBouton, LigneInfo, Pastille, Selecteur, Tableau } from "@/components/ui";
import { ajouterJours, dateCourte, ecartJours, libelleAge } from "@/lib/dates";
import { calendrierEnfant } from "@/lib/pev";
import { GARDERIES, QUARTIERS } from "@/lib/seed";
import { useAuJour, useEnfant, useStore } from "@/lib/store";
import type { CentreId, Langue, Sexe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CENTRES, SEXE_PRENOM, prenomCanonique } from "@/lib/voix";

const PRENOMS = ["Kossi", "Ama", "Yao", "Afi", "Kodjo", "Akossiwa", "Komi", "Sena", "Abla", "Mawuli"];

const LANGUES: { v: Langue; l: string; dispo: boolean }[] = [
  { v: "ewe", l: "Éwé", dispo: true },
  { v: "mina", l: "Mina", dispo: false },
  { v: "kabiye", l: "Kabiyè", dispo: false },
  { v: "francais", l: "Français", dispo: false },
];

const ETAPES = [
  { titre: "L'enfant", icone: Baby },
  { titre: "La famille", icone: Users },
  { titre: "Le suivi", icone: Hospital },
];

type Formulaire = {
  prenom: string;
  nom: string;
  sexe: Sexe | null;
  naissance: string;
  poids: string;
  mere: string;
  telephone: string;
  langue: Langue;
  centre: CentreId;
  quartier: string;
  acte: boolean | null;
  vaccinsNaissance: boolean;
  garderie: string;
};

function Choix({ actif, onClick, children, className, disabled }: { actif: boolean; onClick: () => void; children: React.ReactNode; className?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 text-left text-[0.92rem] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        actif ? "border-primary-600 bg-brand-soft font-medium text-brand-fg ring-1 ring-primary-600/30" : "border-line-strong bg-card text-fg hover:bg-card-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

export default function Inscription() {
  const auJour = useAuJour();
  const inscrire = useStore((s) => s.inscrire);
  const vide: Formulaire = {
    prenom: "",
    nom: "",
    sexe: null,
    naissance: auJour,
    poids: "",
    mere: "",
    telephone: "",
    langue: "ewe",
    centre: "be_kpota",
    quartier: QUARTIERS.be_kpota[0],
    acte: null,
    vaccinsNaissance: true,
    garderie: "",
  };
  const [f, setF] = useState<Formulaire>(vide);
  const [etape, setEtape] = useState(0);
  const [inscritId, setInscritId] = useState<string | null>(null);
  const maj = <K extends keyof Formulaire>(k: K, v: Formulaire[K]) => setF((x) => ({ ...x, [k]: v }));

  const chiffres = f.telephone.replace(/\D/g, "");
  const ageJours = ecartJours(f.naissance, auJour);
  const valide = [
    !!f.prenom && f.nom.trim().length > 1 && !!f.sexe && !!f.naissance && ageJours >= 0 && ageJours <= 6 * 365,
    f.mere.trim().length > 2 && chiffres.length === 8,
    f.acte !== null && !!f.quartier,
  ];

  const exemple = () => {
    setF({ ...vide, prenom: "Kossi", nom: "Amouzou", sexe: "M", poids: "3,2", mere: "Enyonam Amouzou", telephone: "90 12 34 56", acte: false, quartier: "Bè-Kpota" });
    setEtape(2);
  };

  const valider = () => {
    const id = inscrire({
      prenom: f.prenom,
      nom: f.nom.trim(),
      sexe: f.sexe!,
      naissance: f.naissance,
      mere: { nom: f.mere.trim(), telephone: `+228 ${chiffres.replace(/(\d{2})(?=\d)/g, "$1 ")}` },
      langue: f.langue,
      centre: f.centre,
      quartier: f.quartier,
      garderie: f.garderie || null,
      acteNaissance: !!f.acte,
      vaccinsNaissance: f.vaccinsNaissance && ageJours <= 14,
      poidsNaissance: f.poids ? Number(f.poids.replace(",", ".")) : undefined,
    });
    setInscritId(id);
    window.scrollTo({ top: 0 });
  };

  if (inscritId)
    return (
      <Succes
        id={inscritId}
        onAutre={() => {
          setF(vide);
          setEtape(0);
          setInscritId(null);
        }}
      />
    );

  return (
    <>
      <EntetePage
        titre="Inscrire un enfant"
        description="Trois écrans, moins d'une minute. La carte QR et le calendrier sont créés à la fin."
        ariane={[{ libelle: "Suivi des enfants" }, { libelle: "Inscrire un enfant" }]}
        actions={
          <Bouton variante="secondaire" icone={Sparkles} onClick={exemple}>
            Remplir l&apos;exemple de la démo
          </Bouton>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Carte className="xl:col-span-2">
          <ol className="grid grid-cols-3 border-b border-line">
            {ETAPES.map((e, i) => {
              const fait = i < etape;
              const actif = i === etape;
              const accessible = i <= etape || valide.slice(0, i).every(Boolean);
              return (
                <li key={e.titre} className={cn(i > 0 && "border-l border-line")}>
                  <button
                    disabled={!accessible}
                    onClick={() => setEtape(i)}
                    className={cn("relative flex w-full items-center gap-2.5 px-4 py-3 text-left disabled:opacity-50", actif ? "text-brand-fg" : "text-muted hover:text-fg")}
                  >
                    <span
                      className={cn(
                        "tnum grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
                        fait ? "bg-ok text-white" : actif ? "bg-primary-600 text-white" : "bg-card-muted text-muted ring-1 ring-line-strong",
                      )}
                    >
                      {fait ? <Check size={13} /> : i + 1}
                    </span>
                    <span className="truncate text-[0.92rem] font-medium">{e.titre}</span>
                    {actif && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary-600 dark:bg-primary-400" />}
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="animate-fade-in space-y-5 p-4 sm:p-5" key={etape}>
            {etape === 0 && (
              <>
                <div>
                  <p className="label">Prénom</p>
                  <p className="mb-2 flex items-center gap-1.5 text-[0.82rem] text-muted">
                    <Volume2 size={14} /> Ces prénoms ont leurs messages vocaux enregistrés en éwé.
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                    {PRENOMS.map((p) => (
                      <Choix
                        key={p}
                        actif={f.prenom === p}
                        className="h-10 text-center"
                        onClick={() => {
                          const s = SEXE_PRENOM[prenomCanonique(p) ?? ""] ?? null;
                          setF((x) => ({ ...x, prenom: p, sexe: s ?? x.sexe }));
                        }}
                      >
                        {p}
                      </Choix>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Champ label="Nom de famille">
                    <input className="input" value={f.nom} onChange={(e) => maj("nom", e.target.value)} placeholder="Ex. Amouzou" />
                  </Champ>
                  <div>
                    <p className="label">Sexe</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(["F", "M"] as Sexe[]).map((s) => (
                        <Choix key={s} actif={f.sexe === s} className="h-10 text-center" onClick={() => maj("sexe", s)}>
                          {s === "F" ? "Fille" : "Garçon"}
                        </Choix>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Champ label="Date de naissance" aide={`Âge : ${libelleAge(f.naissance, auJour)}`}>
                      <input type="date" max={auJour} className="input" value={f.naissance} onChange={(e) => maj("naissance", e.target.value)} />
                    </Champ>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {[
                        { l: "Aujourd'hui", j: 0 },
                        { l: "Il y a 1 semaine", j: 7 },
                        { l: "Il y a 6 semaines", j: 42 },
                      ].map((x) => (
                        <button key={x.l} type="button" onClick={() => maj("naissance", ajouterJours(auJour, -x.j))} className="rounded border border-line px-2 py-0.5 text-xs text-fg-soft hover:bg-card-muted">
                          {x.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Champ label="Poids aujourd'hui (facultatif)" aide="En kilogrammes, par exemple 3,2">
                    <input inputMode="decimal" className="input" value={f.poids} onChange={(e) => maj("poids", e.target.value.replace(/[^\d.,]/g, ""))} placeholder="3,2" />
                  </Champ>
                </div>
              </>
            )}

            {etape === 1 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Champ label="Mère ou personne qui s'occupe de l'enfant">
                    <input className="input" value={f.mere} onChange={(e) => maj("mere", e.target.value)} placeholder="Ex. Enyonam Amouzou" />
                  </Champ>
                  <Champ label="Téléphone WhatsApp" aide="Les messages vocaux arriveront sur ce numéro.">
                    <div className="flex">
                      <span className="grid h-10 place-items-center rounded-l-md border border-r-0 border-line-strong bg-card-muted px-3 text-[0.92rem] text-muted">+228</span>
                      <input
                        inputMode="tel"
                        className="input rounded-l-none"
                        value={f.telephone}
                        onChange={(e) => {
                          const c = e.target.value.replace(/\D/g, "").slice(0, 8);
                          maj("telephone", c.replace(/(\d{2})(?=\d)/g, "$1 "));
                        }}
                        placeholder="90 12 34 56"
                      />
                    </div>
                  </Champ>
                </div>
                <div>
                  <p className="label">Langue des messages</p>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {LANGUES.map((l) => (
                      <Choix key={l.v} actif={f.langue === l.v} disabled={!l.dispo} className="py-2" onClick={() => maj("langue", l.v)}>
                        <span className="block font-medium">{l.l}</span>
                        <span className="block text-xs text-muted">{l.dispo ? "Disponible" : "Pour la finale"}</span>
                      </Choix>
                    ))}
                  </div>
                </div>
              </>
            )}

            {etape === 2 && (
              <>
                <div>
                  <p className="label">Centre de santé de suivi</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {(Object.keys(CENTRES) as CentreId[]).map((c) => (
                      <Choix key={c} actif={f.centre === c} className="py-2.5" onClick={() => setF((x) => ({ ...x, centre: c, quartier: QUARTIERS[c][0] }))}>
                        <span className="block font-medium">{CENTRES[c]}</span>
                        <span className="block text-xs text-muted">{c === "be_kpota" ? "Unité de soins périphérique" : "Centre hospitalier, Tokoin"}</span>
                      </Choix>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Champ label="Quartier">
                    <Selecteur value={f.quartier} onChange={(e) => maj("quartier", e.target.value)}>
                      {QUARTIERS[f.centre].map((q) => (
                        <option key={q}>{q}</option>
                      ))}
                    </Selecteur>
                  </Champ>
                  <Champ label="Garderie (facultatif)">
                    <Selecteur value={f.garderie} onChange={(e) => maj("garderie", e.target.value)}>
                      <option value="">Aucune</option>
                      {GARDERIES.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </Selecteur>
                  </Champ>
                </div>
                <div>
                  <p className="label">L&apos;enfant a-t-il un acte de naissance ?</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Choix actif={f.acte === true} className="flex h-10 items-center gap-2" onClick={() => maj("acte", true)}>
                      <FileCheck2 size={16} /> Oui
                    </Choix>
                    <Choix actif={f.acte === false} className="flex h-10 items-center gap-2" onClick={() => maj("acte", false)}>
                      <FileX2 size={16} /> Non, pas encore
                    </Choix>
                  </div>
                  {f.acte === false && (
                    <p className="mt-2 flex items-start gap-2 rounded-md bg-warn-soft px-3 py-2 text-[0.88rem] text-warn">
                      <Info size={15} className="mt-0.5 shrink-0" /> La famille recevra un vocal qui explique la démarche. La déclaration est gratuite.
                    </p>
                  )}
                </div>
                {ageJours <= 14 && (
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border border-line p-3">
                    <input type="checkbox" checked={f.vaccinsNaissance} onChange={(e) => maj("vaccinsNaissance", e.target.checked)} className="size-4 accent-primary-600" />
                    <span className="text-[0.9rem]">
                      <span className="block font-medium">BCG et VPO 0 faits aujourd&apos;hui</span>
                      <span className="text-muted">Les vaccins de la naissance seront notés dans le carnet.</span>
                    </span>
                  </label>
                )}
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
            <Bouton variante="fantome" icone={ArrowLeft} onClick={() => setEtape(etape - 1)} disabled={etape === 0}>
              Retour
            </Bouton>
            {etape < 2 ? (
              <Bouton onClick={() => setEtape(etape + 1)} disabled={!valide[etape]} iconeDroite={ArrowRight}>
                Continuer
              </Bouton>
            ) : (
              <Bouton onClick={valider} disabled={!valide.every(Boolean)} icone={UserPlus}>
                Inscrire {f.prenom || "l'enfant"}
              </Bouton>
            )}
          </div>
        </Carte>

        <div className="space-y-4">
          <Carte>
            <CarteEntete titre="Aperçu de la fiche" icone={ClipboardCheck} />
            <dl className="divide-y divide-line px-4 py-1 text-[0.9rem]">
              <LigneInfo libelle="Enfant">{f.prenom ? `${f.prenom} ${f.nom}` : <span className="text-muted">À remplir</span>}</LigneInfo>
              <LigneInfo libelle="Âge">{libelleAge(f.naissance, auJour)}</LigneInfo>
              <LigneInfo libelle="Mère">{f.mere || <span className="text-muted">À remplir</span>}</LigneInfo>
              <LigneInfo libelle="Téléphone">{chiffres ? `+228 ${f.telephone}` : <span className="text-muted">À remplir</span>}</LigneInfo>
              <LigneInfo libelle="Centre">{CENTRES[f.centre]}</LigneInfo>
              <LigneInfo libelle="Acte de naissance">{f.acte === null ? <span className="text-muted">À préciser</span> : f.acte ? "Oui" : "Pas encore"}</LigneInfo>
            </dl>
          </Carte>
          <Carte>
            <CarteEntete titre="Ce qui se passe ensuite" icone={Info} />
            <ul className="space-y-2 p-4 text-[0.88rem] text-fg-soft">
              <li className="flex gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-ok" /> Une carte QR est créée. Elle ne contient qu&apos;un code, aucune donnée personnelle.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-ok" /> Les 9 rendez-vous de vaccin sont calculés à partir de la date de naissance.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-ok" /> La mère reçoit un message de bienvenue en éwé sur WhatsApp.
              </li>
            </ul>
          </Carte>
        </div>
      </div>
    </>
  );
}

function Succes({ id, onAutre }: { id: string; onAutre: () => void }) {
  const enfant = useEnfant(id);
  const auJour = useAuJour();
  const cal = useMemo(() => (enfant ? calendrierEnfant(enfant, auJour) : []), [enfant, auJour]);
  if (!enfant) return null;

  return (
    <>
      <EntetePage
        titre={`${enfant.prenom} ${enfant.nom} est inscrit${enfant.sexe === "F" ? "e" : ""}`}
        description={`Le message de bienvenue est parti sur le WhatsApp de ${enfant.mere.nom.split(" ")[0]}.${enfant.acteNaissance ? "" : " Un second vocal explique comment obtenir l'acte de naissance."}`}
        ariane={[{ libelle: "Suivi des enfants" }, { libelle: "Inscrire un enfant", href: "/inscription" }, { libelle: "Terminé" }]}
        actions={
          <>
            <Bouton variante="secondaire" icone={UserPlus} onClick={onAutre}>
              Inscrire un autre enfant
            </Bouton>
            <LienBouton href={`/carte/${enfant.id}`} variante="secondaire" icone={Printer}>
              Imprimer la carte
            </LienBouton>
            <LienBouton href={`/enfant/${enfant.id}`} iconeDroite={ArrowRight}>
              Ouvrir le carnet
            </LienBouton>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Carte className="overflow-hidden">
            <div className="flex flex-col items-start gap-5 bg-primary-800 p-5 text-white sm:flex-row sm:items-center">
              <div className="rounded-md bg-white p-2">
                <QRCodeSVG value={enfant.id} size={104} fgColor="#1c1d1f" />
              </div>
              <div className="min-w-0">
                <p className="text-[0.78rem] font-medium uppercase tracking-wider text-accent-300">Carte de suivi</p>
                <p className="mt-0.5 text-2xl font-semibold">
                  {enfant.prenom} {enfant.nom}
                </p>
                <p className="text-[0.9rem] text-white/70">
                  {enfant.sexe === "F" ? "Née" : "Né"} le {dateCourte(enfant.naissance)} · {CENTRES[enfant.centre]}
                </p>
                <p className="mt-2 inline-block rounded bg-white/10 px-2 py-0.5 font-mono text-sm tracking-widest">{enfant.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 text-[0.85rem] text-muted">
              <Info size={15} /> Le code ne contient aucune donnée personnelle : seul un compte autorisé peut ouvrir le carnet.
            </div>
          </Carte>

          <Carte>
            <CarteEntete titre="Calendrier des vaccins" description="Les rappels partiront tout seuls, en éwé" icone={Syringe} />
            <Tableau>
              <thead>
                <tr>
                  <th>Âge</th>
                  <th>Date</th>
                  <th>Vaccins</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {cal.map((r) => (
                  <tr key={r.numero}>
                    <td className="whitespace-nowrap font-medium">{r.libelle}</td>
                    <td className="tnum whitespace-nowrap text-fg-soft">{dateCourte(r.date)}</td>
                    <td className="text-fg-soft">{r.doses.map((d) => d.nom).join(", ")}</td>
                    <td>
                      {r.statut === "fait" ? (
                        <Pastille ton="ok" point taille="sm">
                          Fait
                        </Pastille>
                      ) : (
                        <Pastille ton="neutre" taille="sm">
                          À venir
                        </Pastille>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          </Carte>
        </div>

        <div className="space-y-3">
          <TelephoneWhatsApp enfant={enfant} />
          <Carte>
            <CarteCorps className="flex items-center gap-3 py-3">
              <FastForward size={18} className="shrink-0 text-brand-fg" />
              <p className="flex-1 text-[0.88rem] text-fg-soft">Étape suivante : faire avancer le temps pour voir les rappels.</p>
              <LienBouton href={`/enfant/${enfant.id}?onglet=telephone`} taille="sm" variante="doux">
                Avance rapide
              </LienBouton>
            </CarteCorps>
          </Carte>
        </div>
      </div>
    </>
  );
}
