"use client";

import { ArrowRight } from "lucide-react";
import { symbolFor } from "@/lib/currency";
import { balancesToDebtPairs, type Balances } from "@/lib/expenses";
import type { Member } from "@/lib/types";

export function BalanceCard({
  balances,
  members,
  onSettle,
}: {
  balances: Balances;
  members: Member[];
  onSettle: (preset: {
    from_member: string;
    to_member: string;
    amount: number;
    currency: string;
  }) => void;
}) {
  const pairs = balancesToDebtPairs(balances);

  if (pairs.length === 0) {
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

  const memberById = (id: string) => members.find((m) => m.id === id);

  return (
    <div className="flex flex-col gap-2 mt-4 anim-reveal">
      {pairs.map((p, i) => {
        const fromMember = memberById(p.from);
        const toMember = memberById(p.to);
        return (
          <div
            key={`${p.from}-${p.to}-${p.currency}-${i}`}
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
                {fromMember?.name.toLowerCase() ?? "?"}{" "}
                <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
                  ↦
                </span>{" "}
                {toMember?.name.toLowerCase() ?? "?"}
              </div>
              <div
                className="font-bold mt-0.5"
                style={{ fontSize: "1.4rem", color: "var(--ink)", lineHeight: 1 }}
              >
                {symbolFor(p.currency)}
                {p.amount.toLocaleString("tr-TR", {
                  minimumFractionDigits: p.amount % 1 === 0 ? 0 : 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onSettle({
                  from_member: p.from,
                  to_member: p.to,
                  amount: p.amount,
                  currency: p.currency,
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
