import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le tableau de bord ne lit que des vues agrégées : aucun secret côté client
  // hormis la clé publishable (protégée par RLS et les droits sur les vues).
  reactStrictMode: true,
};

export default nextConfig;
