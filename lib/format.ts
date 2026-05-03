// Tek-satırlık biçimlendirme yardımcıları. Hepsi pure, tarih girdileri ISO
// (YYYY-MM-DD veya tam ISO) olabilir.

const TR_MONTHS_SHORT = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  // date-only "YYYY-MM-DD" → UTC midnight; full ISO → as-is
  const s = iso.length === 10 ? iso + "T00:00:00Z" : iso;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Trip için tarih aralığı: aynı yıl/ay → "12–18 Mar 2026", farklı ay →
 * "28 Şub – 5 Mar 2026", tek gün → "12 Mar 2026". Sadece bir tarih varsa
 * tek tarihi döndürür. Hiçbiri yoksa null.
 */
export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined
): string | null {
  const s = parseDate(start);
  const e = parseDate(end);
  if (!s && !e) return null;
  if (s && !e) return formatSingle(s);
  if (!s && e) return formatSingle(e);
  if (s && e) {
    if (s.getTime() === e.getTime()) return formatSingle(s);
    const sameYear = s.getUTCFullYear() === e.getUTCFullYear();
    const sameMonth = sameYear && s.getUTCMonth() === e.getUTCMonth();
    if (sameMonth) {
      return `${s.getUTCDate()}–${e.getUTCDate()} ${TR_MONTHS_SHORT[s.getUTCMonth()]} ${e.getUTCFullYear()}`;
    }
    if (sameYear) {
      return `${s.getUTCDate()} ${TR_MONTHS_SHORT[s.getUTCMonth()]} – ${e.getUTCDate()} ${TR_MONTHS_SHORT[e.getUTCMonth()]} ${e.getUTCFullYear()}`;
    }
    return `${formatSingle(s)} – ${formatSingle(e)}`;
  }
  return null;
}

function formatSingle(d: Date): string {
  return `${d.getUTCDate()} ${TR_MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "5 yer", "1 yer", "0 yer" */
export function plural(n: number, singular: string, plural?: string): string {
  // turkish doesn't actually inflect plurals after numbers, so the same form
  // is used. accept the plural arg for consistency with future i18n.
  void plural;
  return `${n} ${singular}`;
}

/** "★ 4.3" — yıldız + tek ondalık. Sıfır/null'sa null. */
export function formatRating(r: number | null | undefined): string | null {
  if (r === null || r === undefined || !Number.isFinite(r) || r <= 0) {
    return null;
  }
  return `★ ${r.toFixed(1)}`;
}
