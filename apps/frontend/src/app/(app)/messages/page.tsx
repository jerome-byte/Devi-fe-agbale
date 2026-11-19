"use client";

import { CheckCheck, Headphones, Megaphone, MessageCircle, Reply, SearchX } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { LecteurAudio } from "@/components/lecteur-audio";
import { Carte, EntetePage, Indicateur, Onglets, Pagination, Pastille, Recherche, Selecteur, Tableau, Vide, usePagination, type Ton } from "@/components/ui";
import { dateCourte, heure } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { pourcent } from "@/lib/utils";
import { audioPour, messageCatalogue, texteMessage } from "@/lib/voix";

type Filtre = "tous" | "Vaccination" | "reponses" | "Protection" | "Croissance" | "Annonce";

const TON_CATEGORIE: Record<string, Ton> = {
  Inscription: "brand",
  Vaccination: "info",
  Protection: "warn",
  Croissance: "ok",
  Nutrition: "ok",
  Dépistage: "violet",
  Annonce: "neutre",
};

const PAR_PAGE = 25;

export default function Messages() {
  const session = useStore((s) => s.session)!;
  const messages = useStore((s) => s.messages);
  const enfants = useStore((s) => s.enfants);
  const ecouter = useStore((s) => s.ecouter);
  const router = useRouter();
  const params = useSearchParams();
  const anonyme = session.role === "pilotage";
  const [filtre, setFiltre] = useState<Filtre>((params.get("filtre") as Filtre) ?? "tous");
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState("");

  const parId = useMemo(() => new Map(enfants.map((e) => [e.id, e])), [enfants]);
  const perimetre = useMemo(
    () => messages.filter((m) => anonyme || m.enfantId === null || parId.get(m.enfantId)?.centre === "be_kpota"),
    [messages, anonyme, parId],
  );

  const garde = (f: Filtre, m: (typeof perimetre)[number]) =>
    f === "tous" ? true : f === "reponses" ? !!m.reponse : messageCatalogue(m.messageId)?.categorie === f;

  const filtres = useMemo(() => {
    const t = q.trim().toLowerCase();
    return perimetre.filter((m) => {
      if (!garde(filtre, m)) return false;
      if (statut && m.statut !== statut) return false;
      if (t && !anonyme) {
        const e = m.enfantId ? parId.get(m.enfantId) : null;
        if (!`${e?.prenom ?? ""} ${e?.nom ?? ""} ${e?.mere.nom ?? ""} ${messageCatalogue(m.messageId)?.texte_fr ?? ""}`.toLowerCase().includes(t)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perimetre, filtre, statut, q, anonyme, parId]);

  const { page, pages, elements, setPage } = usePagination(filtres, PAR_PAGE, `${filtre}|${statut}|${q}`);

  const individuels = perimetre.filter((m) => m.enfantId);
  const ecoutes = individuels.filter((m) => m.statut !== "envoye").length;
  const reponses = individuels.filter((m) => m.reponse).length;

  return (
    <>
      <EntetePage
        titre="Journal des messages"
        description="Chaque vocal envoyé aux familles, à écouter ici sans téléphone."
        ariane={[{ libelle: "Familles" }, { libelle: "Journal des messages" }]}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicateur libelle="Vocaux envoyés" valeur={individuels.length} icone={MessageCircle} />
        <Indicateur libelle="Écoutés" valeur={`${pourcent(ecoutes, individuels.length)} %`} sous={`${ecoutes} messages`} icone={Headphones} ton="ok" />
        <Indicateur libelle="Réponses 1 ou 2" valeur={reponses} icone={Reply} onClick={() => setFiltre("reponses")} />
        <Indicateur libelle="Annonces" valeur={perimetre.filter((m) => !m.enfantId).length} icone={Megaphone} onClick={() => setFiltre("Annonce")} />
      </div>

      <Carte>
        <div className="px-3 pt-1">
          <Onglets
            valeur={filtre}
            onChange={setFiltre}
            onglets={(["tous", "Vaccination", "reponses", "Protection", "Croissance", "Annonce"] as Filtre[]).map((f) => ({
              valeur: f,
              libelle: { tous: "Tous", Vaccination: "Vaccination", reponses: "Réponses", Protection: "Acte de naissance", Croissance: "Croissance", Annonce: "Annonces" }[f],
              compte: perimetre.filter((m) => garde(f, m)).length,
            }))}
          />
        </div>
        <div className="flex flex-col gap-2 border-b border-line p-3 lg:flex-row lg:items-center">
          {!anonyme && <Recherche valeur={q} onChange={setQ} placeholder="Prénom de l'enfant ou de la mère" className="lg:max-w-md lg:flex-1" />}
          <Selecteur value={statut} onChange={(e) => setStatut(e.target.value)} className="lg:ml-auto lg:w-56" aria-label="Filtrer par statut">
            <option value="">Tous les statuts</option>
            <option value="envoye">Envoyé, pas encore écouté</option>
            <option value="ecoute">Écouté</option>
            <option value="repondu">Répondu</option>
          </Selecteur>
        </div>

        {!elements.length ? (
          <Vide icone={SearchX} titre="Aucun message" description="Changez d'onglet ou de filtre." />
        ) : (
          <Tableau>
            <thead>
              <tr>
                <th>Date</th>
                <th>Destinataire</th>
                <th>Message</th>
                <th className="min-w-56">Écouter</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {elements.map((m) => {
                const e = m.enfantId ? parId.get(m.enfantId) : undefined;
                const cat = messageCatalogue(m.messageId);
                const audio = audioPour(m.messageId, e);
                const lien = e && !anonyme;
                return (
                  <tr key={m.id} className={lien ? "cursor-pointer" : ""} onClick={() => lien && router.push(`/enfant/${e.id}`)}>
                    <td className="whitespace-nowrap">
                      <span className="block">{dateCourte(m.date)}</span>
                      <span className="block text-[0.82rem] text-muted">{heure(m.date)}</span>
                    </td>
                    <td className="whitespace-nowrap">
                      {m.enfantId === null ? (
                        <>
                          <span className="block font-medium">{m.cible}</span>
                          <span className="block text-[0.82rem] text-muted">{m.nbFamilles} familles</span>
                        </>
                      ) : lien ? (
                        <>
                          <span className="block font-medium">
                            {e.prenom} {e.nom}
                          </span>
                          <span className="block text-[0.82rem] text-muted">Mère : {e.mere.nom}</span>
                        </>
                      ) : (
                        <>
                          <span className="block font-medium">Famille</span>
                          <span className="block text-[0.82rem] text-muted">{e?.quartier}</span>
                        </>
                      )}
                    </td>
                    <td className="min-w-64 max-w-md">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Pastille ton={TON_CATEGORIE[cat?.categorie ?? ""] ?? "neutre"} taille="sm">
                          {cat?.categorie}
                        </Pastille>
                        <span className="font-medium">{cat?.declencheur}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-1 text-[0.85rem] text-muted">{texteMessage(m.messageId, e).fr}</span>
                    </td>
                    <td onClick={(ev) => ev.stopPropagation()}>
                      {audio ? <LecteurAudio src={audio.src} duree={audio.duree} nbBarres={22} compact onLecture={() => ecouter(m.id)} /> : <span className="text-[0.85rem] text-muted">Pas d&apos;audio</span>}
                    </td>
                    <td className="whitespace-nowrap">
                      {m.reponse ? (
                        <Pastille ton={m.reponse === "1" ? "ok" : "danger"} point>
                          Réponse {m.reponse}
                        </Pastille>
                      ) : m.enfantId === null ? (
                        <Pastille ton="neutre">Annonce</Pastille>
                      ) : m.statut === "ecoute" ? (
                        <Pastille ton="info" icone={CheckCheck}>
                          Écouté
                        </Pastille>
                      ) : (
                        <Pastille ton="neutre">Envoyé</Pastille>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Tableau>
        )}
        {filtres.length > 0 && <Pagination page={page} pages={pages} onChange={setPage} total={filtres.length} parPage={PAR_PAGE} libelle="messages" />}
      </Carte>
    </>
  );
}
