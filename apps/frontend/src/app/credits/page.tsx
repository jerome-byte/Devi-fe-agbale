import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Crédits photos" };

const PHOTOS = [
  { f: "mere-bebe.jpg", t: "A woman cuddles her child in northern Ghana", a: "DFID, UK Department for International Development", l: "CC BY-SA 2.0", u: "https://www.flickr.com/photos/14214150@N02/8406177626" },
  { f: "portrait-bebe.jpg", t: "Mother and Child", a: "Julius!", l: "CC BY 2.0", u: "https://www.flickr.com/photo.gne?id=496203321" },
  { f: "carte-vaccination.jpg", t: "Young child after Tetanus vaccination", a: "hdptcar", l: "CC BY 2.0", u: "https://www.flickr.com/photos/8788342@N08/2266882726" },
  { f: "marche-lome.jpg", t: "The market in full swing", a: "Francisco Anzola", l: "CC BY 2.0", u: "https://www.flickr.com/photos/10345599@N03/33632332578" },
  { f: "telephone-simple.jpg", t: "Mobile phone in hand in Africa", a: "ColaLife", l: "CC BY-SA 2.0", u: "https://www.flickr.com/photos/93857097@N02/8549915019" },
  { f: "mere-telephone.jpg", t: "mother with kids", a: "ICT4D.at", l: "CC BY-SA 2.0", u: "https://www.flickr.com/photo.gne?id=3058524421" },
];

export default function Credits() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <Link href="/">
        <Logo />
      </Link>
      <h1 className="mt-10 font-vitrine text-4xl font-bold tracking-tight">Crédits photos</h1>
      <p className="mt-2 text-muted">Photos sous licence Creative Commons, trouvées via Openverse. Merci à leurs auteurs.</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {PHOTOS.map((p) => (
          <li key={p.f} className="flex gap-4 card p-3">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl">
              <Image src={`/images/${p.f}`} alt="" fill sizes="96px" className="object-cover" />
            </div>
            <div className="min-w-0 text-sm">
              <p className="font-semibold">{p.t}</p>
              <p className="text-muted">{p.a}</p>
              <p className="text-muted">{p.l}</p>
              <a href={p.u} className="text-brand-fg underline" target="_blank" rel="noreferrer">
                Source
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
