import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Translator } from "@/components/i18n/translator";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Healt Monitoring", template: "%s · Healt Monitoring" },
  description: "Monitorización de salud de tripulaciones en el espacio.",
};

const LANG_BOOT = `(function(){var l="en";try{var v=localStorage.getItem("hm-lang");if(v==="es"||v==="en")l=v}catch(e){}var d=document.documentElement;d.lang=l;if(l==="en"){d.classList.add("i18n-wait");setTimeout(function(){d.classList.remove("i18n-wait")},2500)}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Antes de pintar: fija el idioma (inglés por defecto) y oculta un instante la página mientras se traduce. */}
        <script dangerouslySetInnerHTML={{ __html: LANG_BOOT }} />
      </head>
      <body className="min-h-full font-sans">
        {children}
        <Translator />
      </body>
    </html>
  );
}
