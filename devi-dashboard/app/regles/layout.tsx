import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Règles · ɖevi ƒe agbalẽ",
  description: "Règles du moteur : rappels vaccinaux, croissance, vitamine A et calendrier PEV.",
};

export default function ReglesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
