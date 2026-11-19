import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alertes · ɖevi ƒe agbalẽ",
  description: "Prise en charge des alertes du programme : vaccins, croissance, acte de naissance.",
};

export default function AlertesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
