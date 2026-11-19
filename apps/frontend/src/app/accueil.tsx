"use client";

import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarCheck,
  CheckCircle2,
  HeartPulse,
  MapPin,
  Menu,
  MessageCircle,
  Pause,
  Play,
  ScanLine,
  Smartphone,
  Store,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState, type ReactNode } from "react";
import { LecteurAudio } from "@/components/lecteur-audio";
import { LogoMarque } from "@/components/logo";
import { Compteur } from "@/components/ui";
import { cn } from "@/lib/utils";
import { audioPour, messageCatalogue } from "@/lib/voix";

/* ----------------------------------------------------------------- outils */

function Apparition({ children, delai = 0, y = 24, className }: { children: ReactNode; delai?: number; y?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: delai, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Etiquette({ children, claire }: { children: ReactNode; claire?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest",
        claire ? "bg-white/10 text-primary-200 ring-1 ring-white/15" : "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300",
      )}
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-50" />
        <span className="relative inline-flex size-2 rounded-full bg-current" />
      </span>
      {children}
    </span>
  );
}

function TitreSection({ etiquette, titre, description, claire, centre = true }: { etiquette: string; titre: string; description?: string; claire?: boolean; centre?: boolean }) {
  return (
    <div className={cn("mb-12 max-w-3xl", centre && "mx-auto text-center")}>
      <Apparition y={14}>
        <Etiquette claire={claire}>{etiquette}</Etiquette>
      </Apparition>
      <Apparition delai={0.05}>
        <h2 className={cn("mt-4 font-vitrine text-3xl font-bold leading-tight sm:text-4xl lg:text-[2.75rem]", claire ? "text-white" : "text-dark-800 dark:text-white")}>{titre}</h2>
      </Apparition>
      {description && (
        <Apparition delai={0.12}>
          <p className={cn("mt-5 text-base leading-relaxed sm:text-lg", claire ? "text-white/75" : "text-dark-600 dark:text-white/70")}>{description}</p>
        </Apparition>
      )}
    </div>
  );
}

function BoutonRond({ href, variante = "primaire", children }: { href: string; variante?: "primaire" | "contour" | "blanc"; children: ReactNode }) {
  const v = {
    primaire: "bg-primary-600 text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700 hover:shadow-xl hover:shadow-primary-600/35",
    contour: "border-2 border-white/40 text-white backdrop-blur-sm hover:border-white/80 hover:bg-white/10",
    blanc: "bg-white text-dark-800 shadow-lg shadow-black/10 hover:bg-[#f0f3f1]",
  }[variante];
  return (
    <Link
      href={href}
      className={cn("group/btn relative isolate inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-full px-7 py-3.5 text-sm font-semibold tracking-wide transition-all duration-300 hover:-translate-y-0.5", v)}
    >
      <span aria-hidden className="absolute inset-y-0 -left-full -z-10 w-1/2 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-all duration-700 group-hover/btn:left-[150%]" />
      {children}
    </Link>
  );
}

/* --------------------------------------------------------------- en-tête */

const NAV = [
  { href: "#probleme", libelle: "Le constat" },
  { href: "#parcours", libelle: "Le parcours" },
  { href: "#espaces", libelle: "Pour qui" },
  { href: "#voix", libelle: "La voix en éwé" },
];

