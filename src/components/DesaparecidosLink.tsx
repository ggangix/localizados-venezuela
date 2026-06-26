"use client";

import { DESAPARECIDOS_URL } from "@/lib/constants";
import { analytics } from "@/lib/analytics";

export function DesaparecidosLink({ className }: { className?: string }) {
  return (
    <a
      href={DESAPARECIDOS_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => analytics.outboundClick(DESAPARECIDOS_URL, "desaparecidos")}
      className={className ?? "font-semibold underline hover:opacity-90"}
    >
      desaparecidosterremotovenezuela.com
    </a>
  );
}
