"use client";

import { ArrowRight } from "lucide-react";
import { symbolFor } from "@/lib/currency";
import type { Member } from "@/lib/types";

export function BalanceCard({
  balances,
  members,
  onSettle,
}: {
  balances: Record<string, Record<string, number>>;
  members: Member[];
  onSettle: (preset: {
    from_member: string;
    to_member: string;
    amount: number;
    currency: string;
  }) => void;
}) {
  const currencies = Object.keys(balances);
  const settled = currencies.length === 0;

  if (settled) {
    return (
      <div
        className="px-4 py-3 mt-4 anim-reveal"
        style={{
          background: "var(--accent-2-soft)",
          border: "2px solid var(--ink)",
          borderRadius: "16px",
          boxShadow: "var(--shadow-pop-sm)",
          fontWeight: 600,
          fontSize: "0.95rem",
        }}
      >
        ✓ ödeşmişiz
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-4 anim-reveal">
      {currencies.map((cur) => {
        const cMap = balances[cur];
        const memberIds = Object.keys(cMap);
        // pick the one with positive balance — they're owed money
        const creditor = memberIds.find((m) => cMap[m] > 0.005);
        const debtor = memberIds.find((m) => cMap[m] < -0.005);
        if (!creditor || !debtor) return null;
        const amount = cMap[creditor];
        const creditorMember = members.find((m) => m.id === creditor);
        const debtorMember = members.find((m) => m.id === debtor);
        return (
          <div
            key={cur}
            className="px-4 py-3 flex items-center justify-between gap-3"
            style={{
              background: "var(--accent-soft)",
              border: "2px solid var(--ink)",
              borderRadius: "16px",
              boxShadow: "var(--shadow-pop-sm)",
            }}
          >
            <div className="flex flex-col min-w-0">
              <div
                className="text-[0.92rem] font-semibold tracking-tight truncate"
                style={{ color: "var(--ink)" }}
              >
                {debtorMember?.name.toLowerCase() ?? "?"}{" "}
                <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
                  ↦
                </span>{" "}
                {creditorMember?.name.toLowerCase() ?? "?"}
              </div>
              <div
                className="font-bold mt-0.5"
                style={{ fontSize: "1.4rem", color: "var(--ink)", lineHeight: 1 }}
              >
                {symbolFor(cur)}
                {amount.toLocaleString("tr-TR", {
                  minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onSettle({
                  from_member: debtor,
                  to_member: creditor,
                  amount,
                  currency: cur,
                })
              }
              className="btn-chip flex-shrink-0"
              style={{ background: "var(--accent)", fontWeight: 700 }}
            >
              kapat <ArrowRight size={13} strokeWidth={2.5} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
