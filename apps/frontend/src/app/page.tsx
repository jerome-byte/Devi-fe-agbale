import type { Metadata } from "next";
import { Accueil } from "./accueil";

export const metadata: Metadata = {
  title: { absolute: "ɖevi ƒe agbalẽ, le carnet vivant de chaque enfant" },
};

export default function Page() {
  return <Accueil />;
}
