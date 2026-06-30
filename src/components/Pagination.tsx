import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  buildHref: (page: number) => string;
}

export function Pagination({ page, totalPages, total, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const btnBase =
    "inline-flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-medium transition";
  const btnActive = `${btnBase} border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:scale-[0.98]`;
  const btnDisabled = `${btnBase} cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300`;

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-col items-center gap-3 py-2 sm:flex-row sm:justify-between"
    >
      <p className="text-sm text-slate-500">
        Página <span className="font-medium text-slate-700">{page}</span> de{" "}
        <span className="font-medium text-slate-700">{totalPages}</span>
        {" · "}
        <span className="font-medium text-slate-700">{total}</span>{" "}
        {total === 1 ? "resultado" : "resultados"}
      </p>

      <div className="flex gap-2">
        {hasPrev ? (
          <Link
            href={buildHref(page - 1)}
            className={btnActive}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Anterior
          </Link>
        ) : (
          <span
            className={btnDisabled}
            aria-disabled="true"
            aria-label="Sin página anterior"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Anterior
          </span>
        )}

        {hasNext ? (
          <Link
            href={buildHref(page + 1)}
            className={btnActive}
            aria-label="Página siguiente"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : (
          <span
            className={btnDisabled}
            aria-disabled="true"
            aria-label="Sin página siguiente"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}
