"use client";

import Link from "next/link";
import { Database, GitBranch, Hospital, UserPlus } from "lucide-react";
import { analytics } from "@/lib/analytics";

const cards = [
  {
    title: "Ver lugares",
    description: "Hospitales, recintos y direcciones con listados consolidados.",
    href: "/lugares",
    cta: "ver_lugares",
    external: false,
    icon: Hospital,
  },
  {
    title: "Contribuir datos",
    description: "Sube un localizado o una foto de un listado con su fuente.",
    href: "/contribuir",
    cta: "contribuir",
    external: false,
    icon: UserPlus,
  },
  {
    title: "API pública",
    description: "Integra los datos en otras herramientas y sitios.",
    href: "/api",
    cta: "api",
    external: false,
    icon: Database,
  },
  {
    title: "Código abierto",
    description: "Colabora en GitHub — issues y PRs bienvenidos.",
    href: "https://github.com/ggangix/localizados-venezuela",
    cta: "github",
    external: true,
    icon: GitBranch,
  },
] as const;

export function HomeActionCards() {
  return (
    <section
      className="grid grid-cols-2 gap-3 sm:grid-cols-2"
      aria-label="Acciones secundarias"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        const className =
          "group flex flex-col items-center gap-2 rounded-2xl border border-brand-100 bg-white px-3 py-4 text-center shadow-sm outline-none transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50 focus:ring-4 focus:ring-brand-200 sm:flex-row sm:items-start sm:gap-3 sm:px-5 sm:py-5 sm:text-left";
        const content = (
          <>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 transition-colors group-hover:bg-brand-200">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-bold text-brand-900 sm:text-base">
                {card.title}
              </span>
              <span className="mt-0.5 hidden text-sm leading-6 text-brand-700 sm:mt-1 sm:block">
                {card.description}
              </span>
            </span>
          </>
        );

        if (card.external) {
          return (
            <a
              key={card.cta}
              href={card.href}
              target="_blank"
              rel="noreferrer"
              className={className}
              onClick={() => analytics.ctaClick(card.cta, "home")}
            >
              {content}
            </a>
          );
        }

        return (
          <Link
            key={card.cta}
            href={card.href}
            className={className}
            onClick={() => analytics.ctaClick(card.cta, "home")}
          >
            {content}
          </Link>
        );
      })}
    </section>
  );
}
