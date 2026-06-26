"use client";

import { DesaparecidosLink } from "@/components/DesaparecidosLink";
import { analytics } from "@/lib/analytics";
import { Heart } from "lucide-react";
import { FaLinkedin } from "react-icons/fa6";
import {
  SiBuymeacoffee,
  SiGithub,
  SiInstagram,
  SiX,
  SiYoutube,
} from "react-icons/si";

const GITHUB_REPO = "https://github.com/ggangix/localizados-venezuela";

const socialLinks = [
  {
    name: "YouTube",
    href: "https://www.youtube.com/@ggangix",
    icon: SiYoutube,
  },
  {
    name: "X (Twitter)",
    href: "https://twitter.com/ggangix",
    icon: SiX,
  },
  {
    name: "Instagram",
    href: "https://instagram.com/giuseppe.gangi",
    icon: SiInstagram,
  },
  {
    name: "LinkedIn",
    href: "https://linkedin.com/in/giuseppe.gangi",
    icon: FaLinkedin,
  },
  {
    name: "GitHub",
    href: "https://github.com/ggangix",
    icon: SiGithub,
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 text-center">
          <p className="flex items-center justify-center gap-1 text-sm text-slate-500">
            Creado por <Heart className="h-4 w-4 text-red-500" aria-hidden />
            <a
              href="https://ggangi.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => analytics.outboundClick("https://ggangi.com", "ggangi")}
              className="font-medium text-slate-900 hover:underline"
            >
              Giuseppe Gangi
            </a>
          </p>
        </div>

        <div className="mb-6 flex justify-center gap-4">
          {socialLinks.map(({ name, href, icon: Icon }) => (
            <a
              key={name}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => analytics.outboundClick(href, `social_${name}`)}
              className="text-slate-500 transition-colors hover:text-brand-600"
              aria-label={name}
            >
              <Icon className="h-5 w-5" />
            </a>
          ))}
        </div>

        <div className="mb-6 flex justify-center">
          <a
            href="https://buymeacoffee.com/giuseppe.gangi"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              analytics.outboundClick(
                "https://buymeacoffee.com/giuseppe.gangi",
                "buy_me_a_coffee"
              )
            }
            className="inline-flex items-center gap-2 rounded-full bg-[#FFDD00] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#FFDD00]/90"
          >
            <SiBuymeacoffee className="h-4 w-4" />
            Invítame un café
          </a>
        </div>

        <div className="text-center">
          <p className="text-xs text-slate-500">
            Proyecto de código abierto •{" "}
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => analytics.outboundClick(GITHUB_REPO, "github_repo")}
              className="hover:underline"
            >
              Ver en GitHub
            </a>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Código: MIT • Datos: fuentes públicas y contribuciones ciudadanas
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Solo registra personas ya localizadas — no es para reportar desaparecidos.
            Para reportar desaparecidos:{" "}
            <DesaparecidosLink className="text-slate-500 underline hover:text-brand-600" />
            . Proyecto independiente, no afiliado a ninguna entidad gubernamental.
          </p>
        </div>
      </div>
    </footer>
  );
}
