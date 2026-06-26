export const dynamic = "force-dynamic";

import { LugarListItem } from "@/components/LugarListItem";
import { ShareButtons } from "@/components/ShareButtons";
import { listLugares } from "@/lib/queries";
import { shareLugaresLista } from "@/lib/share";

export const metadata = {
  title: "Lugares",
};

export default async function LugaresPage() {
  const lugares = await listLugares();
  const share = shareLugaresLista();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">
          Índice de lugares
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-950">
          Lugares
        </h1>
        <p className="mt-2 text-brand-800">
          Hospitales, recintos, direcciones y otros sitios donde se han localizado
          personas.
        </p>
      </section>

      <ShareButtons
        variant="full"
        url={share.url}
        title={share.title}
        text={share.text}
        label="Compartir índice de lugares"
        contentType="lugares_index"
      />

      <div className="grid gap-3">
        {lugares.map((lugar) => (
          <LugarListItem key={lugar.slug} lugar={lugar} />
        ))}
      </div>
    </div>
  );
}
