import type { NextConfig } from "next";

// Cabeceras de seguridad para todo el sitio.
const securityHeaders = [
  // El panel /admin tiene acciones destructivas de un clic. Estas cabeceras
  // impiden que la página se embeba en un iframe (clickjacking), sin depender
  // de la configuración de cookies.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

// Defensa en profundidad para los archivos subidos. La validación por bytes
// (route.ts) ya impide guardar HTML/SVG ejecutable; estas cabeceras hacen que,
// aunque algo llegara a /uploads, el navegador no lo ejecute: lo descarga en
// vez de renderizarlo (Content-Disposition) y no adivina el tipo (nosniff). No
// afecta a imágenes embebidas con <img>, que ignoran Content-Disposition.
// Content-Disposition queda acotado a /uploads: en todo el sitio forzaría a
// descargar también las páginas HTML.
const uploadHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Content-Disposition", value: "attachment" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/uploads/:path*", headers: uploadHeaders },
    ];
  },
};

export default nextConfig;
