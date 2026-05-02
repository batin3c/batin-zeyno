// shared FormData/value normalizers for server actions

export function str(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > 0 ? s : null;
}

export function num(v: FormDataEntryValue | null): number | null {
  const s = typeof v === "string" ? v : "";
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** ISO 3166-1 alpha-2 normalizer: uppercase, exactly 2 letters, else null */
export function iso2(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(s) ? s : null;
}

/** Standard server action return shape */
export type ActionResult<T = void> =
  | ({ ok: true } & (T extends void ? object : T))
  | { ok: false; error: string };
