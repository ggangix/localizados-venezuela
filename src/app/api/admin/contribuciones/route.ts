import { jsonResponse } from "@/lib/api";
import { withErrorHandler } from "@/lib/api-middleware";
import { requireAdmin } from "@/lib/admin-auth";
import { connectDB } from "@/lib/db";
import { Contribucion } from "@/lib/models/Contribucion";
import { Localizado } from "@/lib/models/Localizado";

const VALID_ESTADOS = ["pending", "published", "rejected"] as const;

export const GET = withErrorHandler(async (req: Request) => {
  const denied = await requireAdmin();
  if (denied) return denied;

  await connectDB();
  const url = new URL(req.url);
  const rawEstado = url.searchParams.get("estado") ?? "pending";
  const estado = VALID_ESTADOS.includes(rawEstado as (typeof VALID_ESTADOS)[number])
    ? (rawEstado as (typeof VALID_ESTADOS)[number])
    : "pending";

  const rows = await Contribucion.find({ estado }).sort({ createdAt: -1 }).lean();

  const ids = rows.map((r) => r._id);
  const localizados = await Localizado.find({ contribucionId: { $in: ids } }).lean();
  const locMap = new Map(localizados.map((l) => [String(l.contribucionId), l]));

  return jsonResponse({
    data: rows.map((r) => ({
      id: String(r._id),
      tipo: r.tipo,
      estado: r.estado,
      fuenteNombre: r.fuenteNombre,
      fuenteUrl: r.fuenteUrl,
      fuenteNotas: r.fuenteNotas,
      contacto: r.contacto,
      persona: r.persona,
      imagenPath: r.imagenPath,
      imagenNombreOriginal: r.imagenNombreOriginal,
      createdAt: r.createdAt,
      localizadoId: locMap.get(String(r._id))
        ? String(locMap.get(String(r._id))!._id)
        : null,
    })),
  });
});
