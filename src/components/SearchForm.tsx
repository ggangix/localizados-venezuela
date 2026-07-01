"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { analytics } from "@/lib/analytics";
import { shouldSubmitSearch } from "@/lib/search";
import {
  CONDICION_LABELS,
  CONDICIONES,
  EDAD_MAX,
  EDAD_MIN,
  LUGAR_TIPO_LABELS,
  LUGAR_TIPOS,
} from "@/lib/constants";

function setOrDelete(params: URLSearchParams, key: string, value: string) {
  if (value) params.set(key, value);
  else params.delete(key);
}

export function SearchForm({
  initialQ = "",
  source = "buscar",
  showFilters = false,
}: {
  initialQ?: string;
  source?: "home" | "buscar";
  showFilters?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [condicion, setCondicion] = useState(params.get("condicion") ?? "");
  const [tipo, setTipo] = useState(params.get("tipo") ?? "");
  const [edadMin, setEdadMin] = useState(params.get("edadMin") ?? "");
  const [edadMax, setEdadMax] = useState(params.get("edadMax") ?? "");
  const [emptyHint, setEmptyHint] = useState(false);

  const hasFilters = Boolean(condicion || tipo || edadMin || edadMax);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    // Sin texto real ni filtros no hay nada que buscar: evitamos la
    // redirección vacía a /buscar y avisamos en vez de navegar.
    if (!shouldSubmitSearch(q, hasFilters)) {
      setEmptyHint(true);
      return;
    }
    setEmptyHint(false);
    if (trimmed) analytics.search(trimmed.length, source);

    const next = new URLSearchParams(params.toString());
    setOrDelete(next, "q", trimmed);
    setOrDelete(next, "condicion", condicion);
    setOrDelete(next, "tipo", tipo);
    setOrDelete(next, "edadMin", edadMin);
    setOrDelete(next, "edadMax", edadMax);
    next.delete("page");
    router.push(`/buscar?${next.toString()}`);
  }

  function clearFilters() {
    setCondicion("");
    setTipo("");
    setEdadMin("");
    setEdadMax("");
  }

  const selectClass =
    "min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (emptyHint) setEmptyHint(false);
          }}
          placeholder="Nombre, cédula u observación..."
          className="min-h-12 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          aria-label="Buscar localizado"
          aria-invalid={emptyHint}
          aria-describedby={emptyHint ? "buscar-hint" : undefined}
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

      {emptyHint && (
        <p id="buscar-hint" role="alert" className="text-sm text-red-600">
          Escribe un nombre, cédula u observación para buscar.
        </p>
      )}

      {showFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={condicion}
            onChange={(e) => setCondicion(e.target.value)}
            className={selectClass}
            aria-label="Filtrar por condición"
          >
            <option value="">Condición: todas</option>
            {CONDICIONES.map((c) => (
              <option key={c} value={c}>
                {CONDICION_LABELS[c]}
              </option>
            ))}
          </select>

          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className={selectClass}
            aria-label="Filtrar por tipo de lugar"
          >
            <option value="">Lugar: todos</option>
            {LUGAR_TIPOS.map((t) => (
              <option key={t} value={t}>
                {LUGAR_TIPO_LABELS[t]}
              </option>
            ))}
          </select>

          <input
            type="number"
            inputMode="numeric"
            min={EDAD_MIN}
            max={EDAD_MAX}
            value={edadMin}
            onChange={(e) => setEdadMin(e.target.value)}
            placeholder="Edad mín"
            className={`${selectClass} w-28`}
            aria-label="Edad mínima"
          />
          <input
            type="number"
            inputMode="numeric"
            min={EDAD_MIN}
            max={EDAD_MAX}
            value={edadMax}
            onChange={(e) => setEdadMax(e.target.value)}
            placeholder="Edad máx"
            className={`${selectClass} w-28`}
            aria-label="Edad máxima"
          />

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-11 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 underline hover:text-slate-900"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </form>
  );
}