function Entete() {
  const [defile, setDefile] = useState(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const f = () => setDefile(window.scrollY > 24);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  const plein = defile || mobile;

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-300", plein ? "bg-white/95 shadow-lg shadow-dark-900/5 backdrop-blur-md dark:bg-dark-900/95" : "bg-transparent")}>
      <div className={cn("overflow-hidden bg-primary-600 transition-all duration-300", plein ? "max-h-0" : "max-h-12")}>
        <div className="container-site flex h-10 items-center justify-between gap-4 text-xs text-white/90">
          <span className="flex items-center gap-1.5">
            <HeartPulse className="size-3.5" /> Hack4Children 2026 · UNICEF Togo
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <MapPin className="size-3.5" /> Lomé, Togo · prototype en ligne
          </span>
        </div>
      </div>
      <div className="container-site flex h-18 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5" aria-label="ɖevi ƒe agbalẽ, accueil">
          <LogoMarque className="size-10" />
          <span className={cn("font-vitrine text-[1.35rem] font-bold leading-none", plein ? "text-dark-800 dark:text-white" : "text-white")}>ɖevi ƒe agbalẽ</span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          {NAV.map((l) => (
            <a key={l.href} href={l.href} className={cn("rounded-full px-3.5 py-2 text-sm font-semibold transition", plein ? "text-dark-800 hover:text-primary-600 dark:text-white dark:hover:text-primary-300" : "text-white/90 hover:text-white")}>
              {l.libelle}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/connexion" className="hidden items-center gap-2 rounded-full bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 transition hover:-translate-y-0.5 hover:bg-primary-700 sm:inline-flex">
            Ouvrir la démo <ArrowRight className="size-4" />
          </Link>
          <button onClick={() => setMobile((m) => !m)} className={cn("grid size-10 place-items-center rounded-full lg:hidden", plein ? "text-dark-800 dark:text-white" : "text-white")} aria-label="Menu">
            {mobile ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {mobile && (
          <motion.nav initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-black/5 lg:hidden dark:border-white/10">
            <div className="container-site flex flex-col py-3">
              {NAV.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setMobile(false)} className="rounded-lg px-3 py-3 font-semibold text-dark-800 hover:bg-primary-50 dark:text-white dark:hover:bg-dark-800">
                  {l.libelle}
                </a>
              ))}
              <Link href="/connexion" className="mt-2 rounded-full bg-primary-600 px-5 py-3 text-center font-semibold text-white">
                Ouvrir la démo
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ------------------------------------------------------------------ hero */

const DIAPOS = [
  {
    image: "/images/mere-bebe.jpg",
    position: "object-[42%_30%] lg:object-[60%_30%]",
    etiquette: "Le carnet vivant de l'enfant",
    titre: "Quand Wezou s'arrête, le suivi de l'enfant continue",
    texte: "Un carnet numérique par enfant, de la naissance à 6 ans. Les familles reçoivent leurs rappels en éwé, par message vocal. Les agents de santé savent qui appeler en premier.",
    focus: { icone: Smartphone, libelle: "Rappels vocaux en éwé, sur WhatsApp" },
  },
  {
    image: "/images/carte-vaccination.jpg",
    position: "object-[50%_35%]",
    etiquette: "Vaccination",
    titre: "Aucun rendez-vous de vaccin ne passe inaperçu",
    texte: "Deux jours avant, la veille, le jour même. Si l'enfant ne vient pas, la mère répond 1 ou 2 et l'agente de santé sait aussitôt qui rappeler.",
    focus: { icone: CalendarCheck, libelle: "9 rendez-vous calculés dès l'inscription" },
  },
  {
    image: "/images/marche-lome.jpg",
    position: "object-center",
    etiquette: "Garderies des marchés",
    titre: "Un seul code QR, du centre de santé à la garderie",
    texte: "Un scan suffit : le vaccin prévu est prérempli, la pesée trace la courbe OMS, l'éducatrice note l'arrivée de l'enfant.",
    focus: { icone: ScanLine, libelle: "Un scan, un geste, le carnet est à jour" },
  },
];

const DUREE = 8000;

function Hero() {
  const [i, setI] = useState(0);
  const [lecture, setLecture] = useState(true);
  const [survol, setSurvol] = useState(false);
  const actif = lecture && !survol;
  const d = DIAPOS[i];
  const bienvenue = audioPour("bienvenue");

  useEffect(() => {
    if (!actif) return;
    const t = setTimeout(() => setI((x) => (x + 1) % DIAPOS.length), DUREE);
    return () => clearTimeout(t);
  }, [actif, i]);

  return (
    <section onMouseEnter={() => setSurvol(true)} onMouseLeave={() => setSurvol(false)} className="relative flex min-h-svh w-full items-center overflow-hidden bg-dark-950" aria-roledescription="carrousel" aria-label="Présentation de ɖevi ƒe agbalẽ">
      <AnimatePresence initial={false}>
        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }} className="absolute inset-0">
          <motion.div initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: DUREE / 1000 + 1.5, ease: "linear" }} className="absolute inset-0">
            <Image src={d.image} alt="" fill priority={i === 0} sizes="100vw" className={cn("object-cover", d.position)} />
          </motion.div>
        </motion.div>
      </AnimatePresence>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-dark-950/95 via-dark-950/75 to-dark-950/30" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-dark-950/90 to-transparent" />
      <div aria-hidden className="bg-grille absolute inset-0 opacity-40 [mask-image:linear-gradient(90deg,#000,transparent_70%)]" />
      <div aria-hidden className="absolute -left-32 top-1/3 size-96 animate-blob rounded-full bg-primary-600/25 blur-3xl" />

      <div className="container-site relative grid items-center gap-12 pb-36 pt-40 lg:pb-32 lg:pt-48 xl:grid-cols-[1fr_22rem]">
        <div>
          <AnimatePresence mode="wait">
            <motion.div key={i} exit={{ opacity: 0, y: -20, filter: "blur(6px)" }} transition={{ duration: 0.4 }} className="max-w-3xl">
              <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-primary-200">
                <span className="h-px w-10 bg-accent-400" />
                {d.etiquette}
              </motion.span>
              <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="mt-5 font-vitrine text-4xl font-bold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                {d.titre}
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }} className="mt-7 max-w-xl text-lg leading-relaxed text-white/85">
                {d.texte}
              </motion.p>
            </motion.div>
          </AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.45 }} className="mt-10 flex flex-wrap gap-4">
            <BoutonRond href="/connexion">
              Essayer le prototype <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-1" />
            </BoutonRond>
            <BoutonRond href="#parcours" variante="contour">
              Voir le parcours
            </BoutonRond>
          </motion.div>

          <div className="mt-14 flex flex-wrap items-center gap-5">
            <span className="font-vitrine text-sm font-semibold tabular-nums text-white">
              {String(i + 1).padStart(2, "0")}
              <span className="text-white/40"> / {String(DIAPOS.length).padStart(2, "0")}</span>
            </span>
            <div className="flex gap-2">
              {DIAPOS.map((x, k) => (
                <button key={x.titre} onClick={() => setI(k)} aria-label={`Diapositive ${k + 1}`} aria-current={k === i} className="group flex h-10 items-center">
                  <span className={cn("relative block h-1 overflow-hidden rounded-full bg-white/25 transition-all duration-500 group-hover:bg-white/50", k === i ? "w-14" : "w-6")}>
                    {k === i && (
                      <motion.span
                        key={`${i}-${actif}`}
                        className="absolute inset-y-0 left-0 rounded-full bg-primary-300"
                        initial={{ width: actif ? "0%" : "100%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: actif ? DUREE / 1000 : 0, ease: "linear" }}
                      />
                    )}
                  </span>
                </button>
              ))}
            </div>
            <button onClick={() => setLecture((p) => !p)} aria-label={lecture ? "Mettre en pause" : "Relancer"} className="grid size-10 place-items-center rounded-full border border-white/25 text-white transition hover:bg-white/10">
              {lecture ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
          </div>
        </div>

        <div aria-hidden className="relative hidden h-[28rem] xl:block">
          <div className="absolute right-0 top-0 w-80 animate-float rounded-3xl border border-white/15 bg-white/10 p-6 text-white shadow-2xl backdrop-blur-xl">
            <AnimatePresence mode="wait">
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}>
                <span className="grid size-12 place-items-center rounded-2xl bg-primary-600 shadow-lg shadow-primary-600/40">
                  <d.focus.icone className="size-6" />
                </span>
                <p className="mt-4 text-xs font-bold uppercase tracking-widest text-primary-200">{d.etiquette}</p>
                <p className="mt-1 font-vitrine text-xl font-bold leading-snug">{d.focus.libelle}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="absolute bottom-24 left-0 flex animate-float-slow items-center gap-4 rounded-2xl border border-white/15 bg-dark-950/60 p-3.5 pr-5 text-white shadow-2xl backdrop-blur-xl [animation-delay:-3s]">
            <span className="rounded-lg bg-white p-1.5">
              <QRCodeSVG value="DV-K7Q3PA" size={56} fgColor="#101714" />
            </span>
            <div>
              <p className="font-vitrine text-xl font-bold leading-none">Kossi</p>
              <p className="mt-1 text-xs text-white/70">USP Bè-Kpota</p>
              <p className="mt-1 font-mono text-[11px] text-accent-300">DV-K7Q3PA</p>
            </div>
          </div>
          <div className="absolute bottom-0 right-6 animate-float rounded-2xl bg-accent-400 px-4 py-3 text-dark-950 shadow-xl [animation-delay:-1.5s]">
            <p className="font-vitrine text-lg font-bold leading-none">De 0 à 6 ans</p>
          </div>
        </div>
      </div>

      {bienvenue && (
        <div className="absolute bottom-8 right-5 hidden w-80 rounded-2xl border border-white/15 bg-dark-950/60 p-3.5 backdrop-blur-xl md:block xl:hidden">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">Écoutez : bienvenue en éwé</p>
          <LecteurAudio src={bienvenue.src} duree={bienvenue.duree} variante="sombre" />
        </div>
      )}
    </section>
  );
}

