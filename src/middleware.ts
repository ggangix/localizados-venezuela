import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Desde /uploads solo se sirven imágenes reales. Cualquier otra cosa (HTML,
// SVG, JS, ejecutables, o rutas sin extensión de imagen) se bloquea con 404.
// Esto neutraliza también archivos subidos ANTES del arreglo de validación,
// sin tener que limpiarlos a mano en el servidor.
const ALLOWED_UPLOAD_EXT = /\.(png|jpe?g|gif|webp)$/i;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/uploads/") && !ALLOWED_UPLOAD_EXT.test(pathname)) {
    return new NextResponse("Not Found", { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/uploads/:path*",
};
