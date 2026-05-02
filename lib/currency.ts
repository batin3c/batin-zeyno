// supported currencies for expense tracking
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
