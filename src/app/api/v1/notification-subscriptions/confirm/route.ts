import { confirmNotificationSubscription } from "@/lib/notifications";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";

  try {
    await confirmNotificationSubscription(token);
    return new Response("Suscripción confirmada. Ya puedes cerrar esta página.", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return new Response("El enlace de confirmación no es válido o expiró.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
