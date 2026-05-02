import type { Expense, Settlement } from "./types";

/**
 * Per-currency net balance per member for a trip.
 * Positive = the member is owed money. Negative = the member owes.
 *
 * For a 2-person trip the two member balances always sum to 0 in each
 * currency, so the UI can just pick one anchor member to phrase the
 * sentence ("X owes Y …").
 *
 * `memberIds` must contain exactly the two trip-member ids.
 */
export type Balances = Record<string, Record<string, number>>;

export function computeBalances(
  expenses: Expense[],
  settlements: Settlement[],
  memberIds: [string, string]
): Balances {
  const [a, b] = memberIds;
  const out: Balances = {};
  const ensure = (currency: string) => {
    if (!out[currency]) out[currency] = { [a]: 0, [b]: 0 };
    return out[currency];
  };

  for (const e of expenses) {
    if (e.amount <= 0) continue;
    const other = e.paid_by === a ? b : a;
    // owed = the non-payer's share of the expense
    let owed: number;
    if (e.split_mode === "custom" && e.shares) {
      owed = Number(e.shares[other]) || 0;
    } else if (e.split_mode === "full") {
      owed = e.amount;
    } else {
      owed = e.amount / 2; // 'half'
    }
    if (owed <= 0) continue;
    const c = ensure(e.currency);
    c[e.paid_by] += owed;
    c[other] -= owed;
  }

  for (const s of settlements) {
    if (s.amount <= 0) continue;
    // settlement: from_member paid to_member `amount`,
    // so from_member's debt decreases (balance += amount),
    // to_member's owed-to amount decreases (balance -= amount)
    const c = ensure(s.currency);
    c[s.from_member] += s.amount;
    c[s.to_member] -= s.amount;
  }

  // drop currencies where both sides are exactly 0
  for (const cur of Object.keys(out)) {
    const c = out[cur];
    if (Math.abs(c[a]) < 0.005 && Math.abs(c[b]) < 0.005) delete out[cur];
  }

  return out;
}
