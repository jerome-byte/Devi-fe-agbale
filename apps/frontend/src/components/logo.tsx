import Image from "next/image";
import { cn } from "@/lib/utils";

/** Logo de ɖevi ƒe agbalẽ (carré bleu marine, coins arrondis). */
export function LogoMarque({ className }: { className?: string }) {
  return <Image src="/images/logo-marque-v2.png" unoptimized alt="" width={128} height={128} className={cn("size-9 shrink-0", className)} aria-hidden priority />;
}

export function Logo({ className, clair }: { className?: string; clair?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMarque />
      <span className="leading-none">
        <span className={cn("block font-vitrine text-[20px] font-bold tracking-tight", clair ? "text-white" : "text-fg")}>
          ɖevi ƒe agbalẽ
        </span>
        <span className={cn("mt-0.5 block text-[11px] font-medium", clair ? "text-white/70" : "text-muted")}>
          le carnet vivant de l&apos;enfant
        </span>
      </span>
    </span>
  );
}
