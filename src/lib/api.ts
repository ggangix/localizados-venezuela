import { NextResponse } from "next/server";

export function jsonResponse(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function allowedOrigins(): string[] {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const origins = ["http://localhost:3000", "http://127.0.0.1:3000"];
  if (siteUrl) {
    try {
      origins.push(new URL(siteUrl).origin);
    } catch {
      // ignore invalid URL
    }
  }
  return [...new Set(origins)];
}

/** Rechaza peticiones cross-origin (p. ej. fetch desde otro dominio). */
export function isSameOriginRequest(req: Request): boolean {
  const allowed = allowedOrigins();
  const origin = req.headers.get("origin");
  if (origin) {
    return allowed.includes(origin);
  }
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return allowed.includes(new URL(referer).origin);
    } catch {
      return false;
    }
  }
  return false;
}

export function corsJson(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return NextResponse.json(data, { ...init, headers });
}

export function corsOptions() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
