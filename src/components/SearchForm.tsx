"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { analytics } from "@/lib/analytics";

export function SearchForm({
  initialQ = "",
  source = "buscar",
}: {
  initialQ?: string;
  source?: "home" | "buscar";
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(initialQ);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed) analytics.search(trimmed.length, source);
    const next = new URLSearchParams(params.toString());
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    next.delete("page");
    router.push(`/buscar?${next.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Nombre, cédula u observación..."
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
    </form>
  );
}
