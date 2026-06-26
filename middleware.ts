import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  getAdminSecrets,
  isValidAdminSecret,
} from "@/lib/admin-auth-core";

function isAuthed(req: NextRequest): boolean {
  const secrets = getAdminSecrets();
  if (!secrets.length) return false;

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (token && isValidAdminSecret(token)) return true;

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ") && isValidAdminSecret(auth.slice(7).trim())) {
    return true;
  }

  const header = req.headers.get("x-admin-secret");
  if (header && isValidAdminSecret(header.trim())) return true;

  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin/login" || pathname === "/api/admin/auth/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!getAdminSecrets().length) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Panel no configurado" }, { status: 503 });
      }
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (!isAuthed(req)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }
      const login = new URL("/admin/login", req.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
