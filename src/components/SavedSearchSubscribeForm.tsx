"use client";

import { useState } from "react";
import { WebPushButton } from "@/components/WebPushButton";

export function SavedSearchSubscribeForm({ initialQuery }: { initialQuery: string }) {
  const [queryName, setQueryName] = useState(initialQuery);
  const [cedula, setCedula] = useState("");
  const [age, setAge] = useState("");

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">
          Recibir aviso si aparece una coincidencia
        </h2>
        <p className="text-sm text-slate-600">
          Te avisaremos con una notificación en este dispositivo si se publica un
          registro verificado que podria coincidir con tu busqueda. No necesitas dejar
          tu correo. Verifica siempre la informacion en la pagina del registro.
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1.5fr_1fr_8rem]">
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

      <div className="mt-4">
        <WebPushButton
          endpoint="/api/v1/saved-search-subscriptions"
          idleLabel="Avisarme en este dispositivo"
          buildBody={() => {
            const q = queryName.trim();
            if (q.length < 2) {
              return { ok: false, error: "Escribe el nombre buscado primero." };
            }
            return { ok: true, body: { queryName: q, cedula, age } };
          }}
        />
      </div>
    </section>
  );
}
