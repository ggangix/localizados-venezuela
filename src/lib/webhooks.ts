import { createHmac } from "crypto";
import type mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Lugar } from "@/lib/models/Lugar";
import { Webhook, type WebhookDoc, type WebhookEvent } from "@/lib/models/Webhook";
import { WebhookDelivery } from "@/lib/models/WebhookDelivery";
import { absoluteUrl } from "@/lib/share";

/**
 * Webhooks salientes hacia sitios socios (p. ej. desaparecidosterremotovenezuela.com).
 * Los endpoints se administran desde el panel `/admin` (modelo `Webhook`), con un
 * fallback opcional por variable de entorno. Cada envío se registra en
 * `WebhookDelivery` y se reintenta con backoff. Best-effort: nunca bloquea el panel.
 *
 * NO lee datos del socio: solo enviamos los nuestros, que ya son públicos.
 */

const RETRY_DELAYS_MS = [30_000, 120_000, 600_000, 3_600_000]; // tras intentos 1..4
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1; // 5 en total
const TIMEOUT_MS = 8000;

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

type Target = {
  id?: mongoose.Types.ObjectId;
  label: string;
  url: string;
  secret?: string;
};

function envWebhookUrl() {
  return process.env.DESAPARECIDOS_WEBHOOK_URL?.trim() || "";
}
function envWebhookSecret() {
  return process.env.DESAPARECIDOS_WEBHOOK_SECRET?.trim() || "";
}

function sign(secret: string, body: string) {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

export function isValidWebhookUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Serializa un webhook para el panel sin exponer el secreto.
export function serializeWebhook(h: WebhookDoc) {
  return {
    id: String(h._id),
    nombre: h.nombre,
    url: h.url,
    hasSecret: Boolean(h.secret),
    events: h.events ?? [],
    active: h.active,
    lastStatus: h.lastStatus ?? null,
    lastError: h.lastError ?? null,
    lastDeliveryAt: h.lastDeliveryAt ?? null,
  };
}

function baseHeaders(event: string, body: string, secret?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "localizados-venezuela-webhook/1",
    "X-LV-Event": event,
  };
  if (secret) headers["X-LV-Signature"] = sign(secret, body);
  return headers;
}

