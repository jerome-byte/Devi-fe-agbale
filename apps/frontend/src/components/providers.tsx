"use client";

import { MotionConfig } from "motion/react";
import { useEffect } from "react";
import { appliquerTheme, usePrefs } from "@/lib/prefs";
import { useStore } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = usePrefs((s) => s.theme);

  useEffect(() => {
    useStore.persist.rehydrate();
    usePrefs.persist.rehydrate();
  }, []);

  useEffect(() => {
    // tant que les préférences ne sont pas relues, on garde le thème posé par le script de <head>
    if (!usePrefs.persist.hasHydrated()) return;
    const actuel = usePrefs.getState().theme;
    appliquerTheme(actuel);
    if (actuel !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const maj = () => appliquerTheme("system");
    mq.addEventListener("change", maj);
    return () => mq.removeEventListener("change", maj);
  }, [theme]);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
