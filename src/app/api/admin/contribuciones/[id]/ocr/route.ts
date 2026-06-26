import { jsonResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { createLocalizadosFromOcr } from "@/lib/admin-localizado";
import { connectDB } from "@/lib/db";
import { Contribucion } from "@/lib/models/Contribucion";
import type { OcrRow } from "@/lib/ocr-parser";
import { extractRowsFromImage } from "@/lib/ocr-openai";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    action?: "extract" | "import";
    lugarId?: string;
    lugarNombre?: string;
    estado?: "pending" | "published";
    rows?: {
      nombre: string;
      edad?: string;
      cedula?: string;
      direccion?: string;
      observaciones?: string;
      condicion?: "vivo" | "fallecido" | "desconocido";
    }[];
  };

  await connectDB();
  const contrib = await Contribucion.findById(id);
  if (!contrib) return jsonResponse({ error: "No encontrada" }, { status: 404 });
  if (contrib.tipo !== "lista_imagen") {
    return jsonResponse({ error: "Solo aplica a lista_imagen" }, { status: 400 });
  }
  if (!contrib.imagenPath) {
    return jsonResponse({ error: "Sin imagen" }, { status: 400 });
  }

  try {
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error OCR";
    return jsonResponse({ error: msg }, { status: 500 });
  }
}