async function postJson(url: string, headers: Record<string, string>, body: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    return {
      ok: res.ok,
      status: res.status,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      status: undefined as number | undefined,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function targetsForEvent(event: WebhookEvent): Promise<Target[]> {
  await connectDB();
  const targets: Target[] = [];
  const hooks = await Webhook.find({ active: true, events: event });
  for (const h of hooks) {
    targets.push({
      id: h._id,
      label: h.nombre,
      url: h.url,
      secret: h.secret || undefined,
    });
  }
  const envUrl = envWebhookUrl();
  if (envUrl) {
    targets.push({
      label: "env",
      url: envUrl,
      secret: envWebhookSecret() || undefined,
    });
  }
  return targets;
}

async function buildLocalizadoPayload(doc: PublishedLocalizado) {
  let lugarNombre: string | undefined;
  if (doc.lugarId) {
    try {
      const lugar = await Lugar.findById(doc.lugarId)
        .select("nombre")
        .lean<{ nombre?: string } | null>();
      lugarNombre = lugar?.nombre;
    } catch {
      // el lugar es opcional en el payload
    }
  }
  return {
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
}

function scheduleRetry(deliveryId: mongoose.Types.ObjectId, delayMs: number) {
  // setTimeout en proceso (servidor de larga duración). La recuperación durable
  // tras un reinicio la cubre processPendingWebhookDeliveries().
  setTimeout(
    () => {
      void attemptDelivery(deliveryId).catch((err) => {
        console.error("[webhook] reintento falló", {
          deliveryId: String(deliveryId),
          error: err instanceof Error ? err.message : String(err),
        });
      });
    },
    Math.max(0, Math.min(delayMs, 2_000_000_000))
  );
}

async function attemptDelivery(deliveryId: mongoose.Types.ObjectId) {
  await connectDB();
  const delivery = await WebhookDelivery.findById(deliveryId);
  if (!delivery || delivery.status === "sent") return delivery?.status;

  // Resolver secreto actual del destino (el webhook puede haber cambiado).
  let secret: string | undefined;
  if (delivery.webhookId) {
    const hook = await Webhook.findById(delivery.webhookId).select("secret active");
    if (!hook || !hook.active) {
      delivery.status = "failed";
      delivery.error = "Webhook eliminado o desactivado";
      delivery.nextRetryAt = undefined;
      await delivery.save();
      return delivery.status;
    }
    secret = hook.secret || undefined;
  } else {
    secret = envWebhookSecret() || undefined;
  }

  const headers = baseHeaders(delivery.event, delivery.requestBody, secret);
  const result = await postJson(delivery.url, headers, delivery.requestBody);

  delivery.attempts += 1;
  delivery.responseStatus = result.status;
  if (result.ok) {
    delivery.status = "sent";
    delivery.sentAt = new Date();
    delivery.error = undefined;
    delivery.nextRetryAt = undefined;
  } else {
    delivery.error = result.error;
    delivery.status = "failed";
    if (delivery.attempts < delivery.maxAttempts) {
      const delay =
        RETRY_DELAYS_MS[delivery.attempts - 1] ??
        RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      delivery.nextRetryAt = new Date(Date.now() + delay);
    } else {
      delivery.nextRetryAt = undefined;
    }
  }
  await delivery.save();

  if (delivery.webhookId) {
    await Webhook.updateOne(
      { _id: delivery.webhookId },
      {
        $set: {
          lastStatus: result.ok ? "sent" : "failed",
          lastError: result.ok ? undefined : result.error,
          lastDeliveryAt: new Date(),
        },
      }
    );
  }

  if (!result.ok && delivery.nextRetryAt) {
    scheduleRetry(delivery._id, delivery.nextRetryAt.getTime() - Date.now());
  }
  return delivery.status;
}

async function dispatchEvent(
  event: WebhookEvent,
  payload: Record<string, unknown>,
  targets: Target[]
) {
  if (targets.length === 0) return;
  const body = JSON.stringify(payload);
  for (const target of targets) {
    const delivery = await WebhookDelivery.create({
      webhookId: target.id,
      targetLabel: target.label,
      event,
      url: target.url,
      requestBody: body,
      maxAttempts: MAX_ATTEMPTS,
      status: "pending",
    });
    scheduleRetry(delivery._id, 0); // primer intento inmediato
  }
}

/**
 * Dispara los webhooks cuando un Localizado queda publicado y visible. Best-effort
 * y no bloqueante; ignora registros no publicados o eliminados. Si no hay webhooks
 * activos (ni env), no hace nada (sin ruido en el log).
 */
export function dispatchLocalizadoPublished(doc: PublishedLocalizado) {
  if (doc.estado !== "published" || doc.deletedAt) return;
  setTimeout(() => {
    void (async () => {
      const targets = await targetsForEvent("localizado.published");
      if (targets.length === 0) return;
      const payload = await buildLocalizadoPayload(doc);
      await dispatchEvent("localizado.published", payload, targets);
    })().catch((err) => {
      console.error("[webhook] dispatch falló", {
        slug: doc.slug,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }, 0);
}

/** Envía un ping de prueba a un webhook (síncrono) y devuelve el resultado. */
export async function sendTestWebhook(webhookId: string) {
  await connectDB();
  const hook = await Webhook.findById(webhookId);
  if (!hook) throw new Error("Webhook no encontrado");

  const payload = {
    event: "test.ping",
    occurredAt: new Date().toISOString(),
    source: "localizadosvenezuela.com",
    message: "Prueba de conexión desde Localizados Venezuela.",
  };
  const body = JSON.stringify(payload);
  const headers = baseHeaders("test.ping", body, hook.secret || undefined);
  const result = await postJson(hook.url, headers, body);

  await Webhook.updateOne(
    { _id: hook._id },
    {
      $set: {
        lastStatus: result.ok ? "sent" : "failed",
        lastError: result.ok ? undefined : result.error,
        lastDeliveryAt: new Date(),
      },
    }
  );
  return result;
}

/** Reintenta manualmente una entrega (desde el panel). */
export async function retryDelivery(deliveryId: string) {
  await connectDB();
  const delivery = await WebhookDelivery.findById(deliveryId);
  if (!delivery) throw new Error("Entrega no encontrada");
  if (delivery.status === "sent") return { status: "sent" as const };
  // Garantiza que el intento manual proceda aunque ya se agotaron los automáticos.
  if (delivery.attempts >= delivery.maxAttempts) {
    delivery.maxAttempts = delivery.attempts + 1;
    await delivery.save();
  }
  const status = await attemptDelivery(delivery._id);
  return { status: status ?? "failed" };
}

/**
 * Reprocesa entregas fallidas cuyo reintento ya venció. Útil tras un reinicio del
 * servidor (los temporizadores en memoria se pierden) o desde un cron.
 */
export async function processPendingWebhookDeliveries(limit = 50) {
  await connectDB();
  const due = await WebhookDelivery.find({
    status: "failed",
    nextRetryAt: { $lte: new Date() },
    $expr: { $lt: ["$attempts", "$maxAttempts"] },
  })
    .sort({ nextRetryAt: 1 })
    .limit(limit);

  let processed = 0;
  for (const delivery of due) {
    await attemptDelivery(delivery._id);
    processed += 1;
  }
  return processed;
}
