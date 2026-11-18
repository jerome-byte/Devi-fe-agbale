import { redirect } from "next/navigation";

// La racine du site envoie vers le tableau de bord de pilotage.
export default function Home() {
  redirect("/dashboard");
}
