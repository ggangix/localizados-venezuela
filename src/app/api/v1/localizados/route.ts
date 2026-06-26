import { corsJson, corsOptions } from "@/lib/api";
import { searchLocalizados } from "@/lib/queries";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const lugar = url.searchParams.get("lugar") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? "20");

  const result = await searchLocalizados({ q, lugar, page, limit });
  return corsJson(result);
}

export function OPTIONS() {
  return corsOptions();
}
