"use client";

import Link from "next/link";
import { analytics } from "@/lib/analytics";

export function LugarLink({
  slug,
  children,
  className,
}: {
  slug: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={`/lugares/${slug}`}
      onClick={() => analytics.selectLugar(slug)}
      className={className}
    >
      {children}
    </Link>
  );
}
