import type { Metadata } from "next";
import { Suspense } from "react";
import { CarteImprimable } from "./carte";

export const metadata: Metadata = { title: "Carte de suivi" };

export default function Page({ params }: PageProps<"/carte/[id]">) {
  return (
    <Suspense fallback={null}>
      {params.then(({ id }) => (
        <CarteImprimable id={decodeURIComponent(id)} />
      ))}
    </Suspense>
  );
}
