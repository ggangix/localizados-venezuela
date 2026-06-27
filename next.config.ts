import type { NextConfig } from "next";

// Orígenes extra permitidos en `next dev` (p. ej. túneles ngrok/cloudflare al probar
// en el móvil). Coma-separados en DEV_ALLOWED_ORIGINS. Solo afecta a desarrollo.
const allowedDevOrigins = process.env.DEV_ALLOWED_ORIGINS?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [],
  },
  ...(allowedDevOrigins?.length ? { allowedDevOrigins } : {}),
};

export default nextConfig;
