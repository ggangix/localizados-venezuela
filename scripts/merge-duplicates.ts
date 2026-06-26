/**
 * Fusiona lugares duplicados (nombres truncados / variantes) y elimina
 * localizados repetidos.
 *
 * Uso:
 *   npm run merge              # dry-run (solo muestra qué haría)
 *   npm run merge -- --apply   # ejecuta cambios en MongoDB
 */
import mongoose from "mongoose";
import { Lugar } from "../src/lib/models/Lugar";
import { Localizado, normalizeNombre } from "../src/lib/models/Localizado";

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/localizados_venezuela";

const APPLY = process.argv.includes("--apply");

/** Canonical → alias(es) conocidos post-seed (Excel trunca nombres en hojas) */
const LUGAR_MERGES: { canonical: string; aliases: string[] }[] = [
  {
    canonical: "Hospital Militar Universitario Dr. Carlos Arvelo",
    aliases: ["Hospital Militar Dr. C. Arvelo"],
  },
  {
    canonical: "Hospital Universitario de Caracas",
    aliases: ["Hospital Universitario de Carac"],
  },
  {
    canonical: "Hospital Dr. José Gregorio Hernández",
    aliases: ["Hospital Dr. José Gregorio Hern"],
  },
  {
    canonical: "Hospital José María Vargas - La Guaira",
    aliases: ["H. Jose Maria Vargas LG"],
  },
  {
    canonical: "Hospital Ana Francisca Pérez de León 2",
    aliases: ["Hospital Ana Francisca Pérez de"],
  },
];

type LugarRow = {
  _id: mongoose.Types.ObjectId;
  slug: string;
  nombre: string;
  tipo: string;
};

type LocalizadoRow = {
  _id: mongoose.Types.ObjectId;
  slug: string;
  nombreCompleto: string;
  nombreNormalizado: string;
  edad?: string;
  cedula?: string;
  telefono?: string;
  direccion?: string;
  observaciones?: string;
  condicion: string;
  lugarId: mongoose.Types.ObjectId;
  estado: string;
  createdAt?: Date;
};

