import { jsonResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { createLocalizado } from "@/lib/admin-localizado";
import { connectDB } from "@/lib/db";
import { Localizado } from "@/lib/models/Localizado";
import { Lugar } from "@/lib/models/Lugar";

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  await connectDB();
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
  const estado = url.searchParams.get("estado");
  const lugarId = url.searchParams.get("lugarId");
  const q = url.searchParams.get("q")?.trim();
  const deleted = url.searchParams.get("deleted") === "1";

  const notDeleted = {
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  };
  const filter: Record<string, unknown> = {};
  if (estado) filter.estado = estado;
  if (lugarId) filter.lugarId = lugarId;

  const clauses: Record<string, unknown>[] = [
    deleted ? { deletedAt: { $ne: null } } : notDeleted,
  ];
  if (q) {
    clauses.push({
      $or: [
        { nombreCompleto: new RegExp(q, "i") },
        { cedula: new RegExp(q.replace(/\D/g, ""), "i") },
      ],
    });
  }
  if (clauses.length === 1) Object.assign(filter, clauses[0]);
  else filter.$and = clauses;

  const [rows, total] = await Promise.all([
    Localizado.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Localizado.countDocuments(filter),
  ]);

  const lugarIds = [...new Set(rows.map((r) => String(r.lugarId)))];
  const lugares = await Lugar.find({ _id: { $in: lugarIds } }).lean();
  const lugarMap = new Map(lugares.map((l) => [String(l._id), l]));

  return jsonResponse({
    data: rows.map((r) => {
      const lugar = lugarMap.get(String(r.lugarId));
      return {
        id: String(r._id),
        slug: r.slug,
        nombreCompleto: r.nombreCompleto,
        edad: r.edad,
        cedula: r.cedula,
        telefono: r.telefono,
        direccion: r.direccion,
        observaciones: r.observaciones,
        condicion: r.condicion,
        estado: r.estado,
        lugarId: String(r.lugarId),
        lugarNombre: lugar?.nombre ?? "",
        deletedAt: r.deletedAt,
        updatedAt: r.updatedAt,
      };
    }),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as Parameters<typeof createLocalizado>[0];
    const doc = await createLocalizado(body);
    return jsonResponse({ ok: true, id: String(doc._id), slug: doc.slug });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return jsonResponse({ error: msg }, { status: 400 });
  }
}