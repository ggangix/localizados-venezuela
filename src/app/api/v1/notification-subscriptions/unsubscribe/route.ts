import { unsubscribeFromNotifications } from "@/lib/notifications";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";

  try {
    await unsubscribeFromNotifications(token);
    return new Response("Suscripción cancelada.", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return new Response("El enlace para cancelar no es válido.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
