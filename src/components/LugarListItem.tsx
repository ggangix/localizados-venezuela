"use client";

import Link from "next/link";
import { ShareButtons } from "@/components/ShareButtons";
import { analytics } from "@/lib/analytics";
import { shareLugar } from "@/lib/share";
import type { LugarDTO } from "@/lib/types";

export function LugarListItem({ lugar }: { lugar: LugarDTO }) {
  const share = shareLugar(lugar.slug, lugar.nombre, lugar.totalLocalizados);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <Link
        href={`/lugares/${lugar.slug}`}
        onClick={() => analytics.selectLugar(lugar.slug)}
        className="flex min-w-0 flex-1 items-center justify-between gap-3 active:bg-slate-50"
      >
        <div className="min-w-0 max-w-[150px] md:max-w-full">
          <h2 className="truncate font-semibold text-slate-900">{lugar.nombre}</h2>
          <p className="text-sm capitalize text-slate-500">{lugar.tipo}</p>
        </div>
        <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
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
