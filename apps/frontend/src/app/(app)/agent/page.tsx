"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Eye,
  FileX2,
  ListChecks,
  MessageCircle,
  Phone,
  PhoneCall,
  Ruler,
  ScanLine,
  Sparkles,
  Syringe,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Alertes, Personne } from "@/components/enfant-ui";
import { useCompteurs, useEnfantsDuPerimetre } from "@/components/shell/compteurs";
import { Carte, CarteEntete, Indicateur, LienBouton, MenuActions, Tableau, Vide } from "@/components/ui";
import { ajouterJours, dateLongue, dateSansAnnee, ecartJours, heure, libelleAge, parse, relatif } from "@/lib/dates";
import { calendrierEnfant } from "@/lib/pev";
import { useAuJour, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

export default function EspaceAgent() {
  const session = useStore((s) => s.session)!;
  const auJour = useAuJour();
  const router = useRouter();
  const perimetre = useEnfantsDuPerimetre();
  const { liste, urgents, reponses, recentes } = useCompteurs();
  const enfants = useStore((s) => s.enfants);

  const aujourdhui = useMemo(() => liste.filter((x) => x.alertes.some((a) => a.type === "aujourdhui")), [liste]);
  const prioritaires = useMemo(() => liste.filter((x) => x.alertes.some((a) => a.ton === "rouge" || a.ton === "orange")), [liste]);
  const semaine = useMemo(
    () =>
      Array.from({ length: 7 }, (_, k) => {
        const d = ajouterJours(auJour, k);
        return { d, n: perimetre.filter((e) => calendrierEnfant(e, auJour).some((r) => r.date === d && r.statut !== "fait")).length };
      }),
    [perimetre, auJour],
  );
  const total7 = semaine.reduce((s, x) => s + x.n, 0);
  const max7 = Math.max(1, ...semaine.map((s) => s.n));

  const aFaire = [
    { libelle: "Familles à rappeler (empêchement)", n: reponses, href: "/enfants?filtre=vaccin", icone: PhoneCall },
    { libelle: "Enfants sans acte de naissance", n: liste.filter((x) => x.alertes.some((a) => a.type === "acte")).length, href: "/enfants?filtre=acte", icone: FileX2 },
    { libelle: "Mesures de poids et taille dues", n: liste.filter((x) => x.alertes.some((a) => a.type === "pesee")).length, href: "/enfants?filtre=croissance", icone: Ruler },
    { libelle: "Dépistages à faire", n: liste.filter((x) => x.alertes.some((a) => a.type === "depistage")).length, href: "/enfants", icone: Sparkles },
  ];

  return (
    <>
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[0.82rem] text-muted first-letter:uppercase">{dateLongue(auJour)}</p>
          <h1 className="page-title">Bonjour, {session.nom.split(" ")[0]}</h1>
          <p className="mt-0.5 text-[0.9rem] text-muted">
            {urgents ? `${urgents} enfants à voir en priorité à l'${session.lieu}.` : "Rien d'urgent aujourd'hui."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LienBouton href="/scan" variante="secondaire" icone={ScanLine}>
            Scanner une carte
          </LienBouton>
          <LienBouton href="/inscription" icone={UserPlus}>
            Inscrire un enfant
          </LienBouton>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Indicateur libelle="Enfants suivis" valeur={perimetre.length} sous={session.lieu} icone={Users} href="/enfants" />
        <Indicateur libelle="À appeler en priorité" valeur={urgents} sous="Vaccin manqué ou croissance" icone={PhoneCall} ton={urgents ? "danger" : "neutre"} href="/enfants?filtre=urgent" />
        <Indicateur libelle="Vaccins prévus aujourd'hui" valeur={aujourdhui.length} sous={`${total7} rendez-vous sur 7 jours`} icone={Syringe} ton={aujourdhui.length ? "info" : "neutre"} href="/enfants?filtre=jour" />
        <Indicateur libelle="Empêchements à traiter" valeur={reponses} sous="Réponse 2 sur WhatsApp" icone={MessageCircle} ton={reponses ? "warn" : "neutre"} href="/messages?filtre=reponses" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Carte>
            <CarteEntete
              titre="À appeler en priorité"
              description="Classés par urgence : retard de vaccin, empêchement, croissance"
              icone={PhoneCall}
              lien={{ href: "/enfants?filtre=urgent", libelle: `Tout voir (${prioritaires.length})` }}
            />
            {prioritaires.length ? (
              <Tableau>
                <thead>
                  <tr>
                    <th>Enfant</th>
                    <th>Motif</th>
                    <th className="hidden md:table-cell">Mère</th>
                    <th className="w-10">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {prioritaires.slice(0, 8).map(({ enfant: e, alertes }) => (
                    <tr key={e.id} className="cursor-pointer" onClick={() => router.push(`/enfant/${e.id}`)}>
                      <td className="min-w-44">
                        <Personne enfant={e} sous={`${libelleAge(e.naissance, auJour)} · ${e.quartier}`} />
                      </td>
                      <td>
                        <Alertes alertes={alertes} />
                      </td>
                      <td className="hidden whitespace-nowrap md:table-cell">
                        <span className="block text-fg-soft">{e.mere.nom}</span>
                        <a href={`tel:${e.mere.telephone.replaceAll(" ", "")}`} onClick={(ev) => ev.stopPropagation()} className="text-[0.82rem] text-brand-fg hover:underline">
                          {e.mere.telephone}
                        </a>
                      </td>
                      <td onClick={(ev) => ev.stopPropagation()}>
                        <MenuActions
                          elements={[
                            { libelle: "Ouvrir le carnet", icone: Eye, onClick: () => router.push(`/enfant/${e.id}`) },
                            { libelle: "Appeler la mère", icone: Phone, onClick: () => (window.location.href = `tel:${e.mere.telephone.replaceAll(" ", "")}`) },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            ) : (
              <Vide icone={CheckCircle2} titre="Personne à rappeler" description="Tous les enfants du centre sont à jour." />
            )}
          </Carte>

          <Carte>
            <CarteEntete titre="Vaccins prévus aujourd'hui" description="Le vaccin sera prérempli au scan de la carte" icone={Syringe} lien={{ href: "/scan", libelle: "Scanner" }} />
            {aujourdhui.length ? (
              <ul className="divide-y divide-line">
                {aujourdhui.map(({ enfant: e, alertes }) => {
                  const a = alertes.find((x) => x.type === "aujourdhui")!;
                  return (
                    <li key={e.id}>
                      <Link href={`/enfant/${e.id}`} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-card-muted">
                        <Personne enfant={e} sous={a.detail} lien={false} />
                        <ChevronRight size={15} className="ml-auto shrink-0 text-muted group-hover:text-brand-fg" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Vide icone={CalendarDays} titre="Aucun vaccin prévu aujourd'hui" className="py-8" />
            )}
          </Carte>
        </div>

        <div className="space-y-4">
          <Carte>
            <CarteEntete titre="À traiter" icone={ListChecks} />
            <ul className="divide-y divide-line">
              {aFaire.map((t) => (
                <li key={t.libelle}>
                  <Link href={t.href} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-card-muted">
                    <t.icone size={17} className="shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate">{t.libelle}</span>
                    <span className={cn("tnum text-[1.05rem] font-semibold", t.n ? "text-fg" : "text-muted")}>{t.n}</span>
                    <ChevronRight size={15} className="shrink-0 text-muted group-hover:text-brand-fg" />
                  </Link>
                </li>
              ))}
            </ul>
          </Carte>

          <Carte>
            <CarteEntete titre="Rendez-vous des 7 jours" description={`${total7} enfants attendus au centre`} icone={CalendarDays} />
            <div className="flex h-36 items-end gap-2 px-4 pb-3 pt-4">
              {semaine.map((s, i) => (
                <div key={s.d} className="flex h-full flex-1 flex-col items-center gap-1" title={`${s.n} enfants le ${dateSansAnnee(s.d)}`}>
                  <span className="tnum text-xs font-medium text-fg-soft">{s.n || ""}</span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={cn("w-full rounded-t-sm transition-all duration-700", i === 0 ? "bg-primary-600 dark:bg-primary-400" : "bg-primary-200 dark:bg-primary-800")}
                      style={{ height: `${Math.max(4, (s.n / max7) * 100)}%` }}
                    />
                  </div>
                  <span className={cn("text-[0.72rem]", i === 0 ? "font-semibold text-brand-fg" : "text-muted")}>{i === 0 ? "auj." : JOURS[parse(s.d).getDay()]}</span>
                </div>
              ))}
            </div>
          </Carte>

          <Carte>
            <CarteEntete titre="Réponses des familles" description="Boutons 1 et 2 sur WhatsApp" icone={ClipboardList} lien={{ href: "/messages?filtre=reponses", libelle: "Journal" }} />
            {recentes.length ? (
              <ul className="divide-y divide-line">
                {recentes.slice(0, 5).map((m) => {
                  const e = enfants.find((x) => x.id === m.enfantId)!;
                  return (
                    <li key={m.id}>
                      <Link href={`/enfant/${e.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-card-muted">
                        <span className={cn("tnum grid size-7 shrink-0 place-items-center rounded font-semibold", m.reponse === "1" ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger")}>{m.reponse}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {e.prenom} {e.nom}
                          </span>
                          <span className="block text-[0.82rem] text-muted">{m.reponse === "1" ? "Viendra au centre" : "A un empêchement"}</span>
                        </span>
                        <span className="text-xs text-muted">
                          {ecartJours(m.date.slice(0, 10), auJour) === 0 ? heure(m.date) : relatif(m.date.slice(0, 10), auJour)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Vide icone={MessageCircle} titre="Pas encore de réponse" className="py-8" />
            )}
          </Carte>
        </div>
      </div>
    </>
  );
}
