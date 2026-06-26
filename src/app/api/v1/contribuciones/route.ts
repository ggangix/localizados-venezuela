import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { escapeRegex, isSameOriginRequest, jsonResponse } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Contribucion } from "@/lib/models/Contribucion";
import { Localizado, normalizeNombre } from "@/lib/models/Localizado";
import { Lugar } from "@/lib/models/Lugar";
import { checkContributionRateLimit, hashIp } from "@/lib/rate-limit";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { makeSlug, makeUniqueSlug } from "@/lib/slug";

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function validateImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Formato de imagen no permitido (JPEG, PNG, GIF o WebP)";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Imagen demasiado grande (máximo 10 MB)";
  }
  return null;
}

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) {
    return jsonResponse({ error: "Origen no permitido" }, { status: 403 });
  }

  await connectDB();
  const ipHash = hashIp(req.headers);
  const rateLimit = await checkContributionRateLimit(ipHash);
  if (!rateLimit.ok) {
    return jsonResponse(
      { error: "Demasiadas solicitudes. Intenta de nuevo en unos segundos." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfter),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
        },
      }
    );
  }

  const contentType = req.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return jsonResponse({ error: "Usa multipart/form-data" }, { status: 415 });
  }

  const form = await req.formData();

  const honeypot = String(form.get("website") ?? "").trim();
  if (honeypot) {
    return jsonResponse({ error: "Solicitud rechazada" }, { status: 400 });
  }

  const recaptchaToken = String(form.get("recaptchaToken") ?? "");
  const captcha = await verifyRecaptcha(recaptchaToken);
  if (!captcha.ok) {
    return jsonResponse({ error: captcha.error }, { status: 400 });
  }

  const tipo = String(form.get("tipo") ?? "");

  if (tipo === "lista_imagen") {
    const fuenteNombre = String(form.get("fuenteNombre") ?? "").trim();
    const fuenteUrl = String(form.get("fuenteUrl") ?? "").trim();
    const fuenteNotas = String(form.get("fuenteNotas") ?? "").trim();
    const contacto = String(form.get("contacto") ?? "").trim();
    const file = form.get("imagen");

    if (!fuenteNombre || !(file instanceof File)) {
      return jsonResponse(
        { error: "fuenteNombre e imagen son requeridos" },
        { status: 400 }
      );
    }

    const imageError = validateImage(file);
    if (imageError) {
      return jsonResponse({ error: imageError }, { status: 400 });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const fullPath = path.join(UPLOAD_DIR, safeName);
    await writeFile(fullPath, buffer);

    const doc = await Contribucion.create({
      tipo: "lista_imagen",
      estado: "pending",
      fuenteNombre,
      fuenteUrl: fuenteUrl || undefined,
      fuenteNotas: fuenteNotas || undefined,
      contacto: contacto || undefined,
      imagenPath: `/uploads/${safeName}`,
      imagenNombreOriginal: file.name,
      ipHash,
    });

    return jsonResponse(
      {
        ok: true,
        id: doc._id,
        estado: "pending",
        mensaje:
          "Imagen recibida. Se publicará tras moderación (fase 2: OCR + revisión).",
      },
      { status: 202 }
    );
  }

  if (tipo === "persona") {
    const nombreCompleto = String(form.get("nombreCompleto") ?? "").trim();
    const lugarNombre = String(form.get("lugarNombre") ?? "").trim();
    const fuenteNombre = String(form.get("fuenteNombre") ?? "").trim();

    if (!nombreCompleto || !lugarNombre || !fuenteNombre) {
      return jsonResponse(
        { error: "nombreCompleto, lugarNombre y fuenteNombre son requeridos" },
        { status: 400 }
      );
    }

    const contrib = await Contribucion.create({
      tipo: "persona",
      estado: "pending",
      fuenteNombre,
      fuenteUrl: String(form.get("fuenteUrl") ?? "").trim() || undefined,
      fuenteNotas: String(form.get("fuenteNotas") ?? "").trim() || undefined,
      contacto: String(form.get("contacto") ?? "").trim() || undefined,
      persona: {
        nombreCompleto,
        edad: String(form.get("edad") ?? "").trim() || undefined,
        cedula: String(form.get("cedula") ?? "").trim() || undefined,
        telefono: String(form.get("telefono") ?? "").trim() || undefined,
        direccion: String(form.get("direccion") ?? "").trim() || undefined,
        observaciones: String(form.get("observaciones") ?? "").trim() || undefined,
        lugarNombre,
      },
      ipHash,
    });

    let lugar = await Lugar.findOne({
      nombre: new RegExp(`^${escapeRegex(lugarNombre)}$`, "i"),
    });
    if (!lugar) {
      lugar = await Lugar.create({
        slug: makeSlug(lugarNombre),
        nombre: lugarNombre,
        tipo: "otro",
      });
    }

    await Localizado.create({
      slug: makeUniqueSlug(nombreCompleto, String(form.get("cedula") ?? "")),
      nombreCompleto,
      nombreNormalizado: normalizeNombre(nombreCompleto),
      edad: String(form.get("edad") ?? "").trim() || undefined,
      cedula: String(form.get("cedula") ?? "").trim() || undefined,
      telefono: String(form.get("telefono") ?? "").trim() || undefined,
      direccion: String(form.get("direccion") ?? "").trim() || undefined,
      observaciones: String(form.get("observaciones") ?? "").trim() || undefined,
      lugarId: lugar._id,
      fuente: {
        tipo: "contribucion",
        nombre: fuenteNombre,
        url: String(form.get("fuenteUrl") ?? "").trim() || undefined,
      },
      estado: "pending",
      contribucionId: contrib._id,
    });

    return jsonResponse(
      {
        ok: true,
        id: contrib._id,
        estado: "pending",
        mensaje: "Contribución recibida. No se publica hasta moderación (fase 2).",
      },
      { status: 202 }
    );
  }

  return jsonResponse({ error: "tipo inválido" }, { status: 400 });
}
