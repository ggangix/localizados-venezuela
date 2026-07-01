import Link from "next/link";
import { LugarListItem } from "@/components/LugarListItem";
import { listTopLugares } from "@/lib/queries";

export async function HomeLugaresPreview() {
  const lugares = await listTopLugares(8);

  if (lugares.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <h2 className="text-xl font-semibold text-slate-900">Lugares con registros</h2>
        <p className="mt-2 text-sm text-slate-600">
          Aún no hay lugares con localizados publicados.
        </p>
        <Link
          href="/contribuir"
          className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline"
        >
          Contribuir datos
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Lugares con más registros
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Hospitales y recintos con más personas localizadas publicadas.
          </p>
        </div>
        <Link
          href="/lugares"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          Ver todos los lugares
        </Link>
      </div>
      <div className="grid gap-3">
        {lugares.map((lugar) => (
          <LugarListItem key={lugar.slug} lugar={lugar} showShare={false} />
        ))}
      </div>
    </section>
  );
}
