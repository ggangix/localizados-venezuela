import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://localizadosvenezuela.com";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0284c7",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Localizados Venezuela — Registro colaborativo post-sismo",
    template: "%s | Localizados Venezuela",
  },
  description:
    "Registro abierto y colaborativo de personas localizadas tras el sismo en Venezuela. Solo localizados — no para reportar desaparecidos.",
  openGraph: {
    type: "website",
    locale: "es_VE",
    siteName: "Localizados Venezuela",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <GoogleAnalytics />
        <DisclaimerBanner />
        <SiteHeader />
        <main className="mx-auto min-h-[70vh] max-w-5xl px-3 py-5 pb-24 sm:px-4 sm:py-8 sm:pb-8">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
