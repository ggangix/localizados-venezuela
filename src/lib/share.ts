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

export function shareBusqueda(query: string) {
  const url = absoluteUrl(`/buscar?q=${encodeURIComponent(query)}`);
  return {
    url,
    title: `Buscar: ${query}`,
    text: `Resultados de localizados para «${query}» tras el sismo en Venezuela.`,
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
