"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { ShareButtons } from "@/components/ShareButtons";
import { analytics } from "@/lib/analytics";
import { shareLocalizado } from "@/lib/share";
import type { LocalizadoDTO } from "@/lib/types";

export function LocalizadoCard({
  item,
  source = "search",
}: {
  item: LocalizadoDTO;
  source?: "search" | "lugar" | "home";
}) {
  const share = shareLocalizado(item.slug, item.nombreCompleto, item.lugarNombre);

  return (
    <article className="flex items-start gap-2 rounded-2xl border border-brand-100 bg-white p-3 shadow-sm transition-colors duration-200 hover:border-brand-200 sm:p-4">
      <Link
        href={`/localizados/${item.slug}`}
        onClick={() => analytics.selectLocalizado(item.slug, source)}
        className="min-w-0 flex-1 space-y-2 rounded-xl outline-none transition-opacity hover:opacity-90 focus:ring-4 focus:ring-brand-200"
      >
        <h3 className="text-base font-bold leading-snug text-brand-950 sm:text-lg">
          {item.nombreCompleto}
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-brand-800">
          <MapPin className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          <span>En </span>
          <span className="font-semibold text-brand-800">{item.lugarNombre}</span>
        </p>
        <div className="flex flex-wrap gap-2 text-xs font-medium text-brand-800/75">
          {item.cedula && (
            <span className="rounded-full bg-brand-50 px-2.5 py-1">
              Cédula: {item.cedula}
            </span>
          )}
          {item.edad && (
            <span className="rounded-full bg-brand-50 px-2.5 py-1">
              Edad: {item.edad}
            </span>
          )}
          {item.condicion !== "desconocido" && (
            <span className="rounded-full bg-action-50 px-2.5 py-1 capitalize text-action-700">
              {item.condicion}
            </span>
          )}
        </div>
      </Link>
      <ShareButtons
        variant="compact"
        url={share.url}
        title={share.title}
        text={share.text}
        label={`Compartir ${item.nombreCompleto}`}
        contentType="localizado"
      />
    </article>
  );
}
