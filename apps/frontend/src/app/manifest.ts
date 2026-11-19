import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ɖevi ƒe agbalẽ",
    short_name: "ɖevi",
    description: "Le carnet vivant de chaque enfant, de la naissance à 6 ans.",
    start_url: "/connexion",
    display: "standalone",
    background_color: "#fbf6ee",
    theme_color: "#0e5c46",
    lang: "fr",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
