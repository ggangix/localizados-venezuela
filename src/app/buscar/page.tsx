export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { DesaparecidosLink } from "@/components/DesaparecidosLink";
import { LocalizadoCard } from "@/components/LocalizadoCard";
import { Pagination } from "@/components/Pagination";
import { SearchForm } from "@/components/SearchForm";
import { SearchResultsTracker } from "@/components/SearchResultsTracker";
import { ShareButtons } from "@/components/ShareButtons";
import { searchLocalizados } from "@/lib/queries";
import { shareBusqueda } from "@/lib/share";

export const metadata = {
  title: "Buscar localizados",
};

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const result = q
    ? await searchLocalizados({ q, page, limit: 20 })
    : { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };

  function buildHref(p: number) {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    qs.set("page", String(p));
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
        <SearchForm initialQ={q} />
      </Suspense>

      {q && (
        <>
          <SearchResultsTracker query={q} total={result.meta.total} />
          <p className="text-sm text-slate-500">
            {result.meta.total} resultado{result.meta.total === 1 ? "" : "s"} para
            &ldquo;{q}&rdquo;
          </p>
          <ShareButtons
            variant="full"
            {...shareBusqueda(q)}
            label="Compartir esta búsqueda"
            contentType="search"
          />
        </>
      )}

      <div className="grid gap-3">
        {result.data.map((item) => (
          <LocalizadoCard key={item.slug} item={item} />
        ))}
        {q && result.data.length === 0 && (
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

      {q && (
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
