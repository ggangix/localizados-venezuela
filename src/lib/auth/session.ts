import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { AdminSession } from "@/lib/models/AdminSession";

export const SESSION_COOKIE = "lv_sid";
const SESSION_BYTES = 32;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function generateToken(): string {
  return crypto.randomBytes(SESSION_BYTES).toString("hex");
}

export async function createSession(): Promise<{ token: string; maxAge: number }> {
  await connectDB();
  const token = generateToken();
  await AdminSession.create({ token });
  return { token, maxAge: SESSION_MAX_AGE_SECONDS };
}

export async function getSession(token: string): Promise<{ id: string } | null> {
  if (!token || token.length < 16) return null;
  await connectDB();
  const session = await AdminSession.findOne({ token }).lean();
  if (!session) return null;
  return { id: String(session._id) };
}

export async function destroySession(token: string): Promise<void> {
  if (!token) return;
  await connectDB();
  await AdminSession.deleteOne({ token });
}

export function getSessionCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict" as const,
    path: "/admin",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
