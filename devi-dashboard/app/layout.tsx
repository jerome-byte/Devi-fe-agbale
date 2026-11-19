import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import "./globals.css";

// Atkinson Hyperlegible est conçue pour la lisibilité (malvoyance, dyslexie) :
// cohérent avec un outil de santé publique.
const atkinson = Atkinson_Hyperlegible({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ɖevi ƒe agbalẽ · Pilotage",
  description:
    "Tableau de bord de pilotage : suivi des enfants de 0 à 6 ans par zone, données agrégées et anonymisées.",
};

export const viewport: Viewport = {
  themeColor: "#0b2b4a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${atkinson.className} antialiased`}>{children}</body>
    </html>
  );
}
