import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [],
  },
  async headers() {
    return [
      {
        // Defensa en profundidad para los archivos subidos. La validación por
        // bytes (route.ts) ya impide guardar HTML/SVG ejecutable; estas
        // cabeceras hacen que, aunque algo llegara a /uploads, el navegador no
        // lo ejecute: lo descarga en vez de renderizarlo (Content-Disposition)
        // y no adivina el tipo (nosniff). No afecta a imágenes embebidas con
        // <img>, que ignoran Content-Disposition.
        source: "/uploads/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Disposition", value: "attachment" },
        ],
      },
    ];
  },
};

export default nextConfig;
