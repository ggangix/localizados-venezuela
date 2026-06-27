import { createHmac } from "crypto";
import { Lugar } from "@/lib/models/Lugar";
import { absoluteUrl } from "@/lib/share";

/**
 * Webhook saliente hacia un sitio socio (p. ej. desaparecidosterremotovenezuela.com)
 * para avisar cuando una persona queda **publicada como Localizada**. Así el otro
 * registro puede cruzar la información y marcar como encontrado su reporte de
 * desaparecido.
 *
 * Es opcional y best-effort: si `DESAPARECIDOS_WEBHOOK_URL` no está configurada,
 * todo es no-op. No bloquea la operación del panel (se dispara en segundo plano).
 * NO lee datos del socio: solo envía los nuestros, que ya son públicos vía
 * `/api/v1/localizados`.
 */

type PublishedLocalizado = {
  _id: unknown;
  slug: string;
  nombreCompleto: string;
  nombreNormalizado?: string | null;
  cedula?: string | null;
  edad?: string | null;
  condicion?: string | null;
  lugarId?: unknown;
  estado?: string;
  deletedAt?: Date | string | null;
};

function webhookUrl() {
  return process.env.DESAPARECIDOS_WEBHOOK_URL?.trim() || "";
}

function webhookSecret() {
  return process.env.DESAPARECIDOS_WEBHOOK_SECRET?.trim() || "";
}

export function partnerWebhookEnabled() {
  return webhookUrl().length > 0;
}

async function send(doc: PublishedLocalizado) {
  const url = webhookUrl();
  if (!url) return;

  let lugarNombre: string | undefined;
  if (doc.lugarId) {
    try {
      const lugar = await Lugar.findById(doc.lugarId)
        .select("nombre")
        .lean<{ nombre?: string } | null>();
      lugarNombre = lugar?.nombre;
    } catch {
      // El lugar es opcional en el payload; seguimos sin él.
    }
  }

  const payload = {
    event: "localizado.published" as const,
    occurredAt: new Date().toISOString(),
    source: "localizadosvenezuela.com",
    localizado: {
      slug: doc.slug,
      url: absoluteUrl(`/localizados/${doc.slug}`),
      nombreCompleto: doc.nombreCompleto,
      nombreNormalizado: doc.nombreNormalizado ?? undefined,
      cedula: doc.cedula ?? undefined,
      edad: doc.edad ?? undefined,
      condicion: doc.condicion ?? undefined,
      lugarNombre,
    },
  };
  const body = JSON.stringify(payload);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "localizados-venezuela-webhook/1",
    "X-LV-Event": payload.event,
  };
  // Firma HMAC opcional para que el socio verifique autenticidad e integridad.
  const secret = webhookSecret();
  if (secret) {
    headers["X-LV-Signature"] =
      "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error("[partner-webhook] respuesta no OK", {
        status: res.status,
        slug: doc.slug,
      });
    }
  } catch (err) {
    console.error("[partner-webhook] envío fallido", {
      slug: doc.slug,
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Dispara el webhook cuando un Localizado queda publicado y visible. Best-effort
 * y no bloqueante; ignora silenciosamente registros no publicados o eliminados.
 */
export function dispatchLocalizadoPublished(doc: PublishedLocalizado) {
  if (!partnerWebhookEnabled()) return;
  if (doc.estado !== "published" || doc.deletedAt) return;
  setTimeout(() => {
    void send(doc).catch((err) => {
      console.error("[partner-webhook] error inesperado", {
        slug: doc.slug,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }, 0);
}
