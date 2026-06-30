export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LocalizadoCard } from "@/components/LocalizadoCard";
import { Pagination } from "@/components/Pagination";
import { ShareButtons } from "@/components/ShareButtons";
import { GoBackButton } from "@/components/GoBackButton";
import { getLugarBySlug } from "@/lib/queries";
import { parsePageParam } from "@/lib/url";
import { absoluteUrl, shareLugar } from "@/lib/share";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

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

export default async function LugarPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);

  const data = await getLugarBySlug(slug, page, 50);
  if (!data) notFound();

  const { lugar, localizados, meta } = data;

  if (meta.totalPages > 0 && meta.page > meta.totalPages) {
    redirect(`/lugares/${slug}?page=${meta.totalPages}`);
  }
  const share = shareLugar(lugar.slug, lugar.nombre, lugar.totalLocalizados);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="mb-4 flex flex-row items-center gap-4">
          <GoBackButton route="/lugares" />
          <p className="text-sm font-medium uppercase tracking-wide text-brand-600">
            {lugar.tipo}
          </p>
        </div>
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

      <Pagination
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        buildHref={(p) => `/lugares/${slug}?page=${p}`}
      />

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
