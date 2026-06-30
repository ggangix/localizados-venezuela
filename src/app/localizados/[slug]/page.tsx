export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LugarLink } from "@/components/LugarLink";
import { ShareButtons } from "@/components/ShareButtons";
import { GoBackButton } from "@/components/GoBackButton";
import { getLocalizadoBySlug } from "@/lib/queries";
import { absoluteUrl, shareLocalizado } from "@/lib/share";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getLocalizadoBySlug(slug);
  if (!data) return { title: "Localizado no encontrado" };
  const { localizado } = data;
  return {
    title: localizado.nombreCompleto,
    description: `${localizado.nombreCompleto} localizado en ${localizado.lugarNombre}.`,
    openGraph: {
      title: localizado.nombreCompleto,
      description: `Localizado en ${localizado.lugarNombre}`,
      url: absoluteUrl(`/localizados/${slug}`),
    },
  };
}

export default async function LocalizadoPage({ params }: Props) {
  const { slug } = await params;
  const data = await getLocalizadoBySlug(slug);
  if (!data) notFound();

  const { localizado } = data;
  const share = shareLocalizado(
    localizado.slug,
    localizado.nombreCompleto,
    localizado.lugarNombre
  );
  const fields = [
    ["Edad", localizado.edad],
    ["Cédula / ID", localizado.cedula],
    ["Teléfono", localizado.telefono],
    ["Dirección", localizado.direccion],
    ["Condición", localizado.condicion !== "desconocido" ? localizado.condicion : null],
    ["Observaciones", localizado.observaciones],
  ].filter(([, v]) => v);

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <div className="mb-4 flex flex-row items-center gap-4">
          <GoBackButton route={"/lugares/" + localizado.lugarSlug} />
          <p className="text-sm font-medium text-brand-600">Persona localizada</p>
        </div>
        <h1 className="text-3xl font-bold">{localizado.nombreCompleto}</h1>
        <p className="text-lg text-slate-600">
          En{" "}
          <LugarLink
            slug={localizado.lugarSlug}
            className="font-semibold text-brand-700 hover:underline"
          >
            {localizado.lugarNombre}
          </LugarLink>
        </p>
      </header>

      <div className="hidden md:block">
        <ShareButtons
          variant="full"
          url={share.url}
          title={share.title}
          text={share.text}
          label="Compartir este localizado"
          contentType="localizado"
        />
      </div>

      {fields.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Detalles</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            {fields.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs uppercase tracking-wide text-slate-500">
                  {label}
                </dt>
                <dd className="mt-1 text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <h2 className="font-semibold text-slate-800">Fuente</h2>
        <p className="mt-1">{localizado.fuente.nombre}</p>
        {localizado.fuente.fecha && <p>Actualizado: {localizado.fuente.fecha}</p>}
        {localizado.fuente.url && (
          <a
            href={localizado.fuente.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-brand-600 underline"
          >
            Ver fuente original
          </a>
        )}
      </section>

      <ShareButtons
        variant="sticky"
        url={share.url}
        title={share.title}
        text={share.text}
        contentType="localizado"
      />
    </article>
  );
}
