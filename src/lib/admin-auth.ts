import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  getAdminSecrets,
  isAdminConfigured,
  isValidAdminSecret,
} from "@/lib/admin-auth-core";

export { ADMIN_COOKIE, getAdminSecrets, isAdminConfigured, isValidAdminSecret };

export async function getAdminTokenFromCookies(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value ?? null;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  if (!isAdminConfigured()) return false;
  const token = await getAdminTokenFromCookies();
  return token ? isValidAdminSecret(token) : false;
}

export function verifyAdminRequest(req: Request): boolean {
  if (!isAdminConfigured()) return false;

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return isValidAdminSecret(auth.slice(7).trim());
  }

  const header = req.headers.get("x-admin-secret");
  if (header && isValidAdminSecret(header.trim())) return true;

  return false;
}

export async function requireAdmin(req?: Request): Promise<NextResponse | null> {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Panel de admin no configurado" },
      { status: 503 }
    );
  }

  if (req && verifyAdminRequest(req)) return null;
  if (await isAdminAuthenticated()) return null;

  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export function setAdminCookieResponse(
  secret: string,
  body: unknown = { ok: true }
): NextResponse {
  const res = NextResponse.json(body);
  res.cookies.set(ADMIN_COOKIE, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export function clearAdminCookieResponse(): NextResponse {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
