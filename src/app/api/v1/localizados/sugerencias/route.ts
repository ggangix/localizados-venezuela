import { corsJson, corsOptions } from "@/lib/api";
import { searchLocalizadoSuggestions } from "@/lib/queries";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? "5");

  const result = await searchLocalizadoSuggestions(q, limit);
  return corsJson(result);
}

export function OPTIONS() {
  return corsOptions();
}
