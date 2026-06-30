"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { normalizeLugarKey, simpleLugarKey } from "@/lib/lugar-utils";

export type LugarOption = {
  slug: string;
  nombre: string;
  tipo: string;
  totalLocalizados: number;
};

type IndexedLugar = {
  lugar: LugarOption;
  simple: string;
  expanded: string;
};

const MAX_RESULTS = 8;

function matchScore(query: string, name: string): number {
  if (!query) return Infinity;
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.includes(query)) return 2;
  if (query.split(" ").every((t) => name.includes(t))) return 3;
  return Infinity;
}

function rank(query: string, indexed: IndexedLugar[]): LugarOption[] {
  const simpleKey = simpleLugarKey(query);
  if (!simpleKey) {
    return indexed
      .map((x) => x.lugar)
      .sort((a, b) => b.totalLocalizados - a.totalLocalizados)
      .slice(0, MAX_RESULTS);
  }
  const expandedKey = normalizeLugarKey(query);

  const scored: { lugar: LugarOption; score: number }[] = [];
  for (const item of indexed) {
    // Expansión aditiva: "H" coincide con "Hato" (simple) y "Hospital" (expandido).
    const score = Math.min(
      matchScore(simpleKey, item.simple),
      matchScore(expandedKey, item.expanded)
    );
    if (score === Infinity) continue;
    scored.push({ lugar: item.lugar, score });
  }

  return scored
    .sort(
      (a, b) => a.score - b.score || b.lugar.totalLocalizados - a.lugar.totalLocalizados
    )
    .slice(0, MAX_RESULTS)
    .map((s) => s.lugar);
}

export function LugarAutocomplete({
  name,
  label,
  required,
  placeholder,
  className,
  lugares,
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  className: string;
  lugares: LugarOption[];
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  // Sincroniza el estado con form.reset() nativo (se llama tras enviar con éxito).
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => {
      setValue("");
      setOpen(false);
      setActive(-1);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  const indexed = useMemo<IndexedLugar[]>(
    () =>
      lugares.map((lugar) => ({
        lugar,
        simple: simpleLugarKey(lugar.nombre),
        expanded: normalizeLugarKey(lugar.nombre),
      })),
    [lugares]
  );

  const matches = useMemo(() => rank(value, indexed), [value, indexed]);

  useEffect(() => {
    if (active < 0) return;
    document
      .getElementById(`${listboxId}-opt-${active}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, listboxId]);

  function select(lugar: LugarOption) {
    setValue(lugar.nombre);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActive((i) => (matches.length ? (i + 1) % matches.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActive((i) =>
        matches.length ? (i - 1 + matches.length) % matches.length : -1
      );
    } else if (e.key === "Enter") {
      // Con la lista abierta, Enter elige/cierra; nunca debe enviar el formulario.
      if (open && matches.length > 0) {
        e.preventDefault();
        if (active >= 0) select(matches[active]);
        else setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  const showList = open && matches.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={name} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        ref={inputRef}
        id={name}
        name={name}
        required={required}
        placeholder={placeholder}
        className={className}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listboxId}-opt-${active}` : undefined}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
            setActive(-1);
          }
        }}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {matches.map((lugar, i) => (
            <li
              key={lugar.slug}
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === active ? "bg-brand-50 text-brand-700" : "text-slate-700"
              }`}
              onMouseEnter={() => setActive(i)}
              onPointerDown={(e) => {
                e.preventDefault();
                select(lugar);
              }}
            >
              <span className="font-medium">{lugar.nombre}</span>
              <span className="ml-2 text-xs text-slate-400">
                {lugar.totalLocalizados}{" "}
                {lugar.totalLocalizados === 1 ? "persona" : "personas"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
