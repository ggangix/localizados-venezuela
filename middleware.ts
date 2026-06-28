import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAdminSecrets, isAdminConfigured } from "@/lib/admin-auth-core";
import { getSession, SESSION_COOKIE } from "@/lib/auth/session";

async function isAuthed(req: NextRequest): Promise<boolean> {
  if (!isAdminConfigured()) return false;

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;

  const session = await getSession(token);
  return session !== null;
}

export async function middleware(req: NextRequest) {
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
    const authed = await isAuthed(req);
    if (!authed) {
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