/* --------------------------------------------------------------- chiffres */

function Chiffres() {
  const s = [
    { v: 6, suf: " ans", l: "de suivi continu, de la naissance à l'école" },
    { v: 9, suf: "", l: "rendez-vous de vaccin calculés à l'inscription" },
    { v: 16, suf: "", l: "messages vocaux enregistrés en éwé" },
    { v: 4, suf: "", l: "espaces : famille, agent, garderie, pilotage" },
  ];
  return (
    <section aria-label="Chiffres clés" className="relative z-10 -mt-14 pb-6">
      <div className="container-site">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-[#e4e7e5] shadow-2xl shadow-dark-900/10 ring-1 ring-[#e4e7e5] lg:grid-cols-4 dark:bg-dark-700 dark:ring-dark-700">
          {s.map((x, k) => (
            <Apparition key={x.l} delai={k * 0.08} y={16} className="group flex flex-col-reverse items-center bg-white px-4 py-8 text-center transition-colors duration-300 hover:bg-primary-50 sm:py-10 dark:bg-dark-900 dark:hover:bg-dark-800">
              <dt className="mt-2 text-sm font-medium text-dark-600 dark:text-white/70">{x.l}</dt>
              <dd className="font-vitrine text-4xl font-bold text-primary-600 transition-transform duration-300 group-hover:scale-110 sm:text-5xl dark:text-primary-300">
                <Compteur valeur={x.v} suffixe={x.suf} />
              </dd>
            </Apparition>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- constat */

function Constat() {
  const ruptures = [
    "Après le 42e jour, plus personne ne relance la famille pour les vaccins.",
    "Les mères des marchés n'ont ni temps ni solution de garde.",
    "Les retards de développement sont repérés trop tard, à l'école.",
    "Le message écrit en français n'atteint pas les mères qui lisent peu.",
  ];
  const chiffres = [
    { v: "23,8 %", l: "retard de croissance chez les moins de 5 ans", s: "UNICEF Togo, MICS 2017" },
    { v: "76 %", l: "naissances enregistrées en milieu rural, contre 94 % en ville", s: "UNICEF Togo" },
    { v: "37 %", l: "de la population connectée à Internet, pour plus de 100 % de cartes SIM", s: "ARCEP, ISOC Togo, 2025" },
  ];
  return (
    <section id="probleme" className="scroll-mt-20 py-24 lg:py-32">
      <div className="container-site grid items-center gap-14 lg:grid-cols-2">
        <Apparition className="relative">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-2xl shadow-dark-900/15 sm:aspect-[5/4] lg:aspect-[4/5]">
            <Image src="/images/portrait-bebe.jpg" alt="Un bébé dans les bras de sa mère" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-950/60 to-transparent" />
          </div>
          <div className="absolute -bottom-6 -right-2 rounded-2xl bg-white p-5 shadow-2xl shadow-dark-900/15 sm:-right-6 dark:bg-dark-800">
            <p className="font-vitrine text-4xl font-bold text-primary-600 dark:text-primary-300">42e jour</p>
            <p className="mt-1 max-w-[12rem] text-sm text-dark-600 dark:text-white/70">Fin du suivi Wezou. Les vaccins continuent jusqu&apos;à 15 mois.</p>
          </div>
        </Apparition>
        <div>
          <TitreSection
            centre={false}
            etiquette="Le constat"
            titre="Le suivi s'arrête au moment où les abandons commencent"
            description="Au Togo, l'enfant croise plusieurs services qui ne se parlent pas : centre de santé, pesée, état civil, garderie. ɖevi ƒe agbalẽ les relie autour d'un seul dossier."
          />
          <ul className="-mt-4 space-y-3">
            {ruptures.map((r, k) => (
              <Apparition key={r} delai={k * 0.06} y={12}>
                <li className="flex gap-3 text-dark-700 dark:text-white/80">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary-600 dark:text-primary-300" />
                  {r}
                </li>
              </Apparition>
            ))}
          </ul>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {chiffres.map((c, k) => (
              <Apparition key={c.v} delai={0.1 + k * 0.06} className="rounded-2xl border border-[#e4e7e5] bg-white p-4 dark:border-dark-700 dark:bg-dark-900">
                <p className="font-vitrine text-3xl font-bold text-dark-800 dark:text-white">{c.v}</p>
                <p className="mt-1 text-sm text-dark-600 dark:text-white/70">{c.l}</p>
                <p className="mt-2 text-xs text-dark-600/70 dark:text-white/45">{c.s}</p>
              </Apparition>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- parcours */

const ETAPES: { icone: LucideIcon; titre: string; qui: string; texte: string }[] = [
  { icone: UserPlus, titre: "Inscription", qui: "Agent de santé", texte: "Prénom, date de naissance, téléphone de la mère, langue et centre. La carte QR et le calendrier sont créés en moins d'une minute." },
  { icone: MessageCircle, titre: "Bienvenue en éwé", qui: "Famille", texte: "La mère reçoit un message vocal WhatsApp dans sa langue, avec la carte de l'enfant. Pas besoin de savoir lire." },
  { icone: Bell, titre: "Rappels et relance", qui: "Moteur de règles", texte: "Deux jours avant, la veille, le jour même. En cas d'absence : touche 1 si tu viens, 2 si tu as un empêchement." },
  { icone: ScanLine, titre: "Scan au centre", qui: "Agent de santé", texte: "Le vaccin prévu est déjà coché. La pesée trace la courbe OMS et signale une stagnation." },
  { icone: BarChart3, titre: "Pilotage", qui: "District, UNICEF", texte: "Couverture par quartier, abandons entre deux doses, actes de naissance manquants, en données anonymes." },
];

function Parcours() {
  return (
    <section id="parcours" className="relative scroll-mt-20 overflow-hidden bg-[#f6f8f7] py-24 lg:py-32 dark:bg-dark-950">
      <div aria-hidden className="absolute -right-40 top-20 size-96 animate-blob rounded-full bg-primary-200/40 blur-3xl dark:bg-primary-900/30" />
      <div className="container-site relative">
        <TitreSection etiquette="Le parcours" titre="De la naissance au tableau de bord" description="Cinq moments, un seul dossier. C'est exactement ce que montre la démonstration, en trois minutes." />
        <ol className="relative grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <span aria-hidden className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-primary-300 to-transparent lg:block" />
          {ETAPES.map((e, k) => (
            <Apparition key={e.titre} delai={k * 0.1}>
              <li className="group relative h-full rounded-3xl border border-[#e4e7e5] bg-white p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary-600/10 dark:border-dark-700 dark:bg-dark-800">
                <div className="flex items-center justify-between">
                  <span className="relative grid size-14 place-items-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-600/30 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                    <e.icone className="size-6" />
                  </span>
                  <span className="font-vitrine text-4xl font-bold text-dark-800/10 dark:text-white/10">{String(k + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-5 font-vitrine text-xl font-bold text-dark-800 dark:text-white">{e.titre}</h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-300">{e.qui}</p>
                <p className="mt-3 text-sm leading-relaxed text-dark-600 dark:text-white/70">{e.texte}</p>
              </li>
            </Apparition>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- espaces */

const ESPACES = [
  { icone: Smartphone, titre: "La famille", texte: "Rappels et conseils en vocal sur WhatsApp, dans sa langue. Bientôt aussi par appel, pour les téléphones simples.", image: "/images/telephone-simple.jpg", alt: "Des mains tiennent un téléphone portable simple" },
  { icone: HeartPulse, titre: "L'agent de santé", texte: "La liste des enfants à voir, classée par urgence. Un scan, un geste, et le carnet est à jour.", image: "/images/carte-vaccination.jpg", alt: "Un enfant sourit, sa carte de vaccination posée sur la tête" },
  { icone: Store, titre: "La garderie du marché", texte: "L'éducatrice note les arrivées, mesure les enfants chaque mois et fait les petits questionnaires de développement.", image: "/images/marche-lome.jpg", alt: "Un marché de Lomé et ses parasols" },
  { icone: BarChart3, titre: "Le pilotage", texte: "UNICEF, ministère et districts voient la couverture par quartier et envoient des annonces vocales ciblées.", image: "/images/mere-telephone.jpg", alt: "Une mère consulte son téléphone, entourée d'enfants" },
];

function Espaces() {
  return (
    <section id="espaces" className="scroll-mt-20 py-24 lg:py-32">
      <div className="container-site">
        <TitreSection etiquette="Pour qui" titre="Quatre espaces, un seul carnet" description="Chacun voit ce dont il a besoin, rien de plus. L'éducatrice ne voit pas le dossier médical, le district ne voit aucun nom." />
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {ESPACES.map((e, k) => (
            <Apparition key={e.titre} delai={k * 0.1} className="h-full">
              <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#e4e7e5] bg-white shadow-sm transition-shadow duration-500 hover:shadow-2xl hover:shadow-primary-600/15 dark:border-dark-700 dark:bg-dark-800">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image src={e.image} alt={e.alt} fill sizes="(max-width: 640px) 100vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-primary-950/80 via-primary-950/20 to-transparent" />
                  <span className="absolute right-5 top-4 font-vitrine text-4xl font-bold text-white/40">{String(k + 1).padStart(2, "0")}</span>
                  <span className="absolute bottom-4 left-6 grid size-14 place-items-center rounded-2xl bg-primary-600 text-white shadow-lg ring-2 ring-white/25 transition-all duration-500 group-hover:-translate-y-1 group-hover:rotate-[-6deg] group-hover:scale-110">
                    <e.icone className="size-7" />
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-7">
                  <h3 className="font-vitrine text-xl font-bold text-dark-800 transition-colors group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-300">{e.titre}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-dark-600 dark:text-white/70">{e.texte}</p>
                </div>
              </article>
            </Apparition>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- voix */

function Voix() {
  const ids = ["bienvenue", "rappel_j2", "manque_3j", "nutrition_1"];
  return (
    <section id="voix" className="relative scroll-mt-20 overflow-hidden bg-dark-950 py-24 lg:py-32">
      <div aria-hidden className="bg-grille absolute inset-0 opacity-50" />
      <div aria-hidden className="absolute -left-40 bottom-0 size-96 animate-blob rounded-full bg-primary-600/20 blur-3xl" />
      <div className="container-site relative grid items-center gap-14 lg:grid-cols-2">
        <div>
          <TitreSection
            claire
            centre={false}
            etiquette="La voix d'abord"
            titre="Beaucoup de mères lisent peu le français. Toutes écoutent."
            description="Les messages sont dits en éwé, avec le prénom de l'enfant et le nom de son centre. Ils sont générés à l'avance et vérifiés à l'oreille par l'équipe. Mina et kabiyè viendront ensuite."
          />
          <div className="-mt-4 grid grid-cols-3 gap-4">
            {[
              { v: "16", l: "messages" },
              { v: "99", l: "fichiers audio" },
              { v: "10", l: "prénoms" },
            ].map((x) => (
              <div key={x.l} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="font-vitrine text-3xl font-bold text-white">{x.v}</p>
                <p className="text-xs text-white/60">{x.l}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {ids.map((id, k) => {
            const m = messageCatalogue(id);
            const a = audioPour(id);
            if (!m || !a) return null;
            return (
              <Apparition key={id} delai={k * 0.08}>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition-colors hover:bg-white/[0.08]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-white">{m.declencheur}</span>
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/70">{m.categorie}</span>
                  </div>
                  <LecteurAudio src={a.src} duree={a.duree} variante="sombre" nbBarres={44} />
                  <p className="mt-2 text-sm italic text-white/55">« {m.texte_fr} »</p>
                </div>
              </Apparition>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- appel final */

function Appel() {
  return (
    <section className="py-24 lg:py-28">
      <div className="container-site">
        <Apparition>
          <div className="relative overflow-hidden rounded-[2rem] bg-primary-700 px-6 py-14 text-center sm:px-12 lg:py-20">
            <div aria-hidden className="bg-grille absolute inset-0" />
            <div aria-hidden className="absolute -right-24 -top-24 size-80 animate-blob rounded-full bg-accent-400/20 blur-3xl" />
            <div className="relative">
              <Etiquette claire>Démonstration</Etiquette>
              <h2 className="mx-auto mt-5 max-w-2xl font-vitrine text-3xl font-bold leading-tight text-white sm:text-5xl">Prenez la place de l&apos;agente de santé</h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-white/80">Des comptes de démonstration sont prêts. Inscrivez un enfant, écoutez le message reçu par sa mère, puis avancez dans le temps.</p>
              <div className="mt-9 flex flex-wrap justify-center gap-4">
                <BoutonRond href="/connexion" variante="blanc">
                  Ouvrir la démo <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-1" />
                </BoutonRond>
                <BoutonRond href="#parcours" variante="contour">
                  Revoir le parcours
                </BoutonRond>
              </div>
            </div>
          </div>
        </Apparition>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- pied */

function Pied() {
  const modules = ["Vaccination et rappels", "Croissance et nutrition", "Dépistage précoce", "Acte de naissance", "Annonces vocales"];
  const acces = ["Espace agent de santé", "Espace garderie", "Tableau de bord de pilotage"];
  return (
    <footer className="bg-dark-950 text-white/70">
      <div className="container-site grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMarque className="size-10" />
            <span className="font-vitrine text-xl font-bold text-white">ɖevi ƒe agbalẽ</span>
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-relaxed">
            Le carnet numérique de l&apos;enfant, de la naissance à 6 ans. Rappels vocaux en langue locale, suivi des vaccins et de la croissance, pilotage par zone.
          </p>
        </div>
        <div>
          <p className="font-vitrine text-lg font-bold text-white">Navigation</p>
          <ul className="mt-5 space-y-2.5 text-sm">
            {NAV.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="transition hover:text-white">
                  {l.libelle}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-vitrine text-lg font-bold text-white">Le carnet</p>
          <ul className="mt-5 space-y-2.5 text-sm">
            {modules.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-vitrine text-lg font-bold text-white">Accès</p>
          <ul className="mt-5 space-y-2.5 text-sm">
            {acces.map((a) => (
              <li key={a}>
                <Link href="/connexion" className="transition hover:text-white">
                  {a}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-site flex flex-col items-center justify-between gap-3 py-6 text-xs text-white/50 sm:flex-row">
          <span>© 2026 ɖevi ƒe agbalẽ · Lomé, Togo</span>
          <span className="flex items-center gap-5">
            <span>Données de démonstration</span>
            <Link href="/credits" className="transition hover:text-white">
              Crédits photos
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

export function Accueil() {
  return (
    <div className="bg-white font-texte text-dark-800 dark:bg-dark-900 dark:text-white">
      <Entete />
      <main>
        <Hero />
        <Chiffres />
        <Constat />
        <Parcours />
        <Espaces />
        <Voix />
        <Appel />
      </main>
      <Pied />
    </div>
  );
}
