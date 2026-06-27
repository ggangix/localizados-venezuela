/**
 * Genera una clave de admin para el panel de moderación.
 *
 * Uso:
 *   npm run admin:secret
 *   npm run admin:secret -- --append   # muestra cómo añadir a ADMIN_SECRET existente
 */
import { randomBytes } from "crypto";

const append = process.argv.includes("--append");
const secret = randomBytes(24).toString("base64url");

console.log("\n=== Clave de admin generada ===\n");
console.log(secret);
console.log("\nAñade a tu .env.local:\n");

if (append) {
  console.log(`ADMIN_SECRET=<tu_clave_actual>,${secret}`);
  console.log("\nVarias claves separadas por coma = varios moderadores.\n");
} else {
  console.log(`ADMIN_SECRET=${secret}`);
  console.log("\nPanel: http://localhost:3000/admin/login\n");
}
