export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { DesaparecidosLink } from "@/components/DesaparecidosLink";
import { LocalizadoCard } from "@/components/LocalizadoCard";
import { SearchForm } from "@/components/SearchForm";
import { SearchRules } from "@/components/SearchRules";
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
  const page = Number(params.page ?? "1");
  const result = q
    ? await searchLocalizados({ q, page, limit: 20 })
    : { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };

  return (
    <div className="space-y-6">
      <section className="rounded-[1.5rem] border border-brand-100 bg-white p-4 shadow-soft sm:p-6">
        <div className="mb-4">
          <p className="hidden text-sm font-semibold uppercase tracking-[0.16em] text-brand-700 sm:block">
            Buscar en registros publicados
          </p>
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-brand-950 sm:mt-2 sm:text-3xl">
            Buscar localizados
          </h1>
          <p className="mt-2 hidden max-w-2xl text-brand-800 sm:block">
            Ingresa nombre, cédula, lugar u observación. La búsqueda revisa solo
            personas ya localizadas.
          </p>
        </div>

        <Suspense>
          <SearchForm initialQ={q} />
        </Suspense>
        <SearchRules className="mt-3" />
      </section>

      {q ? (
        <>
          <SearchResultsTracker query={q} total={result.meta.total} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-brand-800">
              {result.meta.total} resultado{result.meta.total === 1 ? "" : "s"} para
              &ldquo;{q}&rdquo;
            </p>
            <ShareButtons
              variant="full"
              {...shareBusqueda(q)}
              label="Compartir esta búsqueda"
              contentType="search"
            />
          </div>
        </>
      ) : (
        <p className="rounded-2xl border border-dashed border-brand-200 bg-white/70 p-5 text-center text-sm text-brand-800">
          Escribe un dato arriba para iniciar. Mantuvimos esta pantalla simple para que
          la búsqueda sea lo primero a mano.
        </p>
      )}

      <div className="grid gap-3">
        {result.data.map((item) => (
          <LocalizadoCard key={item.slug} item={item} />
        ))}
        {q && result.data.length === 0 && (
          <p className="rounded-2xl border border-dashed border-brand-200 bg-white p-8 text-center text-brand-800">
            No hay resultados publicados. Si la persona está <strong>localizada</strong>
            , puedes{" "}
            <a href="/contribuir" className="font-semibold text-brand-700 underline">
              contribuir
            </a>
            . Si buscas reportar un <strong>desaparecido</strong>, usa{" "}
            <DesaparecidosLink className="font-semibold text-brand-700 underline" />.
          </p>
        )}
      </div>
    </div>
  );
}
