import { corsJson, corsOptions } from "@/lib/api";
import { getLocalizadoBySlug } from "@/lib/queries";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;
  const data = await getLocalizadoBySlug(slug);
  if (!data) {
    return corsJson({ error: "No encontrado" }, { status: 404 });
  }
  return corsJson({ data: data.localizado });
}

export function OPTIONS() {
  return corsOptions();
}
