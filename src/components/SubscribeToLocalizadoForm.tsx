"use client";

import { WebPushButton } from "@/components/WebPushButton";

export function SubscribeToLocalizadoForm({
  slug,
  nombre,
}: {
  slug: string;
  nombre: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold">Recibir avisos</h2>
      <p className="mt-1 text-sm text-slate-600">
        Recibe una notificación en este dispositivo cuando haya cambios verificados en
        el registro de {nombre}.
      </p>
      <div className="mt-4">
        <WebPushButton
          endpoint="/api/v1/notification-subscriptions"
          idleLabel="Avisarme en este dispositivo"
          buildBody={() => ({ ok: true, body: { slug } })}
        />
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Solo se envían avisos sobre información publicada y verificada.
      </p>
    </section>
  );
}
