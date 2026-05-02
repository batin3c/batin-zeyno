import type { Expense, Settlement } from "./types";

/**
 * Per-currency net balance per member.
 * Positive = the member is owed money. Negative = the member owes.
 * Sums per currency are always 0 in a closed system.
 */
export type Balances = Record<string, Record<string, number>>;

/**
 * One pair entry: "from owes to `amount` in `currency`". Always positive.
 * Use for rendering "X ↦ Y · 50€" rows.
 */
export type DebtPair = {
  from: string;
  to: string;
  amount: number;
  currency: string;
};

/**
 * Compute per-currency net balances for every member of a group.
 * Works for 1, 2, or N members.
 *
 * Split modes:
 *   - 'half' = expense is split evenly across all members (amount / N each).
 *     Non-payers each owe `amount / N` to the payer.
 *   - 'full' = the payer paid for everyone else; payer owes 0, each non-payer
 *     owes `amount / (N-1)` to the payer (so the total back to payer is amount).
 *     Edge case: N=1 → payer owes nothing, expense is just a record.
 *   - 'custom' = `shares` map dictates each member's portion. Non-payers owe
 *     their respective `shares[memberId]` to the payer.
 */
export function computeBalances(
  expenses: Expense[],
  settlements: Settlement[],
  memberIds: string[]
): Balances {
  const out: Balances = {};
  const ensure = (currency: string) => {
    if (!out[currency]) {
      out[currency] = Object.fromEntries(memberIds.map((id) => [id, 0]));
    }
    return out[currency];
  };

  const N = memberIds.length;

  for (const e of expenses) {
    if (e.amount <= 0) continue;
    if (!memberIds.includes(e.paid_by)) continue;
    const c = ensure(e.currency);

    if (e.split_mode === "custom" && e.shares) {
      // each member owes shares[id] to the payer
      for (const id of memberIds) {
        if (id === e.paid_by) continue;
        const owed = Number(e.shares[id]) || 0;
        if (owed <= 0) continue;
        c[e.paid_by] += owed;
        c[id] -= owed;
      }
    } else if (e.split_mode === "full") {
      // payer covered everyone else fully — split amount across non-payers
      if (N <= 1) continue;
      const each = e.amount / (N - 1);
      for (const id of memberIds) {
        if (id === e.paid_by) continue;
        c[e.paid_by] += each;
        c[id] -= each;
      }
    } else {
      // 'half' = even split across ALL members (including payer's own share)
      if (N <= 1) continue;
      const each = e.amount / N;
      for (const id of memberIds) {
        if (id === e.paid_by) continue;
        c[e.paid_by] += each;
        c[id] -= each;
      }
    }
  }

  for (const s of settlements) {
    if (s.amount <= 0) continue;
    if (!memberIds.includes(s.from_member) || !memberIds.includes(s.to_member)) continue;
    const c = ensure(s.currency);
    c[s.from_member] += s.amount;
    c[s.to_member] -= s.amount;
  }

  // drop currencies where every member nets to ~0
  for (const cur of Object.keys(out)) {
    const c = out[cur];
    if (memberIds.every((id) => Math.abs(c[id]) < 0.005)) delete out[cur];
  }

  return out;
}

/**
 * Convert a balance map into a minimal list of debt pairs per currency.
 * For 2 members it's trivially "debtor → creditor". For N members we use
 * a greedy match: largest creditor paired with largest debtor until all
 * balances net to zero. Output is flat: one DebtPair per pairwise debt.
 */
export function balancesToDebtPairs(balances: Balances): DebtPair[] {
  const pairs: DebtPair[] = [];
  for (const currency of Object.keys(balances)) {
    const entries = Object.entries(balances[currency]).filter(
      ([, v]) => Math.abs(v) >= 0.005
    );
    // separate into creditors (+) and debtors (-)
    const creditors = entries
      .filter(([, v]) => v > 0)
      .map(([id, v]) => ({ id, amount: v }))
      .sort((a, b) => b.amount - a.amount);
    const debtors = entries
      .filter(([, v]) => v < 0)
      .map(([id, v]) => ({ id, amount: -v }))
      .sort((a, b) => b.amount - a.amount);

    while (creditors.length > 0 && debtors.length > 0) {
      const cr = creditors[0];
      const db = debtors[0];
      const settle = Math.min(cr.amount, db.amount);
      pairs.push({
        from: db.id,
        to: cr.id,
        amount: Number(settle.toFixed(2)),
        currency,
      });
      cr.amount -= settle;
      db.amount -= settle;
      if (cr.amount < 0.005) creditors.shift();
      if (db.amount < 0.005) debtors.shift();
    }
  }
  return pairs;
}
