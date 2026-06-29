"use client";

import { FormEvent, useEffect, useState } from "react";
import { analytics } from "@/lib/analytics";
import { getRecaptchaToken, loadRecaptchaScript } from "@/lib/recaptcha-client";
import { LugarAutocomplete, type LugarOption } from "@/components/LugarAutocomplete";

type Tab = "persona" | "lista_imagen";

export function ContribuirForm() {
  const [tab, setTab] = useState<Tab>("persona");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lugares, setLugares] = useState<LugarOption[]>([]);

  useEffect(() => {
    loadRecaptchaScript();
  }, []);

  // Cargado una sola vez en el formulario (siempre montado) para no refetch al cambiar de pestaña.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/lugares")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && Array.isArray(json?.data)) setLugares(json.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("tipo", tab);

    try {
      const token = await getRecaptchaToken();
      data.set("recaptchaToken", token);

      const res = await fetch("/api/v1/contribuciones", {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      if (!res.ok) {
        analytics.contribucionSubmit(tab, false);
        setStatus(json.error ?? "Error al enviar");
      } else {
        analytics.contribucionSubmit(tab, true);
        setStatus(json.mensaje ?? "Enviado correctamente");
        form.reset();
      }
    } catch {
      analytics.contribucionSubmit(tab, false);
      setStatus("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <TabButton
          active={tab === "persona"}
          onClick={() => {
            setTab("persona");
            analytics.contribucionTab("persona");
          }}
        >
          Persona localizada
        </TabButton>
        <TabButton
          active={tab === "lista_imagen"}
          onClick={() => {
            setTab("lista_imagen");
            analytics.contribucionTab("lista_imagen");
          }}
        >
          Imagen de listado
        </TabButton>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
          aria-hidden="true"
        />

        {tab === "persona" ? (
          <>
            <Field
              label="Nombre completo *"
              name="nombreCompleto"
              required
              className={inputClass}
            />
            <LugarAutocomplete
              label="Lugar donde está *"
              name="lugarNombre"
              required
              className={inputClass}
              placeholder="Ej: Hospital Domingo Luciani"
              lugares={lugares}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Edad" name="edad" className={inputClass} />
              <Field label="Cédula / ID" name="cedula" className={inputClass} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Teléfono" name="telefono" className={inputClass} />
              <Field
                label="Dirección de origen"
                name="direccion"
                className={inputClass}
              />
            </div>
            <Field label="Observaciones" name="observaciones" className={inputClass} />
          </>
        ) : (
          <div>
            <label className="mb-1 block text-sm font-medium">
              Imagen del listado *
            </label>
            <input
              type="file"
              name="imagen"
              accept="image/jpeg,image/png,image/gif,image/webp"
              required
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-500">
              JPEG, PNG, GIF o WebP — máximo 10 MB
            </p>
          </div>
        )}

        <Field
          label="Fuente de la información *"
          name="fuenteNombre"
          required
          className={inputClass}
          placeholder="Ej: Lista oficial Hospital X, @cuenta en X, grupo WhatsApp..."
        />
        <Field
          label="URL de la fuente (opcional)"
          name="fuenteUrl"
          className={inputClass}
        />
        <Field
          label="Notas sobre la fuente"
          name="fuenteNotas"
          className={inputClass}
        />
        <Field
          label="Tu contacto (opcional, no se publica)"
          name="contacto"
          className={inputClass}
        />

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Enviando..." : "Enviar contribución"}
        </button>

        {status && (
          <p className="text-sm text-slate-700" role="status">
            {status}
          </p>
        )}

        <p className="text-xs text-slate-500">
          Este sitio está protegido por reCAPTCHA. Aplican la{" "}
          <a
            href="https://policies.google.com/privacy"
            className="underline hover:text-slate-700"
            target="_blank"
            rel="noopener noreferrer"
          >
            Política de privacidad
          </a>{" "}
          y los{" "}
          <a
            href="https://policies.google.com/terms"
            className="underline hover:text-slate-700"
            target="_blank"
            rel="noopener noreferrer"
          >
            Términos de servicio
          </a>{" "}
          de Google.
        </p>
      </form>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium ${
        active
          ? "bg-brand-600 text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  name,
  className,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  className: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        required={required}
        placeholder={placeholder}
        className={className}
      />
    </div>
  );
}
