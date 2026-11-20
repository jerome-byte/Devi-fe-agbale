"use client";

import {
  Activity,
  Baby,
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  FastForward,
  FileCheck2,
  FileX2,
  Info,
  LayoutGrid,
  Lock,
  MessageCircle,
  Phone,
  Printer,
  QrCode,
  Ruler,
  ScanLine,
  Smartphone,
  Sparkles,
  Syringe,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ageMois, dateCourte, dateSansAnnee, ecartJours, heure, libelleAge, relatif } from "@/lib/dates";
import { etatCroissance, LIBELLE_NIVEAU, type NiveauCroissance } from "@/lib/oms";
import { calendrierEnfant, COULEUR_VACCIN, couvertureEnfant, type RendezVous } from "@/lib/pev";
import { AGES_DEPISTAGE, alertesEnfant } from "@/lib/regles";
import { useAuJour, useEnfant, useStore, type EtapeSimulation } from "@/lib/store";
import type { Enfant } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CENTRES, audioPour, messageCatalogue, texteMessage } from "@/lib/voix";
import { CourbeCroissance, LegendeCroissance } from "./courbe-croissance";
import { PastilleAlerte } from "./enfant-ui";
import { LecteurAudio } from "./lecteur-audio";
import { TelephoneWhatsApp } from "./telephone-whatsapp";
import {
  Anneau,
  Avatar,
  Bouton,
  Carte,
  CarteCorps,
  CarteEntete,
  EntetePage,
  LienBouton,
  LigneInfo,
  Onglets,
  Pastille,
  Tableau,
  Vide,
  type Ton,
} from "./ui";

type Onglet = "apercu" | "vaccins" | "croissance" | "messages" | "developpement" | "telephone";

const LANGUE: Record<string, string> = { ewe: "Éwé", mina: "Mina", kabiye: "Kabiyè", francais: "Français" };
const TON_NIVEAU: Record<NiveauCroissance, Ton> = { normal: "ok", a_surveiller: "warn", a_orienter: "danger", inconnu: "neutre" };

