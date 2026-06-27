"use client";

import { fetchApi } from "@/lib/fetch-api";
import { useCallback, useEffect, useMemo, useState } from "react";

type Lugar = { id: string; nombre: string; slug: string; totalPublicados: number };
type Contrib = {
  id: string;
  tipo: string;
  estado: string;
  fuenteNombre: string;
  fuenteUrl?: string;
  contacto?: string;
  persona?: Record<string, string | undefined>;
  imagenPath?: string;
  imagenNombreOriginal?: string;
  createdAt?: string;
};
type Persona = {
  id: string;
  nombreCompleto: string;
  edad?: string;
  cedula?: string;
  telefono?: string;
  direccion?: string;
  observaciones?: string;
  condicion: string;
  estado: string;
  lugarId: string;
  lugarNombre: string;
  deletedAt?: string;
};
type OcrRow = {
  nombre: string;
  edad?: string;
  cedula?: string;
  direccion?: string;
  observaciones?: string;
  condicion?: string;
};

const inputCls = "mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm";
const btnPrimary =
  "rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50";
const btnSecondary =
  "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50";
const btnDanger =
  "rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50";

function LugarPicker({
  lugares,
  value,
  onChange,
  onCreate,
}: {
  lugares: Lugar[];
  value: string;
  onChange: (id: string) => void;
  onCreate: (nombre: string) => Promise<void>;
}) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      >
        <option value="">— Seleccionar hospital —</option>
        {lugares.map((l) => (
          <option key={l.id} value={l.id}>
            {l.nombre} ({l.totalPublicados})
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nuevo hospital / lugar"
          className={inputCls}
        />
        <button
          type="button"
          disabled={!newName.trim() || creating}
          className={btnSecondary}
          onClick={async () => {
            setCreating(true);
            try {
              await onCreate(newName.trim());
              setNewName("");
            } finally {
              setCreating(false);
            }
          }}
        >
          Crear
        </button>
      </div>
    </div>
  );
}

export function AdminPanel() {
  const [tab, setTab] = useState<"contrib" | "personas">("contrib");
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [contribuciones, setContribuciones] = useState<Contrib[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroLugar, setFiltroLugar] = useState("");
  const [filtroQ, setFiltroQ] = useState("");
  const [verBorrados, setVerBorrados] = useState(false);

  const [editPersona, setEditPersona] = useState<Persona | null>(null);
  const [ocrRows, setOcrRows] = useState<OcrRow[]>([]);
  const [ocrContribId, setOcrContribId] = useState<string | null>(null);
  const [ocrLugarId, setOcrLugarId] = useState("");

  const loadLugares = useCallback(async () => {
    const result = await fetchApi<{ data: Lugar[] }>("/api/admin/lugares");
    if (!result.ok) {
      setErr(result.error.error);
      return;
    }
    setLugares(result.data.data);
  }, []);

  const loadContrib = useCallback(async () => {
    const result = await fetchApi<{ data: Contrib[] }>(
      "/api/admin/contribuciones?estado=pending"
    );
    if (!result.ok) {
      setErr(result.error.error);
      return;
    }
    setContribuciones(result.data.data);
  }, []);

  const loadPersonas = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100" });
    if (filtroEstado) params.set("estado", filtroEstado);
    if (filtroLugar) params.set("lugarId", filtroLugar);
    if (filtroQ) params.set("q", filtroQ);
    if (verBorrados) params.set("deleted", "1");
    const result = await fetchApi<{ data: Persona[] }>(
      `/api/admin/localizados?${params}`
    );
    if (!result.ok) {
      setErr(result.error.error);
      return;
    }
    setPersonas(result.data.data);
  }, [filtroEstado, filtroLugar, filtroQ, verBorrados]);

  useEffect(() => {
    void loadLugares();
  }, [loadLugares]);

  useEffect(() => {
    if (tab === "contrib") void loadContrib();
    else void loadPersonas();
  }, [tab, loadContrib, loadPersonas]);

  const allSelected = useMemo(
    () => personas.length > 0 && personas.every((p) => selected.has(p.id)),
    [personas, selected]
  );

  async function createLugar(nombre: string) {
    const result = await fetchApi<{ id: string }>("/api/admin/lugares", {
      method: "POST",
      body: JSON.stringify({ nombre }),
    });
    if (!result.ok) {
      setErr(result.error.error);
      return;
    }
    await loadLugares();
    setOcrLugarId(result.data.id);
    setMsg(`Lugar «${nombre}» listo`);
  }

  async function bulk(action: string, lugarId?: string) {
    const ids = [...selected];
    if (!ids.length) return;
    setLoading(true);
    setErr("");
    try {
      const result = await fetchApi<{ affected: number }>(
        "/api/admin/localizados/bulk",
        {
          method: "POST",
          body: JSON.stringify({ ids, action, lugarId }),
        }
      );
      if (!result.ok) {
        setErr(result.error.error);
        return;
      }
      setMsg(`${action}: ${result.data.affected} registro(s)`);
      setSelected(new Set());
      await loadPersonas();
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetchApi("/api/admin/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            className={tab === "contrib" ? btnPrimary : btnSecondary}
            onClick={() => setTab("contrib")}
          >
            Contribuciones ({contribuciones.length})
          </button>
          <button
            type="button"
            className={tab === "personas" ? btnPrimary : btnSecondary}
            onClick={() => setTab("personas")}
          >
            Personas
          </button>
        </div>
        <button type="button" className={btnSecondary} onClick={() => void logout()}>
          Salir
        </button>
      </div>

      {msg ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{msg}</p>
      ) : null}
      {err ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>
      ) : null}

      {tab === "contrib" ? (
        <div className="space-y-4">
          {contribuciones.length === 0 ? (
            <p className="text-slate-600">No hay contribuciones pendientes.</p>
          ) : null}
          {contribuciones.map((c) => (
            <ContribCard
              key={c.id}
              contrib={c}
              lugares={lugares}
              onCreateLugar={createLugar}
              onDone={async () => {
                setMsg("Contribución procesada");
                await loadContrib();
                await loadPersonas();
              }}
              onError={setErr}
              onOcr={(id, rows) => {
                setOcrContribId(id);
                setOcrRows(rows);
              }}
            />
          ))}
        </div>
      ) : (
        <PersonasTab
          personas={personas}
          lugares={lugares}
          selected={selected}
          allSelected={allSelected}
          filtroEstado={filtroEstado}
          filtroLugar={filtroLugar}
          filtroQ={filtroQ}
          verBorrados={verBorrados}
          loading={loading}
          editPersona={editPersona}
          onFiltroEstado={setFiltroEstado}
          onFiltroLugar={setFiltroLugar}
          onFiltroQ={setFiltroQ}
          onVerBorrados={setVerBorrados}
          onReload={() => void loadPersonas()}
          onSelectAll={(on) =>
            setSelected(on ? new Set(personas.map((p) => p.id)) : new Set())
          }
          onToggle={(id) => {
            const next = new Set(selected);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            setSelected(next);
          }}
          onBulk={bulk}
          onEdit={setEditPersona}
          onCreateLugar={createLugar}
          onSaved={async () => {
            setEditPersona(null);
            setMsg("Guardado");
            await loadPersonas();
          }}
        />
      )}

      {ocrContribId && ocrRows.length > 0 ? (
        <OcrImportModal
          contribId={ocrContribId}
          rows={ocrRows}
          lugares={lugares}
          lugarId={ocrLugarId}
          onLugarId={setOcrLugarId}
          onCreateLugar={createLugar}
          onClose={() => {
            setOcrContribId(null);
            setOcrRows([]);
          }}
          onImported={async () => {
            setMsg("Personas importadas desde OCR");
            setOcrContribId(null);
            setOcrRows([]);
            await loadPersonas();
            await loadContrib();
          }}
          onError={setErr}
        />
      ) : null}
    </div>
  );
}

