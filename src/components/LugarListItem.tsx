"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { ShareButtons } from "@/components/ShareButtons";
import { analytics } from "@/lib/analytics";
import { shareLugar } from "@/lib/share";
import type { LugarDTO } from "@/lib/types";

export function LugarListItem({ lugar }: { lugar: LugarDTO }) {
  const share = shareLugar(lugar.slug, lugar.nombre, lugar.totalLocalizados);

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-brand-100 bg-white p-3 shadow-sm sm:p-4">
      <Link
        href={`/lugares/${lugar.slug}`}
        onClick={() => analytics.selectLugar(lugar.slug)}
        className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl outline-none transition-colors hover:text-brand-700 focus:ring-4 focus:ring-brand-200"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-bold text-brand-950">{lugar.nombre}</h2>
            <p className="text-sm capitalize text-brand-700">{lugar.tipo}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-brand-100 px-3 py-1 text-sm font-bold text-brand-800">
          {lugar.totalLocalizados}
        </span>
      </Link>
      <ShareButtons
        variant="compact"
        url={share.url}
        title={share.title}
        text={share.text}
        label={`Compartir ${lugar.nombre}`}
        contentType="lugar"
      />
    </div>
  );
}
