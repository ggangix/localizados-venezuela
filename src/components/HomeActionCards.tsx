"use client";

import Link from "next/link";
import { analytics } from "@/lib/analytics";

const cards = [
  {
    title: "Ver lugares",
    description: "Hospitales, recintos y direcciones con listados consolidados.",
    href: "/lugares",
    cta: "ver_lugares",
    external: false,
  },
  {
    title: "Contribuir datos",
    description: "Sube un localizado o una foto de un listado con su fuente.",
    href: "/contribuir",
    cta: "contribuir",
    external: false,
  },
  {
    title: "API pública",
    description: "Integra los datos en otras herramientas y sitios.",
    href: "/api",
    cta: "api",
    external: false,
  },
  {
    title: "Código abierto",
    description: "Colabora en GitHub — issues y PRs bienvenidos.",
    href: "https://github.com/ggangix/localizados-venezuela",
    cta: "github",
    external: true,
  },
] as const;

export function HomeActionCards() {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      {cards.map((card) => {
        const className =
          "block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md";

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
              <h3 className="font-semibold text-slate-900">{card.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{card.description}</p>
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
            <h3 className="font-semibold text-slate-900">{card.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{card.description}</p>
          </Link>
        );
      })}
    </section>
  );
}
