import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/share", () => {
  const siteUrl = () =>
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://localizadosvenezuela.com";

  const absoluteUrl = (path: string) => {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return new URL(normalized, siteUrl()).toString();
  };

  return {
    absoluteUrl,
    shareLocalizado: (slug: string, nombre: string, lugar: string) => ({
      url: absoluteUrl(`/localizados/${slug}`),
      title: `${nombre} — Localizado`,
      text: `${nombre} localizado en ${lugar}. Registro post-sismo Venezuela.`,
    }),
    shareLugar: (slug: string, nombre: string, total: number) => ({
      url: absoluteUrl(`/lugares/${slug}`),
      title: `${nombre} — Localizados`,
      text: `${total} persona${total === 1 ? "" : "s"} localizada${total === 1 ? "" : "s"} en ${nombre}.`,
    }),
    shareBusqueda: (query: string) => ({
      url: absoluteUrl(`/buscar?q=${encodeURIComponent(query)}`),
      title: `Buscar: ${query}`,
      text: `Resultados de localizados para «${query}» tras el sismo en Venezuela.`,
    }),
    shareSitio: () => ({
      url: absoluteUrl("/"),
      title: "Localizados Venezuela",
      text: "Registro colaborativo de personas localizadas tras el sismo en Venezuela.",
    }),
    shareLugaresLista: () => ({
      url: absoluteUrl("/lugares"),
      title: "Lugares — Localizados Venezuela",
      text: "Hospitales, recintos y sitios con personas localizadas tras el sismo.",
    }),
  };
});

import {
  absoluteUrl,
  shareLocalizado,
  shareLugar,
  shareBusqueda,
  shareSitio,
  shareLugaresLista,
} from "@/lib/share";

describe("absoluteUrl", () => {
  it("construye URL absoluta desde ruta relativa", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://ejemplo.com");
    expect(absoluteUrl("/test")).toBe("https://ejemplo.com/test");
    vi.unstubAllEnvs();
  });

  it("agrega slash si falta", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://ejemplo.com");
    expect(absoluteUrl("test")).toBe("https://ejemplo.com/test");
    vi.unstubAllEnvs();
  });

  it("usa default URL si no hay env var", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(absoluteUrl("/foo")).toContain("localizadosvenezuela.com");
    vi.unstubAllEnvs();
  });
});

describe("shareLocalizado", () => {
  it("retorna objeto con url, title y text", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://ejemplo.com");
    const result = shareLocalizado("juan-perez", "Juan Perez", "Hospital Central");
    expect(result.url).toBe("https://ejemplo.com/localizados/juan-perez");
    expect(result.title).toBe("Juan Perez — Localizado");
    expect(result.text).toContain("Juan Perez localizado en Hospital Central");
    vi.unstubAllEnvs();
  });
});

describe("shareLugar", () => {
  it("usa singular para total=1", () => {
    const result = shareLugar("hospital-central", "Hospital Central", 1);
    expect(result.text).toContain("1 persona localizada");
  });

  it("usa plural para total != 1", () => {
    const result = shareLugar("hospital-central", "Hospital Central", 5);
    expect(result.text).toContain("5 personas localizadas");
  });
});

describe("shareBusqueda", () => {
  it("codifica query en URL", () => {
    const result = shareBusqueda("Juan Perez");
    expect(result.url).toContain(encodeURIComponent("Juan Perez"));
    expect(result.title).toBe("Buscar: Juan Perez");
  });
});

describe("shareSitio", () => {
  it("retorna url raiz", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://ejemplo.com");
    const result = shareSitio();
    expect(result.url).toBe("https://ejemplo.com/");
    vi.unstubAllEnvs();
  });
});

describe("shareLugaresLista", () => {
  it("retorna url de lista de lugares", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://ejemplo.com");
    const result = shareLugaresLista();
    expect(result.url).toBe("https://ejemplo.com/lugares");
    vi.unstubAllEnvs();
  });
});
