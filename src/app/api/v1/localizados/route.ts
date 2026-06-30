import { corsJson, corsOptions, parseIntParam } from "@/lib/api";
import {
  coerceCondicion,
  coerceEdad,
  coerceTipo,
  searchLocalizados,
} from "@/lib/queries";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp = url.searchParams;
  const q = sp.get("q") ?? undefined;
  const lugar = sp.get("lugar") ?? undefined;
  const condicion = coerceCondicion(sp.get("condicion"));
  const tipo = coerceTipo(sp.get("tipo"));
  const edadMin = coerceEdad(sp.get("edadMin"));
  const edadMax = coerceEdad(sp.get("edadMax"));
  const page = parseIntParam(sp.get("page"), 1);
  const limit = parseIntParam(sp.get("limit"), 20);

  const result = await searchLocalizados({
    q,
    lugar,
    condicion,
    tipo,
    edadMin,
    edadMax,
    page,
    limit,
  });
  return corsJson(result);
}

export function OPTIONS() {
  return corsOptions();
}