function ContribCard({
  contrib,
  lugares,
  onCreateLugar,
  onDone,
  onError,
  onOcr,
}: {
  contrib: Contrib;
  lugares: Lugar[];
  onCreateLugar: (n: string) => Promise<void>;
  onDone: () => Promise<void>;
  onError: (s: string) => void;
  onOcr: (id: string, rows: OcrRow[]) => void;
}) {
  const [lugarId, setLugarId] = useState("");
  const [notas, setNotas] = useState("");
  const [persona, setPersona] = useState(contrib.persona ?? {});
  const [busy, setBusy] = useState(false);

  async function act(action: "approve" | "reject") {
    setBusy(true);
    try {
      const result = await fetchApi(`/api/admin/contribuciones/${contrib.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action,
          notasModeracion: notas || undefined,
          lugarId: lugarId || undefined,
          persona: contrib.tipo === "persona" ? persona : undefined,
        }),
      });
      if (!result.ok) {
        onError(result.error.error);
        return;
      }
      await onDone();
    } finally {
      setBusy(false);
    }
  }

  async function runOcr() {
    setBusy(true);
    try {
      const result = await fetchApi<{ rows: OcrRow[] }>(
        `/api/admin/contribuciones/${contrib.id}/ocr`,
        {
          method: "POST",
          body: JSON.stringify({ action: "extract" }),
        }
      );
      if (!result.ok) {
        onError(result.error.error);
        return;
      }
      onOcr(contrib.id, result.data.rows ?? []);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase text-slate-500">{contrib.tipo}</p>
          <h3 className="font-semibold text-slate-900">{contrib.fuenteNombre}</h3>
          <p className="text-sm text-slate-600">{contrib.contacto}</p>
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          {contrib.estado}
        </span>
      </div>

      {contrib.imagenPath ? (
        <div className="mt-3">
          <a
            href={contrib.imagenPath}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-brand-600"
          >
            Ver imagen: {contrib.imagenNombreOriginal}
          </a>
          {/* eslint-disable-next-line @next/next/no-img-element -- uploads dinámicos en moderación */}
          <img
            src={contrib.imagenPath}
            alt=""
            className="mt-2 max-h-48 rounded-lg border object-contain"
          />
          <button
            type="button"
            className={`${btnSecondary} mt-2`}
            disabled={busy}
            onClick={() => void runOcr()}
          >
            Extraer tabla con OpenAI OCR
          </button>
        </div>
      ) : null}

      {contrib.tipo === "persona" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(
            [
              "nombreCompleto",
              "edad",
              "cedula",
              "telefono",
              "direccion",
              "observaciones",
              "lugarNombre",
            ] as const
          ).map((field) => (
            <label key={field} className="text-xs font-medium text-slate-600">
              {field}
              <input
                className={inputCls}
                value={persona[field] ?? ""}
                onChange={(e) => setPersona({ ...persona, [field]: e.target.value })}
              />
            </label>
          ))}
        </div>
      ) : null}

      <div className="mt-3">
        <p className="text-xs font-medium text-slate-600">Hospital / lugar</p>
        <LugarPicker
          lugares={lugares}
          value={lugarId}
          onChange={setLugarId}
          onCreate={onCreateLugar}
        />
      </div>

      <label className="mt-2 block text-xs font-medium text-slate-600">
        Notas moderación
        <input
          className={inputCls}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={btnPrimary}
          disabled={busy}
          onClick={() => void act("approve")}
        >
          Aprobar / publicar
        </button>
        <button
          type="button"
          className={btnDanger}
          disabled={busy}
          onClick={() => void act("reject")}
        >
          Rechazar
        </button>
      </div>
    </article>
  );
}

function OcrImportModal({
  contribId,
  rows,
  lugares,
  lugarId,
  onLugarId,
  onCreateLugar,
  onClose,
  onImported,
  onError,
}: {
  contribId: string;
  rows: OcrRow[];
  lugares: Lugar[];
  lugarId: string;
  onLugarId: (id: string) => void;
  onCreateLugar: (n: string) => Promise<void>;
  onClose: () => void;
  onImported: () => Promise<void>;
  onError: (s: string) => void;
}) {
  const [estado, setEstado] = useState<"pending" | "published">("pending");
  const [busy, setBusy] = useState(false);

  async function importRows() {
    if (!lugarId) {
      onError("Selecciona un hospital antes de importar");
      return;
    }
    setBusy(true);
    try {
      const result = await fetchApi(`/api/admin/contribuciones/${contribId}/ocr`, {
        method: "POST",
        body: JSON.stringify({ action: "import", rows, lugarId, estado }),
      });
      if (!result.ok) {
        onError(result.error.error);
        return;
      }
      await onImported();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold">Importar {rows.length} filas OCR</h3>
        <div className="mt-3">
          <LugarPicker
            lugares={lugares}
            value={lugarId}
            onChange={onLugarId}
            onCreate={onCreateLugar}
          />
        </div>
        <label className="mt-2 block text-sm">
          Estado al crear
          <select
            className={inputCls}
            value={estado}
            onChange={(e) => setEstado(e.target.value as "pending" | "published")}
          >
            <option value="pending">Pendiente (revisar después)</option>
            <option value="published">Publicado (visible en búsqueda)</option>
          </select>
        </label>
        <div className="mt-3 max-h-48 overflow-auto rounded border text-xs">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-2 text-left">Nombre</th>
                <th className="p-2 text-left">Cédula</th>
                <th className="p-2 text-left">Edad</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 30).map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{r.nombre}</td>
                  <td className="p-2">{r.cedula}</td>
                  <td className="p-2">{r.edad}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 30 ? (
            <p className="p-2 text-slate-500">…y {rows.length - 30} más</p>
          ) : null}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className={btnPrimary}
            disabled={busy}
            onClick={() => void importRows()}
          >
            Crear personas
          </button>
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function PersonasTab({
  personas,
  lugares,
  selected,
  allSelected,
  filtroEstado,
  filtroLugar,
  filtroQ,
  verBorrados,
  loading,
  editPersona,
  onFiltroEstado,
  onFiltroLugar,
  onFiltroQ,
  onVerBorrados,
  onReload,
  onSelectAll,
  onToggle,
  onBulk,
  onEdit,
  onCreateLugar,
  onSaved,
}: {
  personas: Persona[];
  lugares: Lugar[];
  selected: Set<string>;
  allSelected: boolean;
  filtroEstado: string;
  filtroLugar: string;
  filtroQ: string;
  verBorrados: boolean;
  loading: boolean;
  editPersona: Persona | null;
  onFiltroEstado: (v: string) => void;
  onFiltroLugar: (v: string) => void;
  onFiltroQ: (v: string) => void;
  onVerBorrados: (v: boolean) => void;
  onReload: () => void;
  onSelectAll: (on: boolean) => void;
  onToggle: (id: string) => void;
  onBulk: (action: string, lugarId?: string) => Promise<void>;
  onEdit: (p: Persona | null) => void;
  onCreateLugar: (n: string) => Promise<void>;
  onSaved: () => Promise<void>;
}) {
  const [moveLugarId, setMoveLugarId] = useState("");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          placeholder="Buscar nombre o cédula"
          value={filtroQ}
          onChange={(e) => onFiltroQ(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
        <select
          value={filtroEstado}
          onChange={(e) => onFiltroEstado(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="published">Publicados</option>
          <option value="pending">Pendientes</option>
          <option value="rejected">Rechazados</option>
        </select>
        <select
          value={filtroLugar}
          onChange={(e) => onFiltroLugar(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">Todos los lugares</option>
          {lugares.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nombre}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={verBorrados}
            onChange={(e) => onVerBorrados(e.target.checked)}
          />
          Solo borrados
        </label>
        <button type="button" className={btnSecondary} onClick={onReload}>
          Actualizar
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
          />
          Seleccionar todo ({selected.size})
        </label>
        <button
          type="button"
          className={btnDanger}
          disabled={!selected.size || loading}
          onClick={() => void onBulk("delete")}
        >
          Borrar (soft)
        </button>
        <button
          type="button"
          className={btnSecondary}
          disabled={!selected.size || loading}
          onClick={() => void onBulk("restore")}
        >
          Restaurar
        </button>
        <button
          type="button"
          className={btnSecondary}
          disabled={!selected.size || loading}
          onClick={() => void onBulk("publish")}
        >
          Publicar
        </button>
        <select
          value={moveLugarId}
          onChange={(e) => setMoveLugarId(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">Mover a…</option>
          {lugares.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nombre}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={btnSecondary}
          disabled={!selected.size || !moveLugarId || loading}
          onClick={() => void onBulk("move", moveLugarId)}
        >
          Mover
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="p-2" />
              <th className="p-2">Nombre</th>
              <th className="p-2">Cédula</th>
              <th className="p-2">Lugar</th>
              <th className="p-2">Estado</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {personas.map((p) => (
              <tr
                key={p.id}
                className={`border-t ${p.deletedAt ? "bg-red-50/50" : ""}`}
              >
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => onToggle(p.id)}
                  />
                </td>
                <td className="p-2 font-medium">{p.nombreCompleto}</td>
                <td className="p-2">{p.cedula}</td>
                <td className="p-2">{p.lugarNombre}</td>
                <td className="p-2">
                  {p.estado}
                  {p.deletedAt ? " · borrado" : ""}
                </td>
                <td className="p-2">
                  <button
                    type="button"
                    className="text-brand-600 hover:underline"
                    onClick={() => onEdit(p)}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editPersona ? (
        <EditPersonaModal
          persona={editPersona}
          lugares={lugares}
          onCreateLugar={onCreateLugar}
          onClose={() => onEdit(null)}
          onSaved={onSaved}
        />
      ) : null}
    </div>
  );
}

function EditPersonaModal({
  persona,
  lugares,
  onCreateLugar,
  onClose,
  onSaved,
}: {
  persona: Persona;
  lugares: Lugar[];
  onCreateLugar: (n: string) => Promise<void>;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState(persona);
  const [lugarId, setLugarId] = useState(persona.lugarId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    try {
      const result = await fetchApi(`/api/admin/localizados/${persona.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          nombreCompleto: form.nombreCompleto,
          edad: form.edad,
          cedula: form.cedula,
          telefono: form.telefono,
          direccion: form.direccion,
          observaciones: form.observaciones,
          condicion: form.condicion,
          estado: form.estado,
          lugarId,
          restore: Boolean(persona.deletedAt),
        }),
      });
      if (!result.ok) {
        setError(result.error.error);
        return;
      }
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold">Editar persona</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(
            [
              ["nombreCompleto", "Nombre"],
              ["cedula", "Cédula"],
              ["edad", "Edad"],
              ["telefono", "Teléfono"],
              ["direccion", "Dirección"],
              ["observaciones", "Observaciones"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-xs font-medium text-slate-600">
              {label}
              <input
                className={inputCls}
                value={form[key] ?? ""}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
          <label className="text-xs font-medium text-slate-600">
            Estado
            <select
              className={inputCls}
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
            >
              <option value="published">published</option>
              <option value="pending">pending</option>
              <option value="rejected">rejected</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Condición
            <select
              className={inputCls}
              value={form.condicion}
              onChange={(e) => setForm({ ...form, condicion: e.target.value })}
            >
              <option value="desconocido">desconocido</option>
              <option value="vivo">vivo</option>
              <option value="fallecido">fallecido</option>
            </select>
          </label>
        </div>
        <div className="mt-3">
          <p className="text-xs font-medium text-slate-600">Hospital</p>
          <LugarPicker
            lugares={lugares}
            value={lugarId}
            onChange={setLugarId}
            onCreate={onCreateLugar}
          />
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className={btnPrimary}
            disabled={busy}
            onClick={() => void save()}
          >
            Guardar
          </button>
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
