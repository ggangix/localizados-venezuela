"use client";

import { FormEvent, useState } from "react";

export function SubscribeToLocalizadoForm({
  slug,
  nombre,
}: {
  slug: string;
  nombre: string;
}) {
  const [channel, setChannel] = useState("email");
  const [destination, setDestination] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      const res = await fetch("/api/v1/notification-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, channel, destination }),
      });
      const json = (await res.json()) as {
        error?: string;
        mensaje?: string;
      };
      if (!res.ok) {
        setStatus(json.error ?? "No se pudo crear la suscripción");
      } else {
        setStatus(json.mensaje ?? "Suscripción creada");
        setDestination("");
      }
    } catch {
      setStatus("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold">Recibir avisos</h2>
      <p className="mt-1 text-sm text-slate-600">
        Suscríbete para recibir un aviso cuando haya cambios verificados en el registro
        de {nombre}.
      </p>
      <form
        onSubmit={onSubmit}
        className="mt-4 grid gap-3 sm:grid-cols-[9rem_1fr_auto]"
      >
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="email">Email</option>
          <option value="whatsapp" disabled>
            WhatsApp
          </option>
          <option value="sms" disabled>
            SMS
          </option>
        </select>
        <input
          type="email"
          required
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="tu@email.com"
          className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="min-h-11 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Enviando..." : "Suscribirme"}
        </button>
      </form>
      {status && (
        <p className="mt-3 text-sm text-slate-600" role="status">
          {status}
        </p>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Solo se envían avisos sobre información publicada y verificada.
      </p>
    </section>
  );
}