export function Carnet({ id }: { id: string }) {
  const enfant = useEnfant(id);
  const session = useStore((s) => s.session)!;
  const auJour = useAuJour();
  const params = useSearchParams();
  const scanne = params.get("scan") === "1";
  const educ = session.role === "educatrice";
  const [onglet, setOnglet] = useState<Onglet>((params.get("onglet") as Onglet) ?? "apercu");
  const nbMessages = useStore((s) => s.messages.filter((m) => m.enfantId === id).length);

  if (!enfant) {
    return (
      <Carte>
        <Vide icone={QrCode} titre="Enfant introuvable" description="Ce code ne correspond à aucun carnet. Vérifiez la carte ou réinitialisez la démo." action={<LienBouton href="/scan" variante="secondaire">Scanner une autre carte</LienBouton>} />
      </Carte>
    );
  }
  if (session.role === "pilotage") {
    return (
      <Carte>
        <Vide icone={Lock} titre="Accès réservé" description="Le pilotage voit des données anonymes par zone. Les carnets nominatifs sont réservés aux agents et aux éducatrices." />
      </Carte>
    );
  }

  const alertes = alertesEnfant(enfant, auJour).filter((a) => !educ || ["acte", "pesee", "depistage", "croissance"].includes(a.type));

  const onglets: { valeur: Onglet; libelle: string; icone: typeof LayoutGrid; compte?: number }[] = educ
    ? [
        { valeur: "apercu", libelle: "Vue d'ensemble", icone: LayoutGrid },
        { valeur: "croissance", libelle: "Croissance", icone: Activity },
        { valeur: "developpement", libelle: "Développement", icone: Sparkles },
      ]
    : [
        { valeur: "apercu", libelle: "Vue d'ensemble", icone: LayoutGrid },
        { valeur: "vaccins", libelle: "Vaccins", icone: Syringe },
        { valeur: "croissance", libelle: "Croissance", icone: Activity },
        { valeur: "messages", libelle: "Messages", icone: MessageCircle, compte: nbMessages },
        { valeur: "developpement", libelle: "Développement", icone: Sparkles },
        { valeur: "telephone", libelle: "Téléphone de la mère", icone: Smartphone },
      ];

  return (
    <>
      <EntetePage
        titre={
          <span className="flex items-center gap-3">
            <Avatar prenom={enfant.prenom} nom={enfant.nom} taille="lg" />
            <span className="min-w-0">
              <span className="block truncate">
                {enfant.prenom} {enfant.nom}
              </span>
              <span className="block text-[0.88rem] font-normal text-muted">
                {enfant.sexe === "F" ? "Fille" : "Garçon"}, {libelleAge(enfant.naissance, auJour)} · {enfant.sexe === "F" ? "née" : "né"} le {dateCourte(enfant.naissance)} · <span className="font-mono">{enfant.id}</span>
              </span>
            </span>
          </span>
        }
        ariane={[{ libelle: educ ? "Garderie" : "Enfants", href: educ ? "/garderie" : "/enfants" }, { libelle: `${enfant.prenom} ${enfant.nom}` }]}
        actions={
          <>
            <LienBouton href={`/carte/${enfant.id}`} variante="secondaire" icone={Printer}>
              Carte QR
            </LienBouton>
            {!educ && (
              <a href={`tel:${enfant.mere.telephone.replaceAll(" ", "")}`} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-3.5 text-[0.92rem] font-medium text-white hover:bg-primary-700 dark:bg-primary-500">
                <Phone size={17} /> Appeler la mère
              </a>
            )}
          </>
        }
      >
        {alertes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {alertes.map((a) => (
              <PastilleAlerte key={a.type} a={a} taille="md" />
            ))}
          </div>
        )}
      </EntetePage>

      <Onglets valeur={onglet} onChange={setOnglet} onglets={onglets} className="mb-4" />

      {onglet === "apercu" && <Apercu enfant={enfant} auJour={auJour} educ={educ} scanne={scanne} versOnglet={setOnglet} />}
      {onglet === "vaccins" && <Vaccins enfant={enfant} auJour={auJour} />}
      {onglet === "croissance" && <Croissance enfant={enfant} auJour={auJour} educ={educ} />}
      {onglet === "messages" && <Journal enfant={enfant} />}
      {onglet === "developpement" && <Developpement enfant={enfant} auJour={auJour} />}
      {onglet === "telephone" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <AvanceRapide enfant={enfant} auJour={auJour} />
          <TelephoneWhatsApp enfant={enfant} />
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------ vue d'ensemble */

function Apercu({ enfant, auJour, educ, scanne, versOnglet }: { enfant: Enfant; auJour: string; educ: boolean; scanne: boolean; versOnglet: (o: Onglet) => void }) {
  const basculerActe = useStore((s) => s.basculerActe);
  const cal = calendrierEnfant(enfant, auJour);
  const prochains = cal.filter((r) => r.statut !== "fait").slice(0, 3);
  const cv = couvertureEnfant(enfant, auJour);
  const pct = cv.dues ? Math.round((cv.faites / cv.dues) * 100) : 100;
  const etat = etatCroissance(enfant);
  const der = [...enfant.pesees].sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <ActeDuJour enfant={enfant} auJour={auJour} educ={educ} scanne={scanne} />

        <div className="grid gap-4 md:grid-cols-2">
          {!educ && (
            <Carte>
              <CarteEntete titre="Vaccins" icone={Syringe} action={<button onClick={() => versOnglet("vaccins")} className="text-[0.85rem] font-medium text-brand-fg hover:underline">Calendrier</button>} />
              <CarteCorps className="flex items-center gap-4">
                <Anneau valeur={pct} taille={64} epaisseur={7} ton={pct === 100 ? "ok" : pct >= 70 ? "warn" : "danger"}>
                  <span className="tnum text-sm font-semibold">{pct} %</span>
                </Anneau>
                <div className="min-w-0 text-[0.9rem]">
                  <p className="font-medium">
                    {cv.faites} doses faites sur {cv.dues} dues
                  </p>
                  {prochains[0] ? (
                    <p className="text-muted">
                      Prochain : {prochains[0].libelle}, {dateSansAnnee(prochains[0].date)} ({prochains[0].joursRetard ? `${prochains[0].joursRetard} j de retard` : relatif(prochains[0].date, auJour)})
                    </p>
                  ) : (
                    <p className="text-muted">Calendrier terminé</p>
                  )}
                </div>
              </CarteCorps>
            </Carte>
          )}
          <Carte>
            <CarteEntete titre="Croissance" icone={Activity} action={<button onClick={() => versOnglet("croissance")} className="text-[0.85rem] font-medium text-brand-fg hover:underline">Courbe</button>} />
            <CarteCorps>
              <div className="flex items-center gap-2">
                <Pastille ton={TON_NIVEAU[etat.niveau]} point>
                  {LIBELLE_NIVEAU[etat.niveau]}
                </Pastille>
                {etat.dernierZ !== null && <span className="tnum text-[0.85rem] text-muted">z-score {etat.dernierZ.toLocaleString("fr-FR")}</span>}
              </div>
              <p className="mt-2 text-[0.9rem] text-muted">
                {der ? `Dernière mesure le ${dateSansAnnee(der.date)} : ${der.poidsKg.toLocaleString("fr-FR")} kg${der.tailleCm ? `, ${der.tailleCm.toLocaleString("fr-FR")} cm` : ""}.` : "Aucune mesure enregistrée."} {etat.niveau !== "normal" && etat.niveau !== "inconnu" ? etat.detail + "." : ""}
              </p>
            </CarteCorps>
          </Carte>
          {educ && (
            <Carte>
              <CarteEntete titre="Vaccins" icone={Syringe} />
              <CarteCorps className="flex items-center gap-3 text-[0.9rem]">
                {cv.aJour ? <CheckCircle2 size={20} className="text-ok" /> : <Bell size={20} className="text-warn" />}
                <span>
                  <span className="block font-medium">{cv.aJour ? "À jour" : "À vérifier au centre de santé"}</span>
                  <span className="text-muted">Le détail est visible par l&apos;agent de santé.</span>
                </span>
              </CarteCorps>
            </Carte>
          )}
        </div>

        {!educ && prochains.length > 0 && (
          <Carte>
            <CarteEntete titre="Prochains rendez-vous" icone={CalendarClock} />
            <ul className="divide-y divide-line">
              {prochains.map((r) => (
                <li key={r.numero} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
                  <span className="w-28 font-medium">{r.libelle}</span>
                  <span className="tnum w-28 text-fg-soft">{dateCourte(r.date)}</span>
                  <StatutRdv r={r} />
                  <span className="ml-auto text-[0.85rem] text-muted">{r.manquantes.map((d) => d.nom).join(", ")}</span>
                </li>
              ))}
            </ul>
          </Carte>
        )}
      </div>

      <div className="space-y-4">
        <Carte>
          <CarteEntete titre="Informations" icone={Info} />
          <dl className="divide-y divide-line px-4 py-1">
            <LigneInfo libelle="Mère">{enfant.mere.nom}</LigneInfo>
            {!educ && (
              <LigneInfo libelle="Téléphone">
                <a href={`tel:${enfant.mere.telephone.replaceAll(" ", "")}`} className="text-brand-fg hover:underline">
                  {enfant.mere.telephone}
                </a>
              </LigneInfo>
            )}
            <LigneInfo libelle="Langue des messages">{LANGUE[enfant.langue]}</LigneInfo>
            <LigneInfo libelle="Centre de santé">{enfant.centreNom ?? CENTRES[enfant.centre]}</LigneInfo>
            <LigneInfo libelle="Quartier">{enfant.quartier}</LigneInfo>
            <LigneInfo libelle="Garderie">{enfant.garderie ?? "Aucune"}</LigneInfo>
            <LigneInfo libelle="Acte de naissance">
              <button
                onClick={() => basculerActe(enfant.id, !enfant.acteNaissance)}
                className={cn("inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[0.85rem] font-medium", enfant.acteNaissance ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn")}
                title="Modifier"
              >
                {enfant.acteNaissance ? <FileCheck2 size={14} /> : <FileX2 size={14} />}
                {enfant.acteNaissance ? "Oui" : "Pas encore"}
              </button>
            </LigneInfo>
            <LigneInfo libelle="Inscrit le">{dateCourte(enfant.inscritLe)}</LigneInfo>
          </dl>
        </Carte>
      </div>
    </div>
  );
}

function StatutRdv({ r }: { r: RendezVous }) {
  const m: Record<RendezVous["statut"], { l: string; t: Ton }> = {
    fait: { l: "Fait", t: "ok" },
    partiel: { l: "Incomplet", t: "warn" },
    en_retard: { l: r.joursRetard ? `${r.joursRetard} j de retard` : "En retard", t: "danger" },
    aujourdhui: { l: "Aujourd'hui", t: "info" },
    proche: { l: "Cette semaine", t: "brand" },
    a_venir: { l: "À venir", t: "neutre" },
  };
  return (
    <Pastille ton={m[r.statut].t} point taille="sm">
      {m[r.statut].l}
    </Pastille>
  );
}

/* ------------------------------------------------------------ acte du jour */

function ActeDuJour({ enfant, auJour, educ, scanne }: { enfant: Enfant; auJour: string; educ: boolean; scanne: boolean }) {
  const vacciner = useStore((s) => s.vacciner);
  const peser = useStore((s) => s.peser);
  const cal = calendrierEnfant(enfant, auJour);
  const aFaire = cal.filter((r) => r.statut !== "fait" && ecartJours(auJour, r.date) <= 7);
  const dosesPrevues = aFaire.flatMap((r) => r.manquantes);
  const cleDoses = dosesPrevues.map((d) => d.id).join(",");
  const [selection, setSelection] = useState<{ cle: string; coches: string[] }>({ cle: cleDoses, coches: dosesPrevues.map((d) => d.id) });
  const coches = selection.cle === cleDoses ? selection.coches : cleDoses ? cleDoses.split(",") : [];
  const basculer = (id: string) => setSelection({ cle: cleDoses, coches: coches.includes(id) ? coches.filter((x) => x !== id) : [...coches, id] });
  const [poids, setPoids] = useState("");
  const [taille, setTaille] = useState("");
  const [fait, setFait] = useState<string | null>(null);
  const moinsDe2Ans = ageMois(enfant.naissance, auJour) < 24;

  const flash = (t: string) => {
    setFait(t);
    setTimeout(() => setFait(null), 2600);
  };

  return (
    <Carte className={cn(scanne && "border-primary-500 ring-2 ring-primary-500/20")}>
      <CarteEntete
        titre={scanne ? "Carte scannée : acte du jour" : educ ? "Mesures à la garderie" : "Au centre aujourd'hui"}
        description={educ ? "Poids et taille du mois" : "Le vaccin prévu est déjà coché. Un geste pour valider."}
        icone={scanne ? ScanLine : CalendarClock}
      />
      <div className={cn("grid divide-line", !educ && "md:grid-cols-2 md:divide-x")}>
        {!educ && (
          <div className="p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Syringe size={15} className="text-muted" /> Vaccins
            </p>
            {dosesPrevues.length ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {dosesPrevues.map((d) => {
                    const on = coches.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        onClick={() => basculer(d.id)}
                        className={cn(
                          "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[0.85rem] font-medium transition-colors",
                          on ? "border-primary-600 bg-primary-600 text-white dark:border-primary-500 dark:bg-primary-500" : "border-line-strong text-fg-soft hover:bg-card-muted",
                        )}
                      >
                        <span className={cn("grid size-4 place-items-center rounded-sm border", on ? "border-white/60" : "border-line-strong")}>{on && <Check size={11} />}</span>
                        {d.nom}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[0.82rem] text-muted">
                  {aFaire.map((r) => `${r.libelle} (${r.joursRetard ? `${r.joursRetard} j de retard` : relatif(r.date, auJour)})`).join(" · ")}
                </p>
                <Bouton
                  className="mt-3"
                  icone={Check}
                  disabled={!coches.length}
                  onClick={() => {
                    vacciner(enfant.id, coches);
                    flash(`${coches.length} vaccin${coches.length > 1 ? "s" : ""} enregistré${coches.length > 1 ? "s" : ""}`);
                  }}
                >
                  Valider {coches.length > 1 ? `les ${coches.length} vaccins` : "le vaccin"}
                </Bouton>
              </>
            ) : (
              <p className="text-[0.9rem] text-muted">Aucun vaccin à faire cette semaine.</p>
            )}
          </div>
        )}
        <div className="border-t border-line p-4 md:border-t-0">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Ruler size={15} className="text-muted" /> Mesures
          </p>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = Number(poids.replace(",", "."));
              if (!v || v < 1 || v > 40) return;
              const t = Number(taille.replace(",", "."));
              peser(enfant.id, Math.round(v * 10) / 10, educ ? "garderie" : "centre", t > 30 && t < 140 ? Math.round(t * 10) / 10 : undefined);
              setPoids("");
              setTaille("");
              flash("Mesures enregistrées, la courbe est à jour");
            }}
          >
            <div className="relative min-w-24 flex-1">
              <input inputMode="decimal" value={poids} onChange={(e) => setPoids(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="6,4" className="input pr-10" aria-label="Poids en kilogrammes" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">kg</span>
            </div>
            <div className="relative min-w-24 flex-1">
              <input inputMode="decimal" value={taille} onChange={(e) => setTaille(e.target.value.replace(/[^\d.,]/g, ""))} placeholder={moinsDe2Ans ? "62,5" : "88,0"} className="input pr-10" aria-label="Taille en centimètres" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">cm</span>
            </div>
            <Bouton type="submit" disabled={!poids}>
              Enregistrer
            </Bouton>
          </form>
          <p className="mt-2 text-[0.82rem] text-muted">Taille mesurée {moinsDe2Ans ? "couché (moins de 2 ans)" : "debout (2 ans et plus)"}.</p>
        </div>
      </div>
      {fait && (
        <div className="flex animate-fade-in items-center gap-2 border-t border-line bg-ok-soft px-4 py-2 text-[0.9rem] font-medium text-ok">
          <CheckCircle2 size={16} /> {fait}
        </div>
      )}
    </Carte>
  );
}

/* ------------------------------------------------------------------ vaccins */

function Vaccins({ enfant, auJour }: { enfant: Enfant; auJour: string }) {
  const cal = calendrierEnfant(enfant, auJour);
  return (
    <Carte>
      <CarteEntete titre="Calendrier vaccinal" description="PEV du Togo, validé par le référent médical le 18 nov. 2026" icone={Syringe} />
      <Tableau>
        <thead>
          <tr>
            <th>Âge</th>
            <th>Date prévue</th>
            <th>Statut</th>
            <th>Doses</th>
          </tr>
        </thead>
        <tbody>
          {cal.map((r) => (
            <tr key={r.numero}>
              <td className="whitespace-nowrap font-medium">{r.libelle}</td>
              <td className="tnum whitespace-nowrap text-fg-soft">{dateCourte(r.date)}</td>
              <td>
                <StatutRdv r={r} />
              </td>
              <td>
                <span className="flex flex-wrap gap-1.5">
                  {r.doses.map((d) => {
                    const date = enfant.vaccins[d.id];
                    return (
                      <span
                        key={d.id}
                        title={`${d.maladies}${date ? `, fait le ${dateCourte(date)}` : ""}`}
                        className={cn("inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[0.8rem]", date ? "bg-ok-soft text-ok" : "border border-dashed border-line-strong text-muted")}
                      >
                        <span className="size-1.5 rounded-full" style={{ background: COULEUR_VACCIN[d.code] ?? "#74867c" }} />
                        {d.nom}
                        {date && <span className="opacity-75">{dateSansAnnee(date)}</span>}
                      </span>
                    );
                  })}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </Tableau>
    </Carte>
  );
}

/* --------------------------------------------------------------- croissance */

function Croissance({ enfant, auJour, educ }: { enfant: Enfant; auJour: string; educ: boolean }) {
  const etat = etatCroissance(enfant);
  const mesures = [...enfant.pesees].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Carte className="xl:col-span-2">
        <CarteEntete
          titre="Poids pour l'âge"
          description={`Normes OMS 2006, ${enfant.sexe === "F" ? "filles" : "garçons"}`}
          icone={Activity}
          action={
            <Pastille ton={TON_NIVEAU[etat.niveau]} point>
              {LIBELLE_NIVEAU[etat.niveau]}
            </Pastille>
          }
        />
        <CarteCorps>
          <CourbeCroissance enfant={enfant} auJour={auJour} />
          <LegendeCroissance />
          {etat.niveau !== "inconnu" && (
            <p className="mt-3 text-[0.88rem] text-muted">
              {etat.stagnation ? "Stagnation : " : ""}
              {etat.detail}. Seuils : à surveiller sous -2, à orienter sous -3.
            </p>
          )}
        </CarteCorps>
      </Carte>
      <div className="space-y-4">
        <ActeDuJour enfant={enfant} auJour={auJour} educ={educ} scanne={false} />
        <Carte>
          <CarteEntete titre="Historique des mesures" icone={Ruler} />
          {mesures.length ? (
            <Tableau>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Poids</th>
                  <th>Taille</th>
                  <th>Lieu</th>
                </tr>
              </thead>
              <tbody>
                {mesures.slice(0, 10).map((p, i) => {
                  const prec = mesures[i + 1];
                  const diff = prec ? Math.round((p.poidsKg - prec.poidsKg) * 10) / 10 : null;
                  return (
                    <tr key={p.date}>
                      <td className="tnum whitespace-nowrap">
                        {dateSansAnnee(p.date)}
                        <span className="block text-[0.78rem] text-muted">{Math.floor(ageMois(enfant.naissance, p.date))} mois</span>
                      </td>
                      <td className="tnum whitespace-nowrap">
                        {p.poidsKg.toLocaleString("fr-FR")} kg
                        {diff !== null && <span className={cn("block text-[0.78rem]", diff > 0 ? "text-ok" : "text-danger")}>{diff > 0 ? "+" : ""}{diff.toLocaleString("fr-FR")}</span>}
                      </td>
                      <td className="tnum whitespace-nowrap text-fg-soft">{p.tailleCm ? `${p.tailleCm.toLocaleString("fr-FR")} cm` : ""}</td>
                      <td className="text-fg-soft">{p.lieu === "garderie" ? "Garderie" : "Centre"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Tableau>
          ) : (
            <Vide icone={Ruler} titre="Aucune mesure" className="py-6" />
          )}
        </Carte>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ messages */

function Journal({ enfant }: { enfant: Enfant }) {
  const tous = useStore((s) => s.messages);
  const ecouter = useStore((s) => s.ecouter);
  const fil = useMemo(() => tous.filter((m) => m.enfantId === enfant.id), [tous, enfant.id]);
  return (
    <Carte>
      <CarteEntete titre="Messages envoyés à la famille" description="En éwé, sur WhatsApp" icone={MessageCircle} />
      {fil.length ? (
        <Tableau>
          <thead>
            <tr>
              <th>Date</th>
              <th>Message</th>
              <th className="min-w-56">Écouter</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {fil.map((m) => {
              const a = audioPour(m.messageId, enfant);
              return (
                <tr key={m.id}>
                  <td className="tnum whitespace-nowrap">
                    {dateSansAnnee(m.date)}
                    <span className="block text-[0.78rem] text-muted">{heure(m.date)}</span>
                  </td>
                  <td className="min-w-64">
                    <span className="block font-medium">{messageCatalogue(m.messageId)?.declencheur}</span>
                    <span className="line-clamp-2 text-[0.85rem] text-muted">{texteMessage(m.messageId, enfant).fr}</span>
                  </td>
                  <td>{a ? <LecteurAudio src={a.src} duree={a.duree} compact nbBarres={22} onLecture={() => ecouter(m.id)} /> : <span className="text-muted">Pas d&apos;audio</span>}</td>
                  <td className="whitespace-nowrap">
                    {m.reponse ? (
                      <Pastille ton={m.reponse === "1" ? "ok" : "danger"} point>
                        Réponse {m.reponse}
                      </Pastille>
                    ) : (
                      <Pastille ton={m.statut === "ecoute" ? "info" : "neutre"}>{m.statut === "ecoute" ? "Écouté" : "Envoyé"}</Pastille>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Tableau>
      ) : (
        <Vide icone={MessageCircle} titre="Aucun message envoyé" description="Les rappels apparaîtront ici avec leur audio en éwé." />
      )}
    </Carte>
  );
}

/* ------------------------------------------------------------- développement */

function Developpement({ enfant, auJour }: { enfant: Enfant; auJour: string }) {
  const depister = useStore((s) => s.depister);
  const m = ageMois(enfant.naissance, auJour);
  return (
    <Carte>
      <CarteEntete titre="Dépistage aux âges clés" description="Motricité, langage, audition, vision : quelques questions simples à la famille" icone={Baby} />
      <Tableau>
        <thead>
          <tr>
            <th>Âge clé</th>
            <th>Résultat</th>
            <th className="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {AGES_DEPISTAGE.map((a) => {
            const r = enfant.depistages[String(a)];
            const du = m >= a && !r;
            return (
              <tr key={a}>
                <td className="font-medium">{a} mois</td>
                <td>
                  {r === "ok" ? (
                    <Pastille ton="ok" point>Rien à signaler</Pastille>
                  ) : r === "a_orienter" ? (
                    <Pastille ton="danger" point>Orienté vers un spécialiste</Pastille>
                  ) : du ? (
                    <Pastille ton="info" point>À faire maintenant</Pastille>
                  ) : (
                    <span className="text-muted">Plus tard</span>
                  )}
                </td>
                <td className="text-right">
                  {du && (
                    <span className="inline-flex gap-1.5">
                      <Bouton taille="sm" onClick={() => depister(enfant.id, a, "ok")}>
                        Tout va bien
                      </Bouton>
                      <Bouton taille="sm" variante="secondaire" onClick={() => depister(enfant.id, a, "a_orienter")}>
                        À orienter
                      </Bouton>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Tableau>
    </Carte>
  );
}

/* ------------------------------------------------------------- avance rapide */

const ETAPES_SIM: { e: EtapeSimulation; l: string; d: string }[] = [
  { e: "j2", l: "J-2", d: "Rappel deux jours avant" },
  { e: "veille", l: "Veille", d: "Rappel avec le nom du centre" },
  { e: "jour_j", l: "Jour J", d: "Rappel du matin" },
  { e: "manque_3j", l: "Manqué +3 j", d: "Vocal avec réponse 1 ou 2" },
  { e: "manque_7j", l: "Manqué +7 j", d: "Alerte dans la liste de l'agente" },
];

function AvanceRapide({ enfant, auJour }: { enfant: Enfant; auJour: string }) {
  const simuler = useStore((s) => s.simuler);
  const revenir = useStore((s) => s.revenirAujourdhui);
  const decalage = useStore((s) => s.decalageJours);
  const router = useRouter();
  const prochain = calendrierEnfant(enfant, auJour).find((r) => r.statut !== "fait");
  const [derniere, setDerniere] = useState<EtapeSimulation | null>(null);

  return (
    <Carte className="self-start">
      <CarteEntete
        titre="Avance rapide"
        description={prochain ? `Prochain rendez-vous : ${prochain.libelle}, le ${dateCourte(prochain.date)}` : "Tous les vaccins sont faits"}
        icone={FastForward}
        action={
          decalage !== 0 ? (
            <Bouton taille="sm" variante="secondaire" onClick={revenir}>
              Revenir à aujourd&apos;hui
            </Bouton>
          ) : undefined
        }
      />
      {prochain ? (
        <ol className="divide-y divide-line">
          {ETAPES_SIM.map((s, i) => (
            <li key={s.e}>
              <button
                onClick={() => {
                  simuler(enfant.id, s.e);
                  setDerniere(s.e);
                }}
                className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-card-muted", derniere === s.e && "bg-brand-soft")}
              >
                <span className={cn("tnum grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold", derniere === s.e ? "bg-primary-600 text-white" : "bg-card-muted text-fg-soft")}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{s.l}</span>
                  <span className="block text-[0.85rem] text-muted">{s.d}</span>
                </span>
                {derniere === s.e ? <Check size={17} className="text-brand-fg" /> : <Clock size={16} className="text-muted" />}
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <Vide icone={CheckCircle2} titre="Calendrier terminé" />
      )}
      {derniere === "manque_7j" && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-danger-soft px-4 py-2.5 text-[0.9rem] text-danger">
          <span className="flex-1">L&apos;enfant remonte en tête de la liste de l&apos;agente, avec un bouton pour appeler la mère.</span>
          <Bouton taille="sm" variante="secondaire" onClick={() => router.push("/agent")}>
            Voir la liste
          </Bouton>
        </div>
      )}
    </Carte>
  );
}
