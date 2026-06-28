"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ComboboxOption {
  value: string;
  label: string;
  hint?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  ariaLabel,
}: {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const highlight = useCallback((idx: number) => {
    const items = listRef.current?.children;
    if (items && items[idx]) {
      (items[idx] as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  }, []);

  function select(slug: string) {
    onChange(slug);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    const items = listRef.current;
    if (!items) return;

    const current = Array.from(items.children).findIndex(
      (el) => el.getAttribute("data-active") === "true"
    );

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(current + 1, items.children.length - 1);
      highlight(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(current - 1, 0);
      highlight(prev);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (current >= 0 && filtered[current]) {
        select(filtered[current].value);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="flex min-h-12 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-base shadow-sm hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={selected ? "text-slate-900" : "text-slate-400"}>
          {selected ? (
            <>
              {selected.label}
              {selected.hint && (
                <span className="ml-1 text-sm text-slate-400">{selected.hint}</span>
              )}
            </>
          ) : (
            placeholder
          )}
        </span>
        <svg
          className={`h-5 w-5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar lugar..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-100"
              onKeyDown={handleKeyDown}
            />
          </div>
          <ul ref={listRef} role="listbox" className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-400">Sin resultados</li>
            )}
            {filtered.map((opt) => (
              <li
                key={opt.value}
                data-active={opt.value === value}
                role="option"
                aria-selected={opt.value === value}
                onClick={() => select(opt.value)}
                className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  opt.value === value
                    ? "bg-brand-50 font-medium text-brand-700"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{opt.label}</span>
                {opt.hint && (
                  <span className="ml-2 text-xs text-slate-400">{opt.hint}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
