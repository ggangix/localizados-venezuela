"use client";

import Link from "next/link";
import { ShareButtons } from "@/components/ShareButtons";
import { analytics } from "@/lib/analytics";
import { shareLugar } from "@/lib/share";
import type { LugarDTO } from "@/lib/types";

export function LugarListItem({
  lugar,
  showShare = true,
}: {
  lugar: LugarDTO;
  showShare?: boolean;
}) {
  const share = shareLugar(lugar.slug, lugar.nombre, lugar.totalLocalizados);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex sm:items-center sm:gap-2 sm:p-4">
      <Link
        href={`/lugares/${lugar.slug}`}
        onClick={() => analytics.selectLugar(lugar.slug)}
        className="flex min-w-0 flex-1 flex-col gap-2 active:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
      >
        <div className="min-w-0">
          <h2 className="font-semibold leading-snug text-slate-900">{lugar.nombre}</h2>
          <p className="text-sm capitalize text-slate-500">{lugar.tipo}</p>
        </div>
        <span className="w-fit shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 sm:px-3 sm:py-1 sm:text-sm">
          {lugar.totalLocalizados}
        </span>
      </Link>
      {showShare && (
        <div className="mt-2 flex justify-end sm:mt-0">
          <ShareButtons
            variant="compact"
            url={share.url}
            title={share.title}
            text={share.text}
            label={`Compartir ${lugar.nombre}`}
            contentType="lugar"
          />
        </div>
      )}
    </div>
  );
}
