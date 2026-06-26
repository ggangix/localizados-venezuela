"use client";

import { FormEvent, useState } from "react";

export function SavedSearchSubscribeForm({ initialQuery }: { initialQuery: string }) {
  const [queryName, setQueryName] = useState(initialQuery);
  const [cedula, setCedula] = useState("");
  const [age, setAge] = useState("");
  const [destination, setDestination] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      const res = await fetch("/api/v1/saved-search-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queryName,
          cedula,
          age,
          channel: "email",
          destination,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        mensaje?: string;
      };
      if (!res.ok) {
        setStatus(json.error ?? "No se pudo crear el aviso");
      } else {
        setStatus(json.mensaje ?? "Aviso creado");
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
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">
          Recibir aviso si aparece una coincidencia
        </h2>
        <p className="text-sm text-slate-600">
          Te enviaremos un correo si se publica un registro verificado que podria
          coincidir con tu busqueda. Verifica la informacion en la pagina del registro.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-4 grid gap-3">
        <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_8rem]">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Nombre buscado
            <input
              type="text"
              required
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Cedula / ID
            <input
              type="text"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              inputMode="numeric"
              placeholder="Opcional"
              className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Edad
            <input
              type="number"
              min="0"
              max="130"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Opcional"
              className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="tu@email.com"
              className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="min-h-11 self-end rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar confirmacion"}
          </button>
        </div>
      </form>

      {status && (
        <p className="mt-3 text-sm text-slate-600" role="status">
          {status}
        </p>
      )}
    </section>
  );
}
