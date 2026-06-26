const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://localizadosvenezuela.com";

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, SITE_URL).toString();
}

export function shareLocalizado(slug: string, nombre: string, lugar: string) {
  const url = absoluteUrl(`/localizados/${slug}`);
  return {
    url,
    title: `${nombre} — Localizado`,
    text: `${nombre} localizado en ${lugar}. Registro post-sismo Venezuela.`,
  };
}

export function shareLugar(slug: string, nombre: string, total: number) {
  const url = absoluteUrl(`/lugares/${slug}`);
  return {
    url,
    title: `${nombre} — Localizados`,
    text: `${total} persona${total === 1 ? "" : "s"} localizada${total === 1 ? "" : "s"} en ${nombre}.`,
  };
}

export function shareBusqueda(query: string, lugar?: string) {
  const sp = new URLSearchParams();
  if (query) sp.set("q", query);
  if (lugar) sp.set("lugar", lugar);
  const url = absoluteUrl(`/buscar?${sp.toString()}`);
  return {
    url,
    title: `Buscar: ${query || (lugar ?? "")}`,
    text: `Resultados de localizados para «${query || (lugar ?? "")}» tras el sismo en Venezuela.`,
  };
}

export function shareSitio() {
  const url = absoluteUrl("/");
  return {
    url,
    title: "Localizados Venezuela",
    text: "Registro colaborativo de personas localizadas tras el sismo en Venezuela.",
  };
}

export function shareLugaresLista() {
  const url = absoluteUrl("/lugares");
  return {
    url,
    title: "Lugares — Localizados Venezuela",
    text: "Hospitales, recintos y sitios con personas localizadas tras el sismo.",
  };
}
