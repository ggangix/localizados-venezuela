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
      <div>
        <h1 className="text-2xl font-bold">Lugares</h1>
        <p className="mt-2 text-slate-600">
          Hospitales, recintos, direcciones y otros sitios donde se han localizado
          personas. Ordenados por cantidad de personas localizadas.
        </p>
      </div>

      <div className="hidden md:block">
        <ShareButtons
          variant="full"
          url={share.url}
          title={share.title}
          text={share.text}
          label="Compartir índice de lugares"
          contentType="lugares_index"
        />
      </div>

      <div className="grid gap-3">
        {lugares.map((lugar) => (
          <LugarListItem key={lugar.slug} lugar={lugar} showShare={false} />
        ))}
      </div>
    </div>
  );
}