function log(msg: string) {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${msg}`);
}

function maskUri(uri: string) {
  return uri.replace(/:([^:@/]+)@/, ":***@");
}

function normalizeLugarKey(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\bH\b/g, "HOSPITAL")
    .replace(/\bDR\b/g, "DOCTOR")
    .replace(/\bLG\b/g, "LA GUAIRA")
    .replace(/\bJM\b/g, "JOSE MARIA")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreLocalizado(doc: LocalizadoRow): number {
  let s = 0;
  if (doc.cedula?.trim()) s += 4;
  if (doc.telefono?.trim()) s += 3;
  if (doc.observaciones?.trim()) s += 2;
  if (doc.direccion?.trim()) s += 2;
  if (doc.edad?.trim()) s += 1;
  if (doc.condicion && doc.condicion !== "desconocido") s += 1;
  if (doc.nombreCompleto.length > 8) s += 1;
  return s;
}

function pickCanonical(a: LugarRow, b: LugarRow): { keep: LugarRow; drop: LugarRow } {
  const na = normalizeLugarKey(a.nombre);
  const nb = normalizeLugarKey(b.nombre);
  if (a.nombre.length !== b.nombre.length) {
    return a.nombre.length > b.nombre.length
      ? { keep: a, drop: b }
      : { keep: b, drop: a };
  }
  if (nb.startsWith(na) && b.nombre.length > a.nombre.length) {
    return { keep: b, drop: a };
  }
  if (na.startsWith(nb) && a.nombre.length > b.nombre.length) {
    return { keep: a, drop: b };
  }
  return a.nombre.localeCompare(b.nombre) <= 0
    ? { keep: a, drop: b }
    : { keep: b, drop: a };
}

function findByNombre(lugares: LugarRow[], nombre: string): LugarRow | undefined {
  const exact = lugares.find((l) => l.nombre === nombre);
  if (exact) return exact;
  const key = normalizeLugarKey(nombre);
  return lugares.find((l) => normalizeLugarKey(l.nombre) === key);
}

/** Detecta pares donde un nombre es prefijo claro del otro (truncado en Excel) */
function detectPrefixMerges(lugares: LugarRow[]): { keep: LugarRow; drop: LugarRow }[] {
  const pairs: { keep: LugarRow; drop: LugarRow }[] = [];
  const used = new Set<string>();

  const sorted = [...lugares].sort((a, b) => a.nombre.length - b.nombre.length);

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const short = sorted[i];
      const long = sorted[j];
      const ns = normalizeLugarKey(short.nombre);
      const nl = normalizeLugarKey(long.nombre);

      if (ns.length < 12) continue;
      if (!nl.startsWith(ns)) continue;
      if (long.nombre.length - short.nombre.length < 3) continue;

      const pairKey = [String(short._id), String(long._id)].sort().join(":");
      if (used.has(pairKey)) continue;
      used.add(pairKey);

      pairs.push(pickCanonical(short, long));
    }
  }

  return pairs;
}

function buildMergePlan(lugares: LugarRow[]) {
  const plan = new Map<string, { keep: LugarRow; drop: LugarRow; reason: string }>();

  function addMerge(keep: LugarRow, drop: LugarRow, reason: string) {
    if (String(keep._id) === String(drop._id)) return;
    const dropId = String(drop._id);
    const existing = plan.get(dropId);
    if (existing) {
      if (String(existing.keep._id) === String(keep._id)) return;
      log(
        `  ⚠ Conflicto: «${drop.nombre}» ya se fusiona en «${existing.keep.nombre}»; ignorando → «${keep.nombre}»`
      );
      return;
    }
    plan.set(dropId, { keep, drop, reason });
  }

  for (const group of LUGAR_MERGES) {
    const canonical = findByNombre(lugares, group.canonical);
    if (!canonical) {
      log(`  ⚠ Canonical no encontrado: «${group.canonical}»`);
      continue;
    }
    for (const alias of group.aliases) {
      const dup = findByNombre(lugares, alias);
      if (!dup) {
        log(`  ⚠ Alias no encontrado: «${alias}»`);
        continue;
      }
      addMerge(canonical, dup, "config");
    }
  }

  for (const { keep, drop } of detectPrefixMerges(lugares)) {
    addMerge(keep, drop, "prefijo-auto");
  }

  return [...plan.values()];
}

async function mergeLugares(
  merges: { keep: LugarRow; drop: LugarRow; reason: string }[]
) {
  let moved = 0;
  let personsRemoved = 0;
  let lugaresRemoved = 0;

  for (const { keep, drop, reason } of merges) {
    const dropPeople = await Localizado.find({
      lugarId: drop._id,
      estado: "published",
    }).lean<LocalizadoRow[]>();

    log(
      `Lugar [${reason}]: «${drop.nombre}» (${dropPeople.length}) → «${keep.nombre}»`
    );

    for (const person of dropPeople) {
      const conflict = await Localizado.findOne({
        lugarId: keep._id,
        nombreNormalizado: person.nombreNormalizado,
        estado: "published",
        _id: { $ne: person._id },
      }).lean<LocalizadoRow>();

      if (conflict) {
        const keepPerson =
          scoreLocalizado(person) >= scoreLocalizado(conflict) ? person : conflict;
        const dropPerson = keepPerson._id.equals(person._id) ? conflict : person;

        if (APPLY) {
          await Localizado.updateOne(
            { _id: keepPerson._id },
            {
              $set: {
                lugarId: keep._id,
                edad: keepPerson.edad || dropPerson.edad,
                cedula: keepPerson.cedula || dropPerson.cedula,
                telefono: keepPerson.telefono || dropPerson.telefono,
                direccion: keepPerson.direccion || dropPerson.direccion,
                observaciones: keepPerson.observaciones || dropPerson.observaciones,
                condicion:
                  keepPerson.condicion !== "desconocido"
                    ? keepPerson.condicion
                    : dropPerson.condicion,
              },
            }
          );
          await Localizado.deleteOne({ _id: dropPerson._id });
        }
        personsRemoved++;
        log(
          `    - dup persona: «${dropPerson.nombreCompleto}» → queda «${keepPerson.nombreCompleto}»`
        );
        continue;
      }

      if (APPLY) {
        await Localizado.updateOne(
          { _id: person._id },
          { $set: { lugarId: keep._id } }
        );
      }
      moved++;
    }

    const remaining = await Localizado.countDocuments({ lugarId: drop._id });
    if (remaining > 0) {
      log(
        `    ⚠ «${drop.nombre}» aún tiene ${remaining} registros (pending/rejected); no se borra`
      );
      continue;
    }

    if (APPLY) {
      await Lugar.deleteOne({ _id: drop._id });
    }
    lugaresRemoved++;
  }

  return { moved, personsRemoved, lugaresRemoved };
}

async function dedupeGlobal() {
  const all = await Localizado.find({ estado: "published" }).lean<LocalizadoRow[]>();

  const groups = new Map<string, LocalizadoRow[]>();
  for (const row of all) {
    const key = `${String(row.lugarId)}:${row.nombreNormalizado}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  let removed = 0;
  for (const [, rows] of groups) {
    if (rows.length <= 1) continue;

    rows.sort((a, b) => scoreLocalizado(b) - scoreLocalizado(a));
    const [winner, ...losers] = rows;

    for (const loser of losers) {
      if (APPLY) {
        await Localizado.updateOne(
          { _id: winner._id },
          {
            $set: {
              edad: winner.edad || loser.edad,
              cedula: winner.cedula || loser.cedula,
              telefono: winner.telefono || loser.telefono,
              direccion: winner.direccion || loser.direccion,
              observaciones: winner.observaciones || loser.observaciones,
              condicion:
                winner.condicion !== "desconocido" ? winner.condicion : loser.condicion,
            },
          }
        );
        await Localizado.deleteOne({ _id: loser._id });
      }
      removed++;
      log(
        `  - dup global: «${loser.nombreCompleto}» @ lugar ${String(loser.lugarId).slice(-6)}`
      );
    }
  }

  return removed;
}

