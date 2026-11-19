"use client";

import { CheckCircle2, History, Megaphone, Send, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LecteurAudio } from "@/components/lecteur-audio";
import { Bouton, Carte, CarteEntete, Champ, EntetePage, Pagination, Selecteur, Tableau, Vide, usePagination } from "@/components/ui";
import { MODE_BASE } from "@/lib/base";
import { dateCourte, heure } from "@/lib/dates";
import { chargerVuesPilotage } from "@/lib/pilotage";
import { QUARTIERS } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CATALOGUE, CENTRES, audioPour } from "@/lib/voix";

const ANNONCES = CATALOGUE.filter((m) => m.categorie === "Annonce");

export default function Annonces() {
  const enfants = useStore((s) => s.enfants);
  const messages = useStore((s) => s.messages);
  const envoyer = useStore((s) => s.envoyerAnnonce);
  const [choix, setChoix] = useState(ANNONCES[0]?.id ?? "");
  const [cible, setCible] = useState("Tout le district");
  const [envoye, setEnvoye] = useState<string | null>(null);

  // Mode base : le pilotage ne lit pas les dossiers des enfants (règles de sécurité),
  // seulement le nombre d'enfants par zone, dans la vue agrégée de Cherif.
  const [zonesBase, setZonesBase] = useState<{ zone: string; enfants: number }[]>([]);
  useEffect(() => {
    if (!MODE_BASE) return;
    let actif = true;
    chargerVuesPilotage()
      .then((v) => {
        if (actif) setZonesBase(v.zones.map((z) => ({ zone: z.zone, enfants: Number(z.children) })).sort((a, b) => a.zone.localeCompare(b.zone)));
      })
      .catch(() => undefined);
    return () => {
      actif = false;
    };
  }, []);

  const familles = useMemo(() => {
    if (MODE_BASE) {
      if (cible === "Tout le district") return zonesBase.reduce((s, z) => s + z.enfants, 0);
      return zonesBase.find((z) => z.zone === cible)?.enfants ?? 0;
    }
    if (cible === "Tout le district") return enfants.length;
    if (cible === CENTRES.be_kpota) return enfants.filter((e) => e.centre === "be_kpota").length;
    if (cible === CENTRES.sylvanus_olympio) return enfants.filter((e) => e.centre === "sylvanus_olympio").length;
    return enfants.filter((e) => e.quartier === cible).length;
  }, [enfants, cible, zonesBase]);
  const historique = messages.filter((m) => m.enfantId === null);
  const pag = usePagination(historique, 10);

  return (
    <>
      <EntetePage
        titre="Annonces vocales"
        description="Un message validé, une zone : chaque famille l'entend en éwé sur WhatsApp."
        ariane={[{ libelle: "Familles" }, { libelle: "Annonces vocales" }]}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Carte className="xl:col-span-2">
          <CarteEntete titre="1. Choisir le message" description="Messages validés par le référent médical et enregistrés en éwé" icone={Megaphone} />
          <ul className="divide-y divide-line">
            {ANNONCES.map((a) => {
              const au = audioPour(a.id);
              const actif = choix === a.id;
              return (
                <li key={a.id}>
                  <div onClick={() => setChoix(a.id)} className={cn("flex cursor-pointer gap-3 px-4 py-3 transition-colors", actif ? "bg-brand-soft" : "hover:bg-card-muted")}>
                    <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2", actif ? "border-primary-600" : "border-line-strong")}>
                      {actif && <span className="size-1.5 rounded-full bg-primary-600" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{a.texte_fr}</p>
                      <p className="mt-0.5 text-[0.85rem] italic text-muted">{a.modele_ewe}</p>
                      {au && (
                        <div onClick={(e) => e.stopPropagation()} className="mt-2 max-w-xs">
                          <LecteurAudio src={au.src} duree={au.duree} compact nbBarres={26} />
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Carte>

        <Carte className="self-start">
          <CarteEntete titre="2. Choisir la zone" icone={Users} />
          <div className="space-y-4 p-4">
            <Champ label="Zone">
              <Selecteur value={cible} onChange={(e) => setCible(e.target.value)}>
                <option>Tout le district</option>
                {MODE_BASE ? (
                  <optgroup label="Zones">
                    {zonesBase.map((z) => (
                      <option key={z.zone}>{z.zone}</option>
                    ))}
                  </optgroup>
                ) : (
                  <>
                    <optgroup label="Aires de santé">
                      <option>{CENTRES.be_kpota}</option>
                      <option>{CENTRES.sylvanus_olympio}</option>
                    </optgroup>
                    <optgroup label="Quartiers">
                      {[...QUARTIERS.be_kpota, ...QUARTIERS.sylvanus_olympio].map((q) => (
                        <option key={q}>{q}</option>
                      ))}
                    </optgroup>
                  </>
                )}
              </Selecteur>
            </Champ>
            <div className="rounded-md bg-card-muted px-3 py-2.5">
              <p className="tnum text-[1.65rem] font-semibold leading-none">{familles}</p>
              <p className="mt-1 text-[0.85rem] text-muted">familles recevront le vocal</p>
            </div>
            <Bouton
              className="w-full"
              icone={Send}
              disabled={!familles}
              onClick={() => {
                envoyer(choix, cible, familles);
                setEnvoye(`Annonce envoyée à ${familles} familles (${cible}).`);
                setTimeout(() => setEnvoye(null), 3500);
              }}
            >
              Envoyer l&apos;annonce
            </Bouton>
            {envoye && (
              <p className="flex animate-fade-in items-start gap-2 rounded-md bg-ok-soft px-3 py-2 text-[0.88rem] text-ok">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {envoye}
              </p>
            )}
          </div>
        </Carte>
      </div>

      <Carte className="mt-4">
        <CarteEntete titre="Annonces envoyées" icone={History} />
        {historique.length ? (
          <Tableau>
            <thead>
              <tr>
                <th>Date</th>
                <th>Message</th>
                <th>Zone</th>
                <th className="text-right">Familles</th>
              </tr>
            </thead>
            <tbody>
              {pag.elements.map((m) => (
                <tr key={m.id}>
                  <td className="tnum whitespace-nowrap">
                    {dateCourte(m.date)}
                    <span className="block text-[0.82rem] text-muted">{heure(m.date)}</span>
                  </td>
                  <td className="min-w-64">{ANNONCES.find((x) => x.id === m.messageId)?.texte_fr}</td>
                  <td className="whitespace-nowrap text-fg-soft">{m.cible}</td>
                  <td className="tnum text-right">{m.nbFamilles}</td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        ) : (
          <Vide icone={Megaphone} titre="Aucune annonce envoyée" />
        )}
        {historique.length > 0 && <Pagination page={pag.page} pages={pag.pages} onChange={pag.setPage} total={historique.length} parPage={10} libelle="annonces" />}
      </Carte>
    </>
  );
}
