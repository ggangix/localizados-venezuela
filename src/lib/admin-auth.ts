import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getAdminSecrets,
  isAdminConfigured,
  isValidAdminSecret,
} from "@/lib/admin-auth-core";
import {
  createSession,
  destroySession,
  getSession,
  SESSION_COOKIE,
} from "@/lib/auth/session";

export { getAdminSecrets, isAdminConfigured, isValidAdminSecret };

export async function getAdminTokenFromSession(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  if (!isAdminConfigured()) return false;
  const token = await getAdminTokenFromSession();
  if (!token) return false;
  const session = await getSession(token);
  return session !== null;
}

export async function requireAdmin(): Promise<NextResponse | null> {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Panel de admin no configurado" },
      { status: 503 }
    );
  }

  if (await isAdminAuthenticated()) return null;

  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export async function createAdminSessionResponse(): Promise<NextResponse> {
  const { token, maxAge } = await createSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge,
  });
  return res;
}

export async function clearAdminSessionResponse(): Promise<NextResponse> {
  const token = await getAdminTokenFromSession();
  if (token) {
    await destroySession(token);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return res;
}