async function dedupeByCedula() {
  const all = await Localizado.find({
    estado: "published",
    cedula: { $exists: true, $nin: ["", null] },
  }).lean<LocalizadoRow[]>();

  const groups = new Map<string, LocalizadoRow[]>();
  for (const row of all) {
    const cedula = row.cedula!.replace(/\D/g, "");
    if (cedula.length < 5) continue;
    const key = `${String(row.lugarId)}:${cedula}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  let removed = 0;
  for (const [, rows] of groups) {
    if (rows.length <= 1) continue;

    rows.sort((a, b) => scoreLocalizado(b) - scoreLocalizado(a));
    const [winner, ...losers] = rows;

    for (const loser of losers) {
      if (normalizeNombre(winner.nombreCompleto) === loser.nombreNormalizado) {
        continue;
      }
      if (APPLY) {
        await Localizado.deleteOne({ _id: loser._id });
      }
      removed++;
      log(
        `  - dup cédula ${winner.cedula}: «${loser.nombreCompleto}» (se queda «${winner.nombreCompleto}»)`
      );
    }
  }

  return removed;
}

async function main() {
  log(`=== merge-duplicates ${APPLY ? "(APPLY)" : "(DRY-RUN)"} ===`);
  log(`MongoDB: ${maskUri(MONGODB_URI)}`);

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15_000 });

  const lugaresBefore = await Lugar.find().lean<LugarRow[]>();
  const personasBefore = await Localizado.countDocuments({
    estado: "published",
  });

  log(`${lugaresBefore.length} lugares, ${personasBefore} personas publicadas`);

  log("\n--- Fusión de lugares ---");
  const mergePlan = buildMergePlan(lugaresBefore);
  if (mergePlan.length === 0) {
    log("Nada que fusionar en lugares.");
  } else {
    log(`${mergePlan.length} fusión(es) de lugares planificada(s)`);
    await mergeLugares(mergePlan);
  }

  log("\n--- Deduplicar por nombre + lugar ---");
  const dupNombre = await dedupeGlobal();
  log(`${dupNombre} persona(s) duplicada(s) por nombre`);

  log("\n--- Deduplicar por cédula + lugar ---");
  const dupCedula = await dedupeByCedula();
  log(`${dupCedula} persona(s) duplicada(s) por cédula`);

  const lugaresAfter = await Lugar.countDocuments();
  const personasAfter = await Localizado.countDocuments({ estado: "published" });

  log("\n=== Resumen ===");
  log(`Lugares:  ${lugaresBefore.length} → ${lugaresAfter}`);
  log(`Personas: ${personasBefore} → ${personasAfter}`);
  if (!APPLY) {
    log("\nDry-run. Para aplicar: npm run merge -- --apply");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  void mongoose.disconnect().finally(() => process.exit(1));
});
