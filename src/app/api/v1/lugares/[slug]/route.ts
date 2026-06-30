import { corsJson, corsOptions, parseIntParam } from "@/lib/api";
import { getLugarBySlug } from "@/lib/queries";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Params) {
  const { slug } = await params;
  const url = new URL(req.url);
  const page = parseIntParam(url.searchParams.get("page"), 1);
  const limit = parseIntParam(url.searchParams.get("limit"), 50);
  const data = await getLugarBySlug(slug, page, limit);
  if (!data) {
    return corsJson({ error: "No encontrado" }, { status: 404 });
  }
  return corsJson({ data });
}

export function OPTIONS() {
  return corsOptions();
}
