"use client";

import Link from "next/link";
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
    <article className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <Link
        href={`/localizados/${item.slug}`}
        onClick={() => analytics.selectLocalizado(item.slug, source)}
        className="min-w-0 flex-1 space-y-1 active:opacity-80"
      >
        <h3 className="text-base font-semibold leading-snug text-slate-900 sm:text-lg">
          {item.nombreCompleto}
        </h3>
        <p className="text-sm text-slate-600">
          En <span className="font-medium text-brand-700">{item.lugarNombre}</span>
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          {item.cedula && <span>Cédula: {item.cedula}</span>}
          {item.edad && <span>Edad: {item.edad}</span>}
          {item.condicion !== "desconocido" && (
            <span className="capitalize">{item.condicion}</span>
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
