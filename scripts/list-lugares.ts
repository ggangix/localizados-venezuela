/**
 * Lista lugares y detecta posibles duplicados por nombre normalizado.
 * Uso: MONGODB_URI=... npx tsx scripts/list-lugares.ts
 */
import mongoose from "mongoose";
import { Lugar } from "../src/lib/models/Lugar";
import { Localizado } from "../src/lib/models/Localizado";

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/localizados_venezuela";

function normalizeKey(nombre: string): string {
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

async function main() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15_000 });

  const rows = await Lugar.aggregate<{
    _id: mongoose.Types.ObjectId;
    slug: string;
    nombre: string;
    tipo: string;
    publicados: number;
    pending: number;
  }>([
    {
      $lookup: {
        from: Localizado.collection.name,
        localField: "_id",
        foreignField: "lugarId",
        as: "personas",
      },
    },
    {
      $project: {
        slug: 1,
        nombre: 1,
        tipo: 1,
        publicados: {
          $size: {
            $filter: {
              input: "$personas",
              as: "p",
              cond: { $eq: ["$$p.estado", "published"] },
            },
          },
        },
        pending: {
          $size: {
            $filter: {
              input: "$personas",
              as: "p",
              cond: { $eq: ["$$p.estado", "pending"] },
            },
          },
        },
      },
    },
    { $sort: { nombre: 1 } },
  ]);

  console.log(`\n=== ${rows.length} lugares en total ===\n`);
  console.log("PUBLICADOS | PEND | TIPO      | NOMBRE");
  console.log("-".repeat(90));
  for (const r of rows) {
    console.log(
      `${String(r.publicados).padStart(10)} | ${String(r.pending).padStart(4)} | ${r.tipo.padEnd(9)} | ${r.nombre}`
    );
  }

  const byKey = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = normalizeKey(r.nombre);
    const list = byKey.get(key) ?? [];
    list.push(r);
    byKey.set(key, list);
  }

  const dupExact = [...byKey.entries()].filter(([, list]) => list.length > 1);
  if (dupExact.length) {
    console.log(
      `\n=== Duplicados por nombre normalizado (${dupExact.length} grupos) ===\n`
    );
    for (const [key, list] of dupExact) {
      console.log(`[${key}]`);
      for (const r of list) {
        console.log(`  • ${r.nombre} (${r.publicados} pub, slug: ${r.slug})`);
      }
      console.log("");
    }
  }

  // Prefijos: nombre corto es prefijo del largo
  console.log("\n=== Posibles truncados (prefijo) ===\n");
  const sorted = [...rows].sort((a, b) => a.nombre.length - b.nombre.length);
  let prefixCount = 0;
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      const ka = normalizeKey(a.nombre);
      const kb = normalizeKey(b.nombre);
      if (ka.length < 12) continue;
      if (!kb.startsWith(ka)) continue;
      if (b.nombre.length - a.nombre.length < 3) continue;
      prefixCount++;
      console.log(`  «${a.nombre}» (${a.publicados})`);
      console.log(`    → «${b.nombre}» (${b.publicados})`);
      console.log("");
    }
  }
  if (!prefixCount) console.log("  (ninguno detectado)");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  void mongoose.disconnect().finally(() => process.exit(1));
});
