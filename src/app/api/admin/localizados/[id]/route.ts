import { jsonResponse } from "@/lib/api";
import { withErrorHandler } from "@/lib/api-middleware";
import { requireAdmin } from "@/lib/admin-auth";
import { softDeleteLocalizados, updateLocalizado } from "@/lib/admin-localizado";
import { safeJsonParseBody } from "@/lib/safe-json";
import { ValidationError, NotFoundError } from "@/lib/errors";
import mongoose from "mongoose";
import type { PersonaInput } from "@/lib/admin-localizado";

type Params = { params: Promise<{ id: string }> };

export const PATCH = withErrorHandler(async (req: Request, { params }: Params) => {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError("ID inválido");
  }

  const bodyText = await req.text();
  const parsed = safeJsonParseBody<Partial<PersonaInput> & { restore?: boolean }>(
    bodyText
  );
  if (!parsed.ok) {
    return jsonResponse({ error: "JSON inválido" }, { status: 400 });
  }

  const doc = await updateLocalizado(id, parsed.data);
  return jsonResponse({ ok: true, id: String(doc._id) });
});

export const DELETE = withErrorHandler(async (_req: Request, { params }: Params) => {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError("ID inválido");
  }

  const count = await softDeleteLocalizados([id]);
  if (count === 0) {
    throw new NotFoundError("Localizado no encontrado");
  }

  return jsonResponse({ ok: true, deleted: count });
});
