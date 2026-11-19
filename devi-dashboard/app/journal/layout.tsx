import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Journal des messages · ɖevi ƒe agbalẽ",
  description:
    "Journal des messages vocaux en éwé du parcours de démonstration : écoute sans téléphone.",
};

export default function JournalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
