"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

type Prefs = {
  theme: Theme;
  menuReplie: boolean;
  setTheme: (t: Theme) => void;
  basculerMenu: () => void;
};

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      theme: "light",
      menuReplie: false,
      setTheme: (theme) => set({ theme }),
      basculerMenu: () => set((s) => ({ menuReplie: !s.menuReplie })),
    }),
    { name: "devi-prefs", storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);

/** Applique la classe .dark sur <html> selon la préférence. */
export function appliquerTheme(theme: Theme) {
  const sombre = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", sombre);
}

/** Couleurs des graphiques, lisibles dans les deux thèmes. */
export function couleursGraphe(sombre: boolean) {
  return sombre
    ? { primaire: "#1fb8f1", primaireDouce: "#0c2a3a", grille: "#2c2f2d", axe: "#9b9d99", texte: "#ececea", cible: "#cbcbc7", danger: "#f07a7a", warn: "#e8a64a", dangerDoux: "#3a2020", warnDoux: "#3a2c18", normalDoux: "#173527", carte: "#1b1b1b" }
    : { primaire: "#0b8fd3", primaireDouce: "#c8eefd", grille: "#e3e3e0", axe: "#696a6e", texte: "#141414", cible: "#3b3c3f", danger: "#b4232a", warn: "#a35a00", dangerDoux: "#fbe2d5", warnDoux: "#feedc4", normalDoux: "#e3f6e9", carte: "#ffffff" };
}

/** Vrai quand la classe .dark est posée sur <html> (suit le thème en direct). */
export function useSombre() {
  const [sombre, setSombre] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const maj = () => setSombre(el.classList.contains("dark"));
    maj();
    const obs = new MutationObserver(maj);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return sombre;
}
