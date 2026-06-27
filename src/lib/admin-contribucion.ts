import { connectDB } from "@/lib/db";
import { createLocalizado, resolveLugarId } from "@/lib/admin-localizado";
import { Contribucion } from "@/lib/models/Contribucion";
import { Localizado, normalizeNombre } from "@/lib/models/Localizado";

export async function approveContribucion(
  id: string,
  opts: {
    moderadoPor?: string;
    notasModeracion?: string;
    lugarId?: string;
    lugarNombre?: string;
    personaPatch?: Record<string, string | undefined>;
  }
) {
  await connectDB();
  const contrib = await Contribucion.findById(id);
  if (!contrib) throw new Error("Contribución no encontrada");
  if (contrib.estado !== "pending")
    throw new Error("Solo se aprueban contribuciones pending");

  const now = new Date();
  const meta = {
    moderadoEn: now,
    moderadoPor: opts.moderadoPor ?? "admin",
    notasModeracion: opts.notasModeracion,
    estado: "published" as const,
  };

  if (contrib.tipo === "lista_imagen") {
    contrib.set(meta);
    await contrib.save();
    return { tipo: "lista_imagen" as const, contribucionId: String(contrib._id) };
  }

  const persona = { ...contrib.persona, ...opts.personaPatch };
  if (!persona?.nombreCompleto?.trim()) {
    throw new Error("Falta nombre de la persona");
  }

  const lugarId = await resolveLugarId(
    opts.lugarId,
    opts.lugarNombre ?? persona.lugarNombre ?? undefined
  );

  let localizado = await Localizado.findOne({ contribucionId: contrib._id });
  if (localizado) {
    localizado.nombreCompleto = persona.nombreCompleto.trim();
    localizado.nombreNormalizado = normalizeNombre(localizado.nombreCompleto);
    localizado.edad = persona.edad?.trim() || undefined;
    localizado.cedula = persona.cedula?.trim() || undefined;
    localizado.telefono = persona.telefono?.trim() || undefined;
    localizado.direccion = persona.direccion?.trim() || undefined;
    localizado.observaciones = persona.observaciones?.trim() || undefined;
    localizado.lugarId = lugarId;
    localizado.estado = "published";
    await localizado.save();
  } else {
    localizado = await createLocalizado({
      nombreCompleto: persona.nombreCompleto,
      edad: persona.edad ?? undefined,
      cedula: persona.cedula ?? undefined,
      telefono: persona.telefono ?? undefined,
      direccion: persona.direccion ?? undefined,
      observaciones: persona.observaciones ?? undefined,
      lugarId: String(lugarId),
      estado: "published",
      fuente: {
        tipo: "contribucion",
        nombre: contrib.fuenteNombre,
        url: contrib.fuenteUrl ?? undefined,
      },
      contribucionId: String(contrib._id),
    });
  }

  contrib.persona = persona;
  contrib.set(meta);
  await contrib.save();

  return {
    tipo: "persona" as const,
    contribucionId: String(contrib._id),
    localizadoId: String(localizado._id),
  };
}

export async function rejectContribucion(
  id: string,
  opts: { moderadoPor?: string; notasModeracion?: string }
) {
  await connectDB();
  const contrib = await Contribucion.findById(id);
  if (!contrib) throw new Error("Contribución no encontrada");
  if (contrib.estado !== "pending")
    throw new Error("Solo se rechazan contribuciones pending");

  contrib.estado = "rejected";
  contrib.moderadoEn = new Date();
  contrib.moderadoPor = opts.moderadoPor ?? "admin";
  contrib.notasModeracion = opts.notasModeracion;
  await contrib.save();

  await Localizado.updateMany(
    { contribucionId: contrib._id },
    { $set: { estado: "rejected" } }
  );

  return { contribucionId: String(contrib._id) };
}
