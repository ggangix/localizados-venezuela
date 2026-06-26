export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-GNN3P1WQW4";

type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function gtag(...args: unknown[]) {
  window.gtag?.(...args);
}

export function pageview(path: string) {
  if (typeof window === "undefined" || !GA_MEASUREMENT_ID) return;
  gtag("config", GA_MEASUREMENT_ID, { page_path: path });
}

export function trackEvent(name: string, params?: EventParams) {
  if (typeof window === "undefined" || !GA_MEASUREMENT_ID) return;
  const clean = Object.fromEntries(
    Object.entries(params ?? {}).filter(([, value]) => value !== undefined)
  );
  gtag("event", name, clean);
}

export const analytics = {
  search(queryLength: number, source: "home" | "buscar") {
    trackEvent("search", { query_length: queryLength, source });
  },

  viewSearchResults(queryLength: number, resultsCount: number) {
    trackEvent("view_search_results", {
      query_length: queryLength,
      results_count: resultsCount,
      has_results: resultsCount > 0,
    });
  },

  share(params: {
    method: "native" | "whatsapp" | "telegram" | "x" | "facebook" | "copy";
    contentType: string;
    variant: "full" | "compact" | "sticky";
  }) {
    trackEvent("share", {
      method: params.method,
      content_type: params.contentType,
      share_variant: params.variant,
    });
  },

  navigation(destination: string, navType: "desktop" | "mobile") {
    trackEvent("navigation", { destination, nav_type: navType });
  },

  outboundClick(linkUrl: string, linkName: string) {
    trackEvent("outbound_click", { link_url: linkUrl, link_name: linkName });
  },

  selectLocalizado(slug: string, source: "search" | "lugar" | "home") {
    trackEvent("select_localizado", { item_id: slug, source });
  },

  selectLugar(slug: string) {
    trackEvent("select_lugar", { item_id: slug });
  },

  ctaClick(ctaName: string, page: string) {
    trackEvent("cta_click", { cta_name: ctaName, page });
  },

  contribucionTab(tab: "persona" | "lista_imagen") {
    trackEvent("contribucion_tab", { tab });
  },

  contribucionSubmit(tipo: "persona" | "lista_imagen", success: boolean) {
    trackEvent("contribucion_submit", {
      tipo,
      success: success ? 1 : 0,
    });
  },
};
