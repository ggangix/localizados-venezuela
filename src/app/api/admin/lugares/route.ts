import { jsonResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { connectDB } from "@/lib/db";
import { inferLugarTipo } from "@/lib/lugar-utils";
import { Localizado } from "@/lib/models/Localizado";
import { Lugar } from "@/lib/models/Lugar";
import { makeSlug } from "@/lib/slug";
import type { LugarTipo } from "@/lib/types";

const PUBLISHED = {
  estado: "published" as const,
  $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
};

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  await connectDB();
  const lugares = await Lugar.find().sort({ nombre: 1 }).lean();
  const counts = await Localizado.aggregate<{ _id: unknown; total: number }>([
    { $match: PUBLISHED },
    { $group: { _id: "$lugarId", total: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.total]));

  return jsonResponse({
    data: lugares.map((l) => ({
      id: String(l._id),
      slug: l.slug,
      nombre: l.nombre,
      tipo: l.tipo,
      totalPublicados: countMap.get(String(l._id)) ?? 0,
    })),
  });
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const body = (await req.json()) as { nombre?: string; tipo?: LugarTipo };
  const nombre = body.nombre?.trim();
  if (!nombre) return jsonResponse({ error: "nombre requerido" }, { status: 400 });

  await connectDB();
  const existing = await Lugar.findOne({ nombre });
  if (existing) {
    return jsonResponse({
      ok: true,
      id: String(existing._id),
      slug: existing.slug,
      nombre: existing.nombre,
      existed: true,
    });
  }

  const doc = await Lugar.create({
    slug: makeSlug(nombre),
    nombre,
    tipo: body.tipo ?? inferLugarTipo(nombre),
  });

  return jsonResponse({
    ok: true,
    id: String(doc._id),
    slug: doc.slug,
    nombre: doc.nombre,
    existed: false,
  });
}
