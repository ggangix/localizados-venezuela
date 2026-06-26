export const dynamic = "force-dynamic";

import { FloatingShare } from "@/components/FloatingShare";
import { HomeActionCards } from "@/components/HomeActionCards";
import { SearchForm } from "@/components/SearchForm";
import { SearchRules } from "@/components/SearchRules";
import { ShareButtons } from "@/components/ShareButtons";
import { getStats } from "@/lib/queries";
import { shareSitio } from "@/lib/share";

export default async function HomePage() {
  const stats = await getStats();
  const share = shareSitio();

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="grid grid-cols-3 gap-2" aria-label="Resumen del registro">
        <StatCard label="Localizados" value={stats.totalLocalizados} />
        <StatCard label="Lugares" value={stats.totalLugares} />
        <StatCard label="En cola" value={stats.totalPendientes} sub="por moderar" />
      </section>

      <section className="rounded-[1.5rem] border border-brand-100 bg-white px-4 py-4 shadow-soft sm:rounded-[1.75rem] sm:px-7 sm:py-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="hidden text-sm font-semibold uppercase tracking-[0.18em] text-brand-700 sm:block">
            Registro de personas localizadas
          </p>
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-brand-950 sm:mt-3 sm:text-5xl">
            <span className="sm:hidden">Buscar localizados</span>
            <span className="hidden sm:inline">
              Busca rápido si alguien ya fue localizado
            </span>
          </h1>
          <p className="mx-auto mt-4 hidden max-w-2xl text-base leading-7 text-brand-800 sm:block sm:text-lg">
            Base pública y colaborativa de personas localizadas en hospitales, recintos,
            direcciones y otros lugares tras el sismo en Venezuela.
          </p>
        </div>

        <div className="mx-auto mt-4 max-w-2xl sm:mt-6">
          <SearchForm source="home" />
          <SearchRules className="mt-3" />
        </div>
      </section>

      <HomeActionCards />

      <div className="hidden md:block">
        <ShareButtons
          variant="full"
          url={share.url}
          title={share.title}
          text={share.text}
          label="Compartir este sitio"
          contentType="site"
        />
      </div>

      <FloatingShare url={share.url} title={share.title} text={share.text} />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-brand-100 bg-white px-2 py-3 text-center shadow-sm sm:p-5">
      <p className="text-2xl font-extrabold leading-none text-brand-900 sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-[11px] font-semibold leading-tight text-brand-700 sm:text-sm">
        {label}
      </p>
      {sub && (
        <p className="mt-0.5 text-[10px] leading-tight text-brand-500 sm:text-xs">
          {sub}
        </p>
      )}
    </div>
  );
}
