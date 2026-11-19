import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { Squelette } from "@/components/ui";

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl space-y-4 p-6">
          <Squelette className="h-10 w-48" />
          <Squelette className="h-32" />
          <Squelette className="h-64" />
        </div>
      }
    >
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
