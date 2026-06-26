"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { analytics } from "@/lib/analytics";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/buscar", label: "Buscar" },
  { href: "/lugares", label: "Lugares" },
  { href: "/contribuir", label: "Contribuir" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex justify-center gap-2 pb-1 md:hidden"
      aria-label="Navegación principal"
    >
      {links.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => analytics.navigation(link.href, "mobile")}
            className={`min-h-11 shrink-0 cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold outline-none transition-colors duration-200 focus:ring-4 focus:ring-brand-300 ${
              active
                ? "bg-brand-800 text-white shadow-sm"
                : "bg-brand-100 text-brand-800 hover:bg-brand-200"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
