export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { DesaparecidosLink } from "@/components/DesaparecidosLink";
import { LocalizadoCard } from "@/components/LocalizadoCard";
import { SearchForm } from "@/components/SearchForm";
import { SearchResultsTracker } from "@/components/SearchResultsTracker";
import { ShareButtons } from "@/components/ShareButtons";
import { listLugares, searchLocalizados } from "@/lib/queries";
import { shareBusqueda } from "@/lib/share";

export const metadata = {
  title: "Buscar localizados",
};

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; lugar?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const lugarSlug = params.lugar ?? "";
  const page = Number(params.page ?? "1");

  const [lugares, result] = await Promise.all([
    listLugares(),
    searchLocalizados({
      q: q || undefined,
      lugar: lugarSlug || undefined,
      page,
      limit: 20,
    }),
  ]);

  const lugarNombre = lugarSlug
    ? lugares.find((l) => l.slug === lugarSlug)?.nombre
    : undefined;

  const hasFilter = Boolean(q || lugarSlug);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Buscar localizados</h1>
        <p className="mt-2 text-slate-600">
          Busca por nombre, cédula u observación en registros publicados.
        </p>
      </div>

      <Suspense>
        <SearchForm initialQ={q} initialLugar={lugarSlug} lugares={lugares} />
      </Suspense>

      {hasFilter && (
        <>
          <SearchResultsTracker
            query={q || (lugarNombre ?? "")}
            total={result.meta.total}
          />
          <ShareButtons
            variant="full"
            {...shareBusqueda(q, lugarSlug)}
            label="Compartir esta busqueda"
            contentType="search"
          />
        </>
      )}

      {hasFilter && (
        <p className="text-sm text-slate-500">
          {result.meta.total} resultado{result.meta.total === 1 ? "" : "s"}
          {q && <> para &ldquo;{q}&rdquo;</>}
          {lugarNombre && (
            <>
              {" "}
              en <strong>{lugarNombre}</strong>
            </>
          )}
        </p>
      )}

      {!hasFilter && result.meta.total > 0 && (
        <p className="text-sm text-slate-500">
          Mostrando {result.data.length} de {result.meta.total} localizados publicados.
        </p>
      )}

      <div className="grid gap-3">
        {result.data.map((item) => (
          <LocalizadoCard key={item.slug} item={item} />
        ))}
        {result.data.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
            No hay resultados publicados. Si la persona esta <strong>localizada</strong>
            , puedes{" "}
            <a href="/contribuir" className="text-brand-600 underline">
              contribuir
            </a>
            . Si buscas reportar un <strong>desaparecido</strong>, usa{" "}
            <DesaparecidosLink className="text-brand-600 underline" />.
          </p>
        )}
      </div>
    </div>
  );
}
