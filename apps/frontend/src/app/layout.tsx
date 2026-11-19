import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Inter, League_Spartan } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

const spartan = League_Spartan({
  variable: "--font-spartan",
  subsets: ["latin", "latin-ext"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "ɖevi ƒe agbalẽ, le carnet vivant de chaque enfant",
    template: "%s · ɖevi ƒe agbalẽ",
  },
  description:
    "Carnet numérique de l'enfant de 0 à 6 ans au Togo : rappels vocaux en éwé, suivi des vaccins et de la croissance, tableau de bord pour les districts.",
  applicationName: "ɖevi ƒe agbalẽ",
};

export const viewport: Viewport = {
  themeColor: "#00aeef",
};

// applique le thème avant l'affichage pour éviter un flash clair en mode sombre
const scriptTheme = `try{var p=JSON.parse(localStorage.getItem('devi-prefs')||'{}').state||{};var t=p.theme||'light';if(t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${plex.variable} ${spartan.variable} ${inter.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTheme }} />
      </head>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
