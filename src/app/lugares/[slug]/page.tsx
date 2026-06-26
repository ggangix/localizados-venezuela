export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalizadoCard } from "@/components/LocalizadoCard";
import { ShareButtons } from "@/components/ShareButtons";
import { GoBackButton } from "@/components/GoBackButton";
import { getLugarBySlug } from "@/lib/queries";
import { absoluteUrl, shareLugar } from "@/lib/share";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getLugarBySlug(slug);
  if (!data) return { title: "Lugar no encontrado" };
  return {
    title: data.lugar.nombre,
    description: `${data.lugar.totalLocalizados} personas localizadas en ${data.lugar.nombre}.`,
    openGraph: {
      title: data.lugar.nombre,
      description: `Registro de localizados en ${data.lugar.nombre}`,
      url: absoluteUrl(`/lugares/${slug}`),
    },
  };
}

export default async function LugarPage({ params }: Props) {
  const { slug } = await params;
  const data = await getLugarBySlug(slug);
  if (!data) notFound();

  const { lugar, localizados, meta } = data;
  const share = shareLugar(lugar.slug, lugar.nombre, lugar.totalLocalizados);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <GoBackButton route="/lugares" />
        <p className="text-sm font-medium uppercase tracking-wide text-brand-600">
          {lugar.tipo}
        </p>
        <h1 className="text-3xl font-bold">{lugar.nombre}</h1>
        {lugar.direccion && <p className="text-slate-600">{lugar.direccion}</p>}
        <p className="text-sm text-slate-500">
          {lugar.totalLocalizados} localizado
          {lugar.totalLocalizados === 1 ? "" : "s"} publicado
          {lugar.totalLocalizados === 1 ? "" : "s"}
        </p>
      </header>

      <div className="hidden md:block">
        <ShareButtons
          variant="full"
          url={share.url}
          title={share.title}
          text={share.text}
          label="Compartir listado de este lugar"
          contentType="lugar"
        />
      </div>

      <div className="grid gap-3">
        {localizados.map((item) => (
          <LocalizadoCard key={item.slug} item={item} source="lugar" />
        ))}
      </div>

      {meta && meta.totalPages > 1 && (
        <p className="text-sm text-slate-500">
          Página {meta.page} de {meta.totalPages} ({meta.total} en total). Más
          resultados vía{" "}
          <a href="/api" className="text-brand-600 underline">
            API
          </a>
          :{" "}
          <code className="text-xs">
            /api/v1/lugares/{slug}?page={meta.page + 1}
          </code>
        </p>
      )}

      <ShareButtons
        variant="sticky"
        url={share.url}
        title={share.title}
        text={share.text}
        contentType="lugar"
      />
    </div>
  );
}
