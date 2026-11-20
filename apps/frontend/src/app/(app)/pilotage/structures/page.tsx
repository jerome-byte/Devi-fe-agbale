"use client";

import { AlertCircle, Building2, CheckCircle2, Hospital, Plus, Store, UserPlus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Bouton, Carte, CarteEntete, Champ, Chargement, EntetePage, Indicateur, LienBouton, Onglets, Pastille, Selecteur, Tableau, Vide, type Ton } from "@/components/ui";
import {
  LIBELLE_TYPE,
  chargerStructures,
  creerStructure,
  messageErreur,
  useChargement,
  type TypeStructure,
} from "@/lib/administration";
import { MODE_BASE } from "@/lib/base";
import { cn } from "@/lib/utils";

const TON_TYPE: Record<TypeStructure, Ton> = { hopital: "violet", centre: "brand", garderie: "warn" };
const ICONE_TYPE = { hopital: Hospital, centre: Building2, garderie: Store };

type Filtre = "tout" | TypeStructure;

export default function Structures() {
  const { donnees, erreur, recharger } = useChargement(chargerStructures, MODE_BASE);
  const [filtre, setFiltre] = useState<Filtre>("tout");

  const structures = useMemo(() => donnees?.structures ?? [], [donnees]);
  const zones = donnees?.zones ?? [];
  const nb = (t: TypeStructure) => structures.filter((s) => s.type === t).length;
  const affichees = filtre === "tout" ? structures : structures.filter((s) => s.type === filtre);

  // Formulaire
  const [type, setType] = useState<TypeStructure>("centre");
  const [nom, setNom] = useState("");
  const [zone, setZone] = useState("");
  const [centre, setCentre] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<{ ok: boolean; texte: string; id?: number; type?: TypeStructure } | null>(null);
  const centres = structures.filter((s) => s.type !== "garderie");

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim() || !zone) return;
    setEnvoi(true);
    setRetour(null);
    try {
      const r = await creerStructure({ type, nom: nom.trim(), zone_id: Number(zone), centre_id: type === "garderie" && centre ? Number(centre) : null });
      setRetour({ ok: true, texte: `${LIBELLE_TYPE[r.type]} « ${r.nom} » enregistré${r.type === "garderie" ? "e" : ""}.`, id: r.id, type: r.type });
      setNom("");
      setCentre("");
      recharger();
    } catch (err) {
      setRetour({ ok: false, texte: messageErreur(err) });
    } finally {
      setEnvoi(false);
    }
  }

  if (!MODE_BASE) {
    return (
      <>
        <EntetePage titre="Structures" ariane={[{ libelle: "Administration" }, { libelle: "Structures" }]} />
        <Carte>
          <Vide icone={Building2} titre="Disponible avec la base de données" description="Les structures et les comptes sont enregistrés dans Supabase. Cette page fonctionne sur la version en ligne." />
        </Carte>
      </>
    );
  }

  return (
    <>
      <EntetePage
        titre="Structures"
        description="Hôpitaux, centres de santé et garderies du district. Chaque structure reçoit ensuite les comptes de ses agents."
        ariane={[{ libelle: "Administration" }, { libelle: "Structures" }]}
        actions={
          <LienBouton href="/pilotage/comptes" variante="secondaire" icone={UserPlus}>
            Comptes
          </LienBouton>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Indicateur libelle="Hôpitaux" valeur={donnees ? nb("hopital") : "–"} icone={Hospital} onClick={() => setFiltre("hopital")} actif={filtre === "hopital"} />
        <Indicateur libelle="Centres de santé" valeur={donnees ? nb("centre") : "–"} icone={Building2} onClick={() => setFiltre("centre")} actif={filtre === "centre"} />
        <Indicateur libelle="Garderies" valeur={donnees ? nb("garderie") : "–"} icone={Store} onClick={() => setFiltre("garderie")} actif={filtre === "garderie"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Carte className="xl:col-span-2">
          <CarteEntete titre="Structures enregistrées" description="Le pilotage voit le nombre d'enfants, jamais leurs dossiers." icone={Building2} />
          <div className="px-4 pt-2">
            <Onglets<Filtre>
              valeur={filtre}
              onChange={setFiltre}
              onglets={[
                { valeur: "tout", libelle: "Toutes", compte: structures.length },
                { valeur: "hopital", libelle: "Hôpitaux", compte: nb("hopital") },
                { valeur: "centre", libelle: "Centres", compte: nb("centre") },
                { valeur: "garderie", libelle: "Garderies", compte: nb("garderie") },
              ]}
            />
          </div>
          {erreur ? (
            <Vide icone={AlertCircle} titre="Chargement impossible" description={erreur} action={<Bouton variante="secondaire" onClick={recharger}>Réessayer</Bouton>} />
          ) : !donnees ? (
            <Chargement />
          ) : affichees.length ? (
            <Tableau>
              <thead>
                <tr>
                  <th>Structure</th>
                  <th>Zone</th>
                  <th className="text-right">Comptes</th>
                  <th className="text-right">Enfants</th>
                </tr>
              </thead>
              <tbody>
                {affichees.map((s) => {
                  const Icone = ICONE_TYPE[s.type];
                  return (
                    <tr key={`${s.type}-${s.id}`}>
                      <td className="min-w-56">
                        <div className="flex items-start gap-2.5">
                          <Icone size={16} className="mt-0.5 shrink-0 text-muted" />
                          <div>
                            <p className="font-medium">{s.nom}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              <Pastille ton={TON_TYPE[s.type]} taille="sm">
                                {LIBELLE_TYPE[s.type]}
                              </Pastille>
                              {s.centre && <span className="text-[0.82rem] text-muted">Partenaire : {s.centre}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-fg-soft">{s.zone ?? "–"}</td>
                      <td className="tnum text-right">
                        {Number(s.comptes) ? (
                          Number(s.comptes)
                        ) : (
                          <Link href={`/pilotage/comptes?structure=${s.type}-${s.id}`} className="text-[0.85rem] font-medium text-brand-fg hover:underline">
                            Créer
                          </Link>
                        )}
                      </td>
                      <td className="tnum text-right">{Number(s.enfants)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Tableau>
          ) : (
            <Vide icone={Building2} titre="Aucune structure de ce type" />
          )}
        </Carte>

        <Carte className="self-start">
          <CarteEntete titre="Nouvelle structure" icone={Plus} />
          <form onSubmit={enregistrer} className="space-y-4 p-4">
            <div>
              <p className="label">Type</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(["hopital", "centre", "garderie"] as TypeStructure[]).map((t) => {
                  const Icone = ICONE_TYPE[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-md border px-2 py-2.5 text-[0.85rem] transition-colors",
                        type === t ? "border-primary-600 bg-brand-soft font-medium text-brand-fg ring-1 ring-primary-600/30" : "border-line-strong bg-card text-fg hover:bg-card-muted",
                      )}
                    >
                      <Icone size={18} />
                      {LIBELLE_TYPE[t]}
                    </button>
                  );
                })}
              </div>
            </div>
            <Champ label="Nom">
              <input
                className="input"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder={type === "garderie" ? "Ex. Garderie du marché d'Adawlato" : type === "hopital" ? "Ex. CHU Sylvanus Olympio" : "Ex. Centre de santé de Nyékonakpoè"}
                required
                minLength={3}
              />
            </Champ>
            <Champ label="Zone">
              <Selecteur value={zone} onChange={(e) => setZone(e.target.value)} required>
                <option value="">Choisir une zone</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.nom}
                  </option>
                ))}
              </Selecteur>
            </Champ>
            {type === "garderie" && (
              <Champ label="Centre de santé partenaire" aide="Le centre qui reçoit les enfants orientés par la garderie.">
                <Selecteur value={centre} onChange={(e) => setCentre(e.target.value)}>
                  <option value="">Aucun pour l&apos;instant</option>
                  {centres.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </Selecteur>
              </Champ>
            )}
            <Bouton type="submit" className="w-full" icone={Plus} chargement={envoi} disabled={envoi || !nom.trim() || !zone}>
              Enregistrer la structure
            </Bouton>
            {retour && (
              <div className={cn("animate-fade-in rounded-md px-3 py-2.5 text-[0.88rem]", retour.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger")}>
                <p className="flex items-start gap-2">
                  {retour.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                  {retour.texte}
                </p>
                {retour.ok && retour.id !== undefined && (
                  <Link href={`/pilotage/comptes?structure=${retour.type}-${retour.id}`} className="mt-1.5 inline-flex items-center gap-1 pl-6 font-medium underline">
                    Créer un compte pour cette structure
                  </Link>
                )}
              </div>
            )}
          </form>
        </Carte>
      </div>
    </>
  );
}
