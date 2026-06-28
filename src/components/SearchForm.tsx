"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Combobox } from "@/components/Combobox";
import { analytics } from "@/lib/analytics";
import type { LugarDTO } from "@/lib/types";

function buildUrl(params: URLSearchParams, q: string, lugar: string) {
  const next = new URLSearchParams(params.toString());
  const trimmed = q.trim();
  if (trimmed) next.set("q", trimmed);
  else next.delete("q");
  if (lugar) next.set("lugar", lugar);
  else next.delete("lugar");
  next.delete("page");
  return `/buscar?${next.toString()}`;
}

export function SearchForm({
  initialQ = "",
  initialLugar = "",
  lugares = [],
  source = "buscar",
}: {
  initialQ?: string;
  initialLugar?: string;
  lugares?: LugarDTO[];
  source?: "home" | "buscar";
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [lugar, setLugar] = useState(initialLugar);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed) analytics.search(trimmed.length, source);
    router.push(buildUrl(params, q, lugar));
  }

  function onLugarChange(slug: string) {
    setLugar(slug);
    router.push(buildUrl(params, q, slug));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {lugares.length > 0 && (
        <Combobox
          options={lugares.map((l) => ({
            value: l.slug,
            label: l.nombre,
            hint: `${l.totalLocalizados}`,
          }))}
          value={lugar}
          onChange={onLugarChange}
          placeholder="Todos los lugares"
          ariaLabel="Filtrar por lugar"
        />
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nombre, cedula u observacion..."
          className="min-h-12 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          aria-label="Buscar localizado"
          enterKeyHint="search"
          autoComplete="off"
        />
        <button
          type="submit"
          className="min-h-12 rounded-xl bg-brand-600 px-6 py-3 text-base font-semibold text-white hover:bg-brand-700 active:scale-[0.98]"
        >
          Buscar
        </button>
      </div>
    </form>
  );
}
