"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { analytics } from "@/lib/analytics";
import { useDebounce } from "@/lib/hooks/useDebounce";
import type { LocalizadoDTO } from "@/lib/types";

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
  const [suggestions, setSuggestions] = useState<LocalizadoDTO[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const debouncedQ = useDebounce(q.trim(), 250);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);

  useEffect(() => {
    if (debouncedQ.length < 2) {
      setSuggestions([]);
      setIsSuggestionsOpen(false);
      return;
    }

    const controller = new AbortController();

    const loadSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        const response = await fetch(
          `/api/v1/localizados/sugerencias?q=${encodeURIComponent(debouncedQ)}&limit=5`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("No se pudieron cargar las sugerencias");
        }

        const payload = await response.json();
        const nextSuggestions = Array.isArray(payload?.data) ? payload.data : [];
        setSuggestions(nextSuggestions);
        setIsSuggestionsOpen(nextSuggestions.length > 0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSuggestions([]);
          setIsSuggestionsOpen(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingSuggestions(false);
        }
      }
    };

    loadSuggestions();

    return () => controller.abort();
  }, [debouncedQ]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsSuggestionsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed) analytics.search(trimmed.length, source);
    const next = new URLSearchParams(params.toString());
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    next.delete("page");
    setIsSuggestionsOpen(false);
    router.push(`/buscar?${next.toString()}`);
  }

  function onSuggestionSelect(item: LocalizadoDTO) {
    setQ(item.nombreCompleto);
    setSuggestions([]);
    setIsSuggestionsOpen(false);
    router.push(`/localizados/${item.slug}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
      <div ref={containerRef} className="relative flex-1">
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => {
            const nextValue = e.target.value;
            setQ(nextValue);
            if (nextValue.trim().length < 2) {
              setSuggestions([]);
              setIsSuggestionsOpen(false);
            }
          }}
          onFocus={() => {
            if (q.trim().length >= 2 && suggestions.length > 0) {
              setIsSuggestionsOpen(true);
            }
          }}
          placeholder="Nombre, cédula u observación..."
          className="min-h-12 w-full rounded-xl border border-slate-300 px-4 py-3 text-base shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          aria-label="Buscar localizado"
          enterKeyHint="search"
          autoComplete="off"
        />

        {isSuggestionsOpen ? (
          <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {isLoadingSuggestions ? (
              <li className="px-4 py-3 text-sm text-slate-500">
                Buscando coincidencias…
              </li>
            ) : suggestions.length > 0 ? (
              suggestions.map((item) => (
                <li key={item.slug}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onSuggestionSelect(item)}
                    className="flex w-full flex-col items-start px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <span className="font-semibold text-slate-900">
                      {item.nombreCompleto}
                    </span>
                    <span className="text-xs text-slate-500">
                      {item.lugarNombre}
                      {item.cedula ? ` · ${item.cedula}` : ""}
                    </span>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-sm text-slate-500">Sin coincidencias</li>
            )}
          </ul>
        ) : null}
      </div>
      <button
        type="submit"
        className="min-h-12 rounded-xl bg-brand-600 px-6 py-3 text-base font-semibold text-white hover:bg-brand-700 active:scale-[0.98]"
      >
        Buscar
      </button>
    </form>
  );
}
