export const dynamic = "force-dynamic";

import { HomeActionCards } from "@/components/HomeActionCards";
import { SearchForm } from "@/components/SearchForm";
import { ShareButtons } from "@/components/ShareButtons";
import { getStats, listLugares } from "@/lib/queries";
import { shareSitio } from "@/lib/share";

export default async function HomePage() {
  const [stats, lugares] = await Promise.all([getStats(), listLugares()]);
  const share = shareSitio();

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Registro colaborativo de localizados
        </h1>
        <p className="max-w-2xl text-lg text-slate-600">
          Base de datos abierta con personas localizadas en hospitales, recintos y otros
          lugares tras el sismo en Venezuela. Cada persona y cada lugar tiene su propia
          página para compartir e indexar.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-xl font-semibold">Buscar localizado</h2>
        <SearchForm source="home" lugares={lugares} />
      </section>

      <ShareButtons
        variant="full"
        url={share.url}
        title={share.title}
        text={share.text}
        label="Compartir este sitio"
        contentType="site"
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Localizados publicados" value={stats.totalLocalizados} />
        <StatCard label="Lugares registrados" value={stats.totalLugares} />
        <StatCard
          label="Contribuciones en cola"
          value={stats.totalPendientes}
          hint="Fase 2: moderación"
        />
      </section>

      <HomeActionCards />
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-brand-700">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
