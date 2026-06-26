import slugify from "slugify";
import { customAlphabet } from "nanoid";

const suffix = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

export function makeSlug(base: string, hint?: string): string {
  const parts = [base, hint].filter(Boolean).join(" ");
  const core = slugify(parts, {
    lower: true,
    strict: true,
    locale: "es",
  });
  return core || `registro-${suffix()}`;
}

export function makeUniqueSlug(base: string, hint?: string): string {
  const core = makeSlug(base, hint);
  return `${core}-${suffix()}`;
}
