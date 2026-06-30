export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DesaparecidosLink } from "@/components/DesaparecidosLink";
import { LocalizadoCard } from "@/components/LocalizadoCard";
import { Pagination } from "@/components/Pagination";
import { SearchForm } from "@/components/SearchForm";
import { SearchResultsTracker } from "@/components/SearchResultsTracker";
import { ShareButtons } from "@/components/ShareButtons";
import {
  coerceCondicion,
  coerceEdad,
  coerceTipo,
  searchLocalizados,
} from "@/lib/queries";
import { shareBusqueda } from "@/lib/share";
import type { CondicionPersona, LugarTipo } from "@/lib/types";
import { parsePageParam } from "@/lib/url";

export const metadata = {
  title: "Buscar localizados",
};

function buildSearchQueryString(opts: {
  q?: string;
  condicion?: CondicionPersona;
  tipo?: LugarTipo;
  edadMin?: number;
  edadMax?: number;
  page?: number;
}) {
  const qs = new URLSearchParams();
  if (opts.q) qs.set("q", opts.q);
  if (opts.condicion) qs.set("condicion", opts.condicion);
  if (opts.tipo) qs.set("tipo", opts.tipo);
  if (opts.edadMin != null) qs.set("edadMin", String(opts.edadMin));
  if (opts.edadMax != null) qs.set("edadMax", String(opts.edadMax));
  if (opts.page != null) qs.set("page", String(opts.page));
  return qs;
}

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    condicion?: string;
    tipo?: string;
    edadMin?: string;
    edadMax?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const condicion = coerceCondicion(params.condicion);
  const tipo = coerceTipo(params.tipo);
  const edadMin = coerceEdad(params.edadMin);
  const edadMax = coerceEdad(params.edadMax);
  const page = parsePageParam(params.page);

  const hasFilters = Boolean(condicion || tipo || edadMin != null || edadMax != null);
  const hasQuery = Boolean(q || hasFilters);

  const result = hasQuery
    ? await searchLocalizados({
        q: q || undefined,
        condicion,
        tipo,
        edadMin,
        edadMax,
        page,
        limit: 20,
      })
    : { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };

  if (
    hasQuery &&
    result.meta.totalPages > 0 &&
    result.meta.page > result.meta.totalPages
  ) {
    const qs = buildSearchQueryString({
      q: q || undefined,
      condicion,
      tipo,
      edadMin,
      edadMax,
      page: result.meta.totalPages,
    });
    redirect(`/buscar?${qs.toString()}`);
  }

  function buildHref(p: number) {
    const qs = buildSearchQueryString({
      q: q || undefined,
      condicion,
      tipo,
      edadMin,
      edadMax,
      page: p,
    });
    return `/buscar?${qs.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Buscar localizados</h1>
        <p className="mt-2 text-slate-600">
          Busca por nombre, cédula u observación en registros publicados.
        </p>
      </div>

      <Suspense>
        <SearchForm initialQ={q} showFilters />
      </Suspense>

      {hasQuery && (
        <>
          {q && <SearchResultsTracker query={q} total={result.meta.total} />}
          <p className="text-sm text-slate-500">
            {result.meta.total} resultado{result.meta.total === 1 ? "" : "s"}
            {q ? <> para &ldquo;{q}&rdquo;</> : " con los filtros aplicados"}
          </p>
          {q && (
            <ShareButtons
              variant="full"
              {...shareBusqueda(q)}
              label="Compartir esta búsqueda"
              contentType="search"
            />
          )}
        </>
      )}

      <div className="grid gap-3">
        {result.data.map((item) => (
          <LocalizadoCard key={item.slug} item={item} />
        ))}
        {hasQuery && result.data.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
            No hay resultados publicados. Si la persona está <strong>localizada</strong>
            , puedes{" "}
            <a href="/contribuir" className="text-brand-600 underline">
              contribuir
            </a>
            . Si buscas reportar un <strong>desaparecido</strong>, usa{" "}
            <DesaparecidosLink className="text-brand-600 underline" />.
          </p>
        )}
      </div>

      {hasQuery && result.meta.totalPages > 1 && (
        <Pagination
          page={result.meta.page}
          totalPages={result.meta.totalPages}
          total={result.meta.total}
          buildHref={buildHref}
        />
      )}
    </div>
  );
}
