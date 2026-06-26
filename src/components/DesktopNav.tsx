"use client";

import Link from "next/link";
import { analytics } from "@/lib/analytics";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/buscar", label: "Buscar" },
  { href: "/lugares", label: "Lugares" },
  { href: "/contribuir", label: "Contribuir" },
  { href: "/api", label: "API" },
];

export function DesktopNav() {
  return (
    <nav className="hidden gap-4 text-sm font-medium text-slate-600 md:flex">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={() => analytics.navigation(link.href, "desktop")}
          className="rounded-lg px-2 py-1 hover:bg-slate-100 hover:text-brand-600"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
