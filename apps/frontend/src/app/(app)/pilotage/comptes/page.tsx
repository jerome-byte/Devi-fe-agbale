"use client";

import { AlertCircle, Building2, CheckCircle2, Copy, KeyRound, Power, PowerOff, ShieldCheck, Store, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Bouton, Carte, CarteEntete, Champ, Chargement, EntetePage, LienBouton, MenuActions, Onglets, Pastille, Selecteur, Tableau, Vide } from "@/components/ui";
import {
  LIBELLE_ROLE_GERE,
  LIBELLE_TYPE,
  changerEtat,
  chargerComptes,
  chargerStructures,
  creerCompte,
  messageErreur,
  reinitialiserMotDePasse,
  structuresPour,
  useChargement,
  type Compte,
  type RoleGere,
} from "@/lib/administration";
import { MODE_BASE } from "@/lib/base";
import { dateCourte, heure } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Filtre = "actifs" | "desactives" | "tout";

/** Mot de passe provisoire : affiché une seule fois, à transmettre à la personne. */
function MotDePasseUnique({ email, nom, motDePasse, fermer }: { email: string; nom: string; motDePasse: string; fermer: () => void }) {
  const [copie, setCopie] = useState(false);
  return (
    <div className="animate-fade-in rounded-md border border-ok/30 bg-ok-soft p-3 text-[0.88rem]">
      <p className="flex items-start gap-2 font-medium text-ok">
        <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> Accès de {nom}
      </p>
      <dl className="mt-2 space-y-1.5 pl-6">
        <div>
          <dt className="text-xs text-muted">E-mail</dt>
          <dd className="font-medium break-all">{email}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Mot de passe provisoire</dt>
          <dd className="flex items-center gap-2">
            <code className="rounded bg-card px-2 py-1 font-mono text-[0.95rem] tracking-wide">{motDePasse}</code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(motDePasse).then(() => setCopie(true), () => undefined);
              }}
              className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-brand-fg hover:bg-card"
            >
              <Copy size={13} /> {copie ? "Copié" : "Copier"}
            </button>
          </dd>
        </div>
      </dl>
      <p className="mt-2 pl-6 text-[0.82rem] text-fg-soft">Notez-le maintenant : il ne sera plus affiché. Transmettez-le en main propre.</p>
      <div className="mt-2 pl-6">
        <Bouton taille="sm" variante="secondaire" onClick={fermer}>
          C&apos;est noté
        </Bouton>
      </div>
    </div>
  );
}

