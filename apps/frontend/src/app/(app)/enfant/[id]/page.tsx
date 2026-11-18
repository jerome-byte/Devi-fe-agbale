import { Suspense } from "react";
import { Carnet } from "@/components/carnet";
import { Squelette } from "@/components/ui";

export default function Page({ params }: PageProps<"/enfant/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Squelette className="h-40" />
          <Squelette className="h-80" />
        </div>
      }
    >
      {params.then(({ id }) => (
        <Carnet id={decodeURIComponent(id)} />
      ))}
    </Suspense>
  );
}
