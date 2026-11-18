import { cn } from "@/lib/utils";

export function LogoMarque({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-9", className)} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#0e5c46" />
      <path d="M14 20c6-3 12-3 18 1v27c-6-4-12-4-18-1z" fill="#fbf6ee" />
      <path d="M50 20c-6-3-12-3-18 1v27c6-4 12-4 18-1z" fill="#f3eadb" />
      <circle cx="32" cy="13" r="5" fill="#f4b23e" />
    </svg>
  );
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
