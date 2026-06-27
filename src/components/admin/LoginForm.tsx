"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { isSafeRedirect } from "@/lib/url";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const rawNext = search.get("next") ?? "/admin";
  const next = isSafeRedirect(rawNext) ? rawNext : "/admin";
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Clave incorrecta");
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setError("Error de conexión. Verifica tu red e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Acceso moderadores</h2>
      <p className="mt-2 text-sm text-slate-600">
        Usa la clave generada con{" "}
        <code className="rounded bg-slate-100 px-1">npm run admin:secret</code>
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Clave de admin
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            autoComplete="current-password"
            required
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Entrando\u2026" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
