import { corsJson, corsOptions } from "@/lib/api";
import { listLugares } from "@/lib/queries";

export async function GET() {
  const data = await listLugares();
  return corsJson({ data });
}

export function OPTIONS() {
  return corsOptions();
}
