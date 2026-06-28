import { jsonResponse } from "@/lib/api";
import { withErrorHandler } from "@/lib/api-middleware";
import { requireAdmin } from "@/lib/admin-auth";
import { createLocalizadosFromOcr } from "@/lib/admin-localizado";
import { connectDB } from "@/lib/db";
import { Contribucion } from "@/lib/models/Contribucion";
import { safeJsonParseBody } from "@/lib/safe-json";
import { ValidationError, NotFoundError } from "@/lib/errors";
import type { OcrRow } from "@/lib/ocr-parser";
import { extractRowsFromImage } from "@/lib/ocr-openai";
import mongoose from "mongoose";

type Params = { params: Promise<{ id: string }> };

export const POST = withErrorHandler(async (req: Request, { params }: Params) => {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError("ID inválido");
  }

  const bodyText = await req.text();
  const parsed = safeJsonParseBody<{
    action?: string;
    lugarId?: string;
    lugarNombre?: string;
    estado?: "pending" | "published";
    rows?: OcrRow[];
  }>(bodyText);
  if (!parsed.ok) {
    return jsonResponse({ error: "JSON inválido" }, { status: 400 });
  }

  await connectDB();
  const contrib = await Contribucion.findById(id);
  if (!contrib) throw new NotFoundError("Contribución no encontrada");
  if (contrib.tipo !== "lista_imagen") {
    return jsonResponse({ error: "Solo aplica a lista_imagen" }, { status: 400 });
  }
  if (!contrib.imagenPath) {
    return jsonResponse({ error: "Sin imagen" }, { status: 400 });
  }

  const body = parsed.data;

  if (body.action === "extract" || !body.action) {
    const result = await extractRowsFromImage(contrib.imagenPath);
    return jsonResponse({ ok: true, ...result });
  }

  if (body.action === "import") {
    if (!body.rows?.length) {
      return jsonResponse({ error: "rows requerido" }, { status: 400 });
    }
    const rows: OcrRow[] = body.rows.map((r) => ({
      nombre: r.nombre,
      edad: r.edad,
      cedula: r.cedula,
      direccion: r.direccion,
      observaciones: r.observaciones,
      condicion: r.condicion ?? "desconocido",
    }));
    const result = await createLocalizadosFromOcr(rows, {
      lugarId: body.lugarId,
      lugarNombre: body.lugarNombre,
      estado: body.estado ?? "pending",
      contribucionId: id,
      fuente: {
        tipo: "ocr",
        nombre: contrib.fuenteNombre,
        url: contrib.fuenteUrl ?? undefined,
        notas: contrib.fuenteNotas ?? undefined,
      },
    });
    return jsonResponse({ ok: true, ...result });
  }

  return jsonResponse({ error: "action inválida" }, { status: 400 });
});
