"use client";

import { useEffect, useState } from "react";
import {
  isIos,
  isStandalone,
  isWebPushSupported,
  subscribeDevice,
} from "@/lib/webpush-client";

type BuildBodyResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; error: string };

export function WebPushButton({
  endpoint,
  buildBody,
  idleLabel = "Avisarme en este dispositivo",
}: {
  endpoint: string;
  buildBody: () => BuildBodyResult;
  idleLabel?: string;
}) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [needsInstall, setNeedsInstall] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const ok = isWebPushSupported();
    setSupported(ok);
    // En iOS el push solo funciona con la app agregada a la pantalla de inicio.
    setNeedsInstall(isIos() && !isStandalone());
  }, []);

  // Aún no sabemos (SSR/primer render) — no mostramos nada para evitar parpadeo.
  if (supported === null) return null;

  if (needsInstall) {
    return (
      <p className="text-xs text-slate-500">
        En iPhone/iPad: toca <span className="font-medium">Compartir</span> →{" "}
        <span className="font-medium">Agregar a inicio</span> y abre la app desde ahí
        para activar los avisos en el dispositivo.
      </p>
    );
  }

  if (!supported) {
    return (
      <p className="text-xs text-slate-500">
        Este navegador no soporta avisos en el dispositivo. Usa el aviso por correo.
      </p>
    );
  }

  async function onClick() {
    setLoading(true);
    setStatus("");
    try {
      const built = buildBody();
      if (!built.ok) {
        setStatus(built.error);
        return;
      }
      const destination = await subscribeDevice();
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...built.body, channel: "webpush", destination }),
      });
      const json = (await res.json()) as { error?: string; mensaje?: string };
      if (!res.ok) {
        setStatus(json.error ?? "No se pudo activar el aviso en el dispositivo.");
      } else {
        setStatus(json.mensaje ?? "Listo, te avisaremos en este dispositivo.");
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "No se pudo activar el aviso.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
      >
        {loading ? "Activando..." : idleLabel}
      </button>
      {status && (
        <p className="text-sm text-slate-600" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
