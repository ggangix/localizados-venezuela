"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { analytics } from "@/lib/analytics";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const SEARCH_DEBOUNCE_MS = 450;

export function SearchForm({
  initialQ = "",
  source = "buscar",
}: {
  initialQ?: string;
  source?: "home" | "buscar";
}) {
  const router = useRouter();
  const params = useSearchParams();
  const paramsString = params.toString();
  const [q, setQ] = useState(initialQ);
  const debouncedQ = useDebouncedValue(q, SEARCH_DEBOUNCE_MS);
  const lastTrackedQuery = useRef(initialQ.trim());

  const buildSearchHref = useCallback(
    (query: string) => {
      const next = new URLSearchParams(paramsString);
      if (query) next.set("q", query);
      else next.delete("q");
      next.delete("page");
      const queryString = next.toString();
      return queryString ? `/buscar?${queryString}` : "/buscar";
    },
    [paramsString]
  );

  const trackSearch = useCallback(
    (query: string) => {
      if (!query || lastTrackedQuery.current === query) return;
      lastTrackedQuery.current = query;
      analytics.search(query.length, source);
    },
    [source]
  );

  useEffect(() => {
    const trimmed = debouncedQ.trim();
    const current = new URLSearchParams(paramsString).get("q") ?? "";

    if (trimmed === current) return;
    if (!trimmed && source === "home") return;
    if (!trimmed && source === "buscar" && !current) return;

    trackSearch(trimmed);
    router.replace(buildSearchHref(trimmed));
  }, [buildSearchHref, debouncedQ, paramsString, router, source, trackSearch]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    trackSearch(trimmed);
    router.push(buildSearchHref(trimmed));
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      aria-label="Buscar personas localizadas"
      className="rounded-2xl border border-brand-100 bg-white p-2 shadow-soft"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="buscar-localizado">
          Nombre, cédula u observación
        </label>
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-600"
            aria-hidden="true"
          />
          <input
            id="buscar-localizado"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre, cédula u observación"
            className="min-h-14 w-full rounded-xl border border-transparent bg-brand-50/70 py-4 pl-12 pr-4 text-[17px] font-medium text-brand-950 placeholder:text-brand-700/65 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-200"
            aria-label="Buscar localizado"
            enterKeyHint="search"
            autoComplete="off"
            inputMode="search"
          />
        </div>
        <button
          type="submit"
          className="min-h-14 cursor-pointer rounded-xl bg-action-600 px-7 py-4 text-base font-bold text-white shadow-sm transition-colors duration-200 hover:bg-action-700 focus:outline-none focus:ring-4 focus:ring-action-100 active:bg-action-700"
        >
          Buscar
        </button>
      </div>
    </form>
  );
}
