import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ɖevi ƒe agbalẽ",
    short_name: "ɖevi",
    description: "Le carnet vivant de chaque enfant, de la naissance à 6 ans.",
    start_url: "/connexion",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#102b49",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
