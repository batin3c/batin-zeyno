// supported currencies for expense tracking
// Frankfurter API supports all major ones: https://www.frankfurter.app

export const CURRENCIES = [
  { code: "TRY", symbol: "₺", label: "lira" },
  { code: "EUR", symbol: "€", label: "euro" },
  { code: "USD", symbol: "$", label: "dolar" },
  { code: "GBP", symbol: "£", label: "sterlin" },
  { code: "JPY", symbol: "¥", label: "yen" },
  { code: "CHF", symbol: "Fr", label: "frank" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export function symbolFor(code: string | null | undefined): string {
  if (!code) return "";
  const c = CURRENCIES.find((x) => x.code === code);
  return c?.symbol ?? code;
}

export function formatAmount(
  amount: number | null | undefined,
  code: string | null | undefined
): string {
  if (amount == null) return "";
  const sym = symbolFor(code);
  const rounded = Math.round(amount);
  const withThousands = rounded.toLocaleString("tr-TR");
  return `${sym}${withThousands}`;
}

// fetch conversion rates from Frankfurter (ECB) into TRY base
// returns a map: { EUR: 34.5, USD: 32.1, ... }  (how many TRY per 1 unit)
// TRY itself is always 1
export async function fetchRatesToTRY(
  codes: string[]
): Promise<Record<string, number>> {
  const unique = Array.from(new Set(codes.filter((c) => c && c !== "TRY")));
  if (unique.length === 0) return { TRY: 1 };
  try {
    // Frankfurter: base=EUR default; we pass ?from=EUR&to=TRY,USD,...
    // But we need each currency → TRY. Solve by: ?from=<c>&to=TRY
    // Easier: call once with base=TRY and invert? Frankfurter doesn't support TRY as base.
    // Instead: one call with ?from=EUR&to=TRY,<codes> and derive via cross-rates.
    const toParam = ["TRY", ...unique.filter((c) => c !== "EUR")].join(",");
    const url = `https://api.frankfurter.app/latest?from=EUR&to=${toParam}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return { TRY: 1 };
    const data = (await res.json()) as {
      amount: number;
      base: string;
      rates: Record<string, number>;
    };
    const eurToTry = data.rates.TRY;
    if (!eurToTry) return { TRY: 1 };
    const out: Record<string, number> = { TRY: 1, EUR: eurToTry };
    for (const c of unique) {
      if (c === "EUR") continue;
      const eurToC = data.rates[c];
      if (eurToC) out[c] = eurToTry / eurToC;
    }
    return out;
  } catch {
    return { TRY: 1 };
  }
}
