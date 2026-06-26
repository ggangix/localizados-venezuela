"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { analytics } from "@/lib/analytics";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/buscar", label: "Buscar" },
  { href: "/lugares", label: "Lugares" },
  { href: "/contribuir", label: "Contribuir" },
  { href: "/api", label: "API" },
];

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav
      className="hidden gap-1 text-sm font-semibold text-brand-800 md:flex"
      aria-label="Navegación principal"
    >
      {links.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => analytics.navigation(link.href, "desktop")}
            className={`cursor-pointer rounded-full px-3 py-2 outline-none transition-colors duration-200 focus:ring-4 focus:ring-brand-200 ${
              active
                ? "bg-brand-100 text-brand-900"
                : "hover:bg-brand-50 hover:text-brand-900"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