function PageComptes() {
  const parametres = useSearchParams();
  const comptes = useChargement(chargerComptes, MODE_BASE);
  const structures = useChargement(chargerStructures, MODE_BASE);
  const liste = useMemo(() => comptes.donnees ?? [], [comptes.donnees]);
  const toutesStructures = useMemo(() => structures.donnees?.structures ?? [], [structures.donnees]);
  const [filtre, setFiltre] = useState<Filtre>("actifs");

  // Structure présélectionnée depuis la page Structures (?structure=garderie-3).
  const [preType, preId] = (parametres.get("structure") ?? "").split("-");
  const [role, setRole] = useState<RoleGere>(preType === "garderie" ? "educatrice" : "agent");
  const [structure, setStructure] = useState(preId ?? "");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreurForm, setErreurForm] = useState<string | null>(null);
  const [acces, setAcces] = useState<{ email: string; nom: string; motDePasse: string } | null>(null);

  // Actions sur un compte (confirmation dans la page, pas de fenêtre du navigateur).
  const [aConfirmer, setAConfirmer] = useState<{ compte: Compte; action: "desactiver" | "reinitialiser" } | null>(null);
  const [actionEnCours, setActionEnCours] = useState(false);
  const [retourAction, setRetourAction] = useState<{ ok: boolean; texte: string } | null>(null);

  const choix = structuresPour(role, toutesStructures);
  const affiches = liste.filter((c) => (filtre === "tout" ? true : filtre === "actifs" ? c.actif : !c.actif));

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    if (!structure) return;
    setEnvoi(true);
    setErreurForm(null);
    setAcces(null);
    try {
      const r = await creerCompte({ nom: nom.trim(), email: email.trim(), role, structure_id: Number(structure) });
      setAcces({ email: r.email, nom: r.nom, motDePasse: r.mot_de_passe });
      setNom("");
      setEmail("");
      comptes.recharger();
      structures.recharger();
    } catch (err) {
      setErreurForm(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  }

  async function executer(compte: Compte, action: "desactiver" | "reactiver" | "reinitialiser") {
    setActionEnCours(true);
    setRetourAction(null);
    try {
      if (action === "reinitialiser") {
        const r = await reinitialiserMotDePasse(compte.id);
        setAcces({ email: compte.email ?? "", nom: compte.nom ?? "", motDePasse: r.mot_de_passe });
      } else {
        await changerEtat(compte.id, action === "reactiver");
        setRetourAction({ ok: true, texte: action === "reactiver" ? `${compte.nom} peut de nouveau se connecter.` : `${compte.nom} ne peut plus se connecter ni lire de dossier.` });
        comptes.recharger();
      }
      setAConfirmer(null);
    } catch (err) {
      setRetourAction({ ok: false, texte: messageErreur(err) });
    } finally {
      setActionEnCours(false);
    }
  }

  if (!MODE_BASE) {
    return (
      <>
        <EntetePage titre="Comptes" ariane={[{ libelle: "Administration" }, { libelle: "Comptes" }]} />
        <Carte>
          <Vide icone={Users} titre="Disponible avec la base de données" description="Les comptes sont créés dans Supabase. Cette page fonctionne sur la version en ligne." />
        </Carte>
      </>
    );
  }

  return (
    <>
      <EntetePage
        titre="Comptes"
        description="Le pilotage crée les comptes des agents et des éducatrices. Chacun ne voit que les enfants de sa structure."
        ariane={[{ libelle: "Administration" }, { libelle: "Comptes" }]}
        actions={
          <LienBouton href="/pilotage/structures" variante="secondaire" icone={Building2}>
            Structures
          </LienBouton>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {aConfirmer && (
            <Carte className="animate-fade-in border-warn/40">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[0.92rem]">
                  {aConfirmer.action === "desactiver" ? (
                    <>
                      Désactiver le compte de <strong>{aConfirmer.compte.nom}</strong> ? La personne ne pourra plus se connecter ni lire de dossier. Vous pourrez le réactiver.
                    </>
                  ) : (
                    <>
                      Générer un nouveau mot de passe provisoire pour <strong>{aConfirmer.compte.nom}</strong> ? L&apos;ancien ne fonctionnera plus.
                    </>
                  )}
                </p>
                <div className="flex shrink-0 gap-2">
                  <Bouton variante="secondaire" taille="sm" onClick={() => setAConfirmer(null)} disabled={actionEnCours}>
                    Annuler
                  </Bouton>
                  <Bouton
                    variante={aConfirmer.action === "desactiver" ? "danger" : "primaire"}
                    taille="sm"
                    chargement={actionEnCours}
                    disabled={actionEnCours}
                    onClick={() => executer(aConfirmer.compte, aConfirmer.action)}
                  >
                    {aConfirmer.action === "desactiver" ? "Désactiver" : "Générer"}
                  </Bouton>
                </div>
              </div>
            </Carte>
          )}
          {retourAction && (
            <p className={cn("flex animate-fade-in items-start gap-2 rounded-md px-3 py-2 text-[0.88rem]", retourAction.ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger")}>
              {retourAction.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
              {retourAction.texte}
            </p>
          )}

          <Carte>
            <CarteEntete titre="Agents et éducatrices" description="Les comptes de pilotage ne se gèrent pas ici." icone={Users} />
            <div className="px-4 pt-2">
              <Onglets<Filtre>
                valeur={filtre}
                onChange={setFiltre}
                onglets={[
                  { valeur: "actifs", libelle: "Actifs", compte: liste.filter((c) => c.actif).length },
                  { valeur: "desactives", libelle: "Désactivés", compte: liste.filter((c) => !c.actif).length },
                  { valeur: "tout", libelle: "Tous", compte: liste.length },
                ]}
              />
            </div>
            {comptes.erreur ? (
              <Vide icone={AlertCircle} titre="Chargement impossible" description={comptes.erreur} action={<Bouton variante="secondaire" onClick={comptes.recharger}>Réessayer</Bouton>} />
            ) : !comptes.donnees ? (
              <Chargement />
            ) : affiches.length ? (
              <Tableau>
                <thead>
                  <tr>
                    <th>Personne</th>
                    <th>Structure</th>
                    <th>Dernière connexion</th>
                    <th>État</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {affiches.map((c) => (
                    <tr key={c.id} className={cn(!c.actif && "opacity-70")}>
                      <td className="min-w-48">
                        <p className="font-medium">{c.nom ?? "Sans nom"}</p>
                        <p className="whitespace-nowrap text-[0.82rem] text-muted">{c.email}</p>
                      </td>
                      <td className="min-w-44">
                        <p>{c.structure ?? "–"}</p>
                        <p className="text-[0.82rem] text-muted">
                          {LIBELLE_ROLE_GERE[c.role]}
                          {c.type_structure ? ` · ${LIBELLE_TYPE[c.type_structure]}` : ""}
                        </p>
                      </td>
                      <td className="tnum whitespace-nowrap text-fg-soft">
                        {c.derniere_connexion ? (
                          <>
                            {dateCourte(c.derniere_connexion)}
                            <span className="block text-[0.82rem] text-muted">{heure(c.derniere_connexion)}</span>
                          </>
                        ) : (
                          <span className="text-muted">Jamais</span>
                        )}
                      </td>
                      <td>
                        {c.actif ? (
                          <Pastille ton="ok" point>
                            Actif
                          </Pastille>
                        ) : (
                          <Pastille ton="neutre" point>
                            Désactivé
                          </Pastille>
                        )}
                      </td>
                      <td>
                        <MenuActions
                          libelle={`Actions pour ${c.nom ?? c.email}`}
                          elements={
                            c.actif
                              ? [
                                  { libelle: "Nouveau mot de passe", icone: KeyRound, onClick: () => setAConfirmer({ compte: c, action: "reinitialiser" }) },
                                  "separateur",
                                  { libelle: "Désactiver le compte", icone: PowerOff, danger: true, onClick: () => setAConfirmer({ compte: c, action: "desactiver" }) },
                                ]
                              : [{ libelle: "Réactiver le compte", icone: Power, onClick: () => executer(c, "reactiver") }]
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            ) : (
              <Vide icone={Users} titre={filtre === "desactives" ? "Aucun compte désactivé" : "Aucun compte"} />
            )}
          </Carte>
        </div>

        <Carte className="self-start">
          <CarteEntete titre="Nouveau compte" icone={UserPlus} />
          <form onSubmit={creer} className="space-y-4 p-4">
            <div>
              <p className="label">Rôle</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(["agent", "educatrice"] as RoleGere[]).map((r) => {
                  const Icone = r === "agent" ? Building2 : Store;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setRole(r);
                        setStructure("");
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-2.5 text-[0.9rem] transition-colors",
                        role === r ? "border-primary-600 bg-brand-soft font-medium text-brand-fg ring-1 ring-primary-600/30" : "border-line-strong bg-card text-fg hover:bg-card-muted",
                      )}
                    >
                      <Icone size={16} /> {LIBELLE_ROLE_GERE[r]}
                    </button>
                  );
                })}
              </div>
            </div>
            <Champ label={role === "agent" ? "Hôpital ou centre de santé" : "Garderie"} aide={<Link href="/pilotage/structures" className="text-brand-fg hover:underline">Structure absente ? L&apos;enregistrer d&apos;abord</Link>}>
              <Selecteur value={structure} onChange={(e) => setStructure(e.target.value)} required>
                <option value="">Choisir</option>
                {choix.map((s) => (
                  <option key={`${s.type}-${s.id}`} value={s.id}>
                    {s.nom}
                  </option>
                ))}
              </Selecteur>
            </Champ>
            <Champ label="Nom complet">
              <input className="input" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Kossi Mensah" required minLength={2} autoComplete="off" />
            </Champ>
            <Champ label="E-mail de connexion">
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@exemple.tg" required autoComplete="off" />
            </Champ>
            <p className="flex items-start gap-2 rounded-md bg-card-muted px-3 py-2 text-[0.82rem] text-fg-soft">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-muted" />
              Un mot de passe provisoire est généré par le serveur et affiché une seule fois.
            </p>
            <Bouton type="submit" className="w-full" icone={UserPlus} chargement={envoi} disabled={envoi || !structure || !nom.trim() || !email.trim()}>
              Créer le compte
            </Bouton>
            {erreurForm && (
              <p className="flex animate-fade-in items-start gap-2 rounded-md bg-danger-soft px-3 py-2 text-[0.88rem] text-danger">
                <AlertCircle size={16} className="mt-0.5 shrink-0" /> {erreurForm}
              </p>
            )}
            {acces && <MotDePasseUnique {...acces} fermer={() => setAcces(null)} />}
          </form>
        </Carte>
      </div>
    </>
  );
}

export default function Comptes() {
  return (
    <Suspense fallback={<Chargement />}>
      <PageComptes />
    </Suspense>
  );
}
