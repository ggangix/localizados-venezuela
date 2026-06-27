import webpush from "web-push";

export type WebPushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export function vapidConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("VAPID keys no configuradas");
  const subject =
    process.env.VAPID_SUBJECT?.trim() || "mailto:soporte@localizadosvenezuela.com";
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidReady = true;
}

/**
 * Valida y normaliza el JSON de una PushSubscription del navegador. Devuelve
 * null si no tiene la forma esperada (endpoint https + claves p256dh/auth).
 */
export function parseWebPushSubscription(raw: string): WebPushSubscriptionJSON | null {
  try {
    const parsed = JSON.parse(raw) as Partial<WebPushSubscriptionJSON> & {
      keys?: { p256dh?: unknown; auth?: unknown };
    };
    if (
      parsed &&
      typeof parsed.endpoint === "string" &&
      parsed.endpoint.startsWith("https://") &&
      parsed.keys &&
      typeof parsed.keys.p256dh === "string" &&
      typeof parsed.keys.auth === "string"
    ) {
      return {
        endpoint: parsed.endpoint,
        keys: { p256dh: parsed.keys.p256dh, auth: parsed.keys.auth },
      };
    }
  } catch {
    // JSON inválido
  }
  return null;
}

/** Identidad estable de una suscripción webpush para deduplicar (el endpoint). */
export function webpushEndpoint(raw: string): string | null {
  return parseWebPushSubscription(raw)?.endpoint ?? null;
}

export type WebPushSendResult =
  | { status: "sent"; id: string }
  | { status: "expired" }
  | { status: "failed"; error: string };

export async function sendWebPush(
  destination: string,
  payload: { title: string; body: string; url?: string }
): Promise<WebPushSendResult> {
  const subscription = parseWebPushSubscription(destination);
  if (!subscription) return { status: "failed", error: "Suscripción webpush inválida" };
  ensureVapid();
  try {
    const res = await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 60 * 60 * 24,
    });
    return { status: "sent", id: String(res.statusCode) };
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    // 404/410: el navegador descartó la suscripción (la damos de baja).
    if (statusCode === 404 || statusCode === 410) return { status: "expired" };
    return {
      status: "failed",
      error: err instanceof Error ? err.message : "Error enviando webpush",
    };
  }
}
