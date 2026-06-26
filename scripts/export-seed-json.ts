/**
 * Genera seed/*.json desde el Excel (para commitear al repo).
 *
 *   npm run seed:export
 *   npm run seed:export -- ruta/al/archivo.xlsx
 */
import fs from "fs";
import path from "path";
import { FUENTE_EXCEL, buildSeedFromExcelFile } from "./lib/excel-seed";

const SEED_DIR = path.join(process.cwd(), "seed");

function main() {
  const fileArg =
    process.argv[2] ??
    path.join(
      "..",
      "localizados-venezuela-docs",
      "25JUN26 11PM Pacientes Consolidados Hospitales Venezuela.xlsx"
    );
  const filePath = path.resolve(process.cwd(), fileArg);

  if (!fs.existsSync(filePath)) {
    console.error("✗ Excel no encontrado:", filePath);
    process.exit(1);
  }

  console.log("Leyendo", filePath);
  const { lugares, localizados } = buildSeedFromExcelFile(filePath);

  fs.mkdirSync(SEED_DIR, { recursive: true });
  fs.mkdirSync(path.join(SEED_DIR, "sample"), { recursive: true });

  const manifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    source: path.basename(filePath),
    fuente: FUENTE_EXCEL,
    counts: { lugares: lugares.length, localizados: localizados.length },
  };

  fs.writeFileSync(
    path.join(SEED_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  fs.writeFileSync(
    path.join(SEED_DIR, "lugares.json"),
    JSON.stringify(lugares, null, 2)
  );
  fs.writeFileSync(
    path.join(SEED_DIR, "localizados.json"),
    JSON.stringify(localizados, null, 2)
  );

  const sampleLugares = lugares.slice(0, 3);
  const sampleSlugs = new Set(sampleLugares.map((l) => l.slug));
  const sampleLocalizados = localizados
    .filter((l) => sampleSlugs.has(l.lugarSlug))
    .slice(0, 30);

  fs.writeFileSync(
    path.join(SEED_DIR, "sample", "manifest.json"),
    JSON.stringify(
      {
        ...manifest,
        sample: true,
        counts: {
          lugares: sampleLugares.length,
          localizados: sampleLocalizados.length,
        },
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(SEED_DIR, "sample", "lugares.json"),
    JSON.stringify(sampleLugares, null, 2)
  );
  fs.writeFileSync(
    path.join(SEED_DIR, "sample", "localizados.json"),
    JSON.stringify(sampleLocalizados, null, 2)
  );

  console.log(`✓ seed/manifest.json`);
  console.log(`✓ seed/lugares.json (${lugares.length})`);
  console.log(`✓ seed/localizados.json (${localizados.length})`);
  console.log(
    `✓ seed/sample/* (${sampleLugares.length} lugares, ${sampleLocalizados.length} personas)`
  );
}

main();
