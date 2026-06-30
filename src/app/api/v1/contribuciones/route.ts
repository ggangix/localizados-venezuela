import { createHash, randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { escapeRegex, isSameOriginRequest, jsonResponse } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Contribucion } from "@/lib/models/Contribucion";
import { Localizado, normalizeNombre } from "@/lib/models/Localizado";
import { Lugar } from "@/lib/models/Lugar";
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

// Tipo validado por contenido → extensión en disco. Nunca se usa el nombre del cliente.
type ImageType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
const IMAGE_EXT: Record<ImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

/**
 * Determina el tipo real de la imagen por su firma de bytes (magic bytes),
 * ignorando el Content-Type declarado por el cliente, que es falsificable.
 * Devuelve null si el contenido no corresponde a una imagen permitida
 * (p. ej. un .html o .svg renombrado y declarado como imagen).
 */
function detectImageType(buffer: Buffer): ImageType | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  // GIF: "GIF87a" / "GIF89a"
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return "image/gif";
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

function hashIp(req: Request): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

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

    const buffer = Buffer.from(await file.arrayBuffer());

    // Barrera real: el tipo se valida por la firma de bytes del contenido,
    // no por file.type (que el atacante controla). Esto bloquea subir un
    // .html/.svg ejecutable declarándolo como image/png.
    const detectedType = detectImageType(buffer);
    if (!detectedType) {
      return jsonResponse(
        { error: "El archivo no es una imagen válida (JPEG, PNG, GIF o WebP)" },
        { status: 400 }
      );
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    // Nombre aleatorio + extensión derivada del tipo validado (nunca del
    // nombre del cliente), para que el archivo no pueda servirse como HTML
    // ni tener una URL adivinable.
    const safeName = `${randomUUID()}.${IMAGE_EXT[detectedType]}`;
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
      ipHash: hashIp(req),
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
      ipHash: hashIp(req),
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
