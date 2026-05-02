"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { computeBalances } from "@/lib/expenses";
import { symbolFor } from "@/lib/currency";
import { deleteExpense, deleteSettlement } from "@/app/actions/expenses";
import type {
  Expense,
  Location,
  Member,
  Settlement,
} from "@/lib/types";
import { BalanceCard } from "./balance-card";
import { AddExpenseDialog } from "./add-expense-dialog";
import {
  SettleUpDialog,
  type SettlementPreset,
} from "./settle-up-dialog";

type FeedItem =
  | { kind: "expense"; date: string; data: Expense }
  | { kind: "settlement"; date: string; data: Settlement };

export function ExpensesTab({
  tripId,
  members,
  currentMemberId,
  locations,
  expenses,
  settlements,
}: {
  tripId: string;
  members: Member[];
  currentMemberId: string;
  locations: Location[];
  expenses: Expense[];
  settlements: Settlement[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [settlePreset, setSettlePreset] = useState<SettlementPreset | null>(
    null
  );

  const memberIds: [string, string] | null = useMemo(() => {
    if (members.length < 2) return null;
    return [members[0].id, members[1].id];
  }, [members]);

  const balances = useMemo(() => {
    if (!memberIds) return {};
    return computeBalances(expenses, settlements, memberIds);
  }, [expenses, settlements, memberIds]);

  const feed: FeedItem[] = useMemo(() => {
    const out: FeedItem[] = [
      ...expenses.map(
        (e): FeedItem => ({
          kind: "expense",
          date: e.spent_at,
          data: e,
        })
      ),
      ...settlements.map(
        (s): FeedItem => ({
          kind: "settlement",
          date: s.settled_at,
          data: s,
        })
      ),
    ];
    out.sort((a, b) => b.date.localeCompare(a.date));
    return out;
  }, [expenses, settlements]);

  const memberById = (id: string) => members.find((m) => m.id === id);
  const locationById = (id: string | null) =>
    id ? locations.find((l) => l.id === id) : undefined;

  const startManualSettle = () => {
    if (!memberIds) return;
    setSettlePreset({
      from_member: currentMemberId,
      to_member:
        memberIds[0] === currentMemberId ? memberIds[1] : memberIds[0],
      amount: 0,
      currency: "EUR",
    });
  };

  if (members.length < 2) {
    return (
      <p
        className="text-center mt-8 text-[0.95rem]"
        style={{ color: "var(--text-muted)" }}
      >
        en az 2 üye gerekli.
      </p>
    );
  }

  return (
    <div className="pb-32">
      <BalanceCard
        balances={balances}
        members={members}
        onSettle={(p) => setSettlePreset(p)}
      />

      <div className="flex items-center justify-between mt-6 mb-3">
        <h2
          className="font-semibold tracking-tight"
          style={{ fontSize: "1.05rem", color: "var(--ink)" }}
        >
          hareketler
        </h2>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={startManualSettle}
            className="btn-chip"
            style={{ background: "var(--surface)" }}
          >
            ödeme yap
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="btn-chip"
            style={{ background: "var(--accent)", fontWeight: 700 }}
          >
            <Plus size={13} strokeWidth={2.5} /> harcama
          </button>
        </div>
      </div>

      {feed.length === 0 ? (
        <div
          className="flex flex-col items-center text-center gap-3 max-w-sm mx-auto mt-8 p-6"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--ink)",
            borderRadius: "20px",
            boxShadow: "var(--shadow-pop)",
          }}
        >
          <div style={{ fontSize: "2.5rem", lineHeight: 1 }}>💸</div>
          <p
            className="text-[0.95rem]"
            style={{ color: "var(--text-muted)" }}
          >
            henüz harcama yok. yukarıdan ekle.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {feed.map((it, i) =>
            it.kind === "expense" ? (
              <ExpenseRow
                key={`e-${it.data.id}`}
                e={it.data}
                index={i}
                paidBy={memberById(it.data.paid_by)}
                members={members}
                location={locationById(it.data.location_id) ?? undefined}
                tripId={tripId}
              />
            ) : (
              <SettlementRow
                key={`s-${it.data.id}`}
                s={it.data}
                index={i}
                fromMember={memberById(it.data.from_member)}
                toMember={memberById(it.data.to_member)}
                tripId={tripId}
              />
            )
          )}
        </div>
      )}

      {addOpen && (
        <AddExpenseDialog
          tripId={tripId}
          members={members}
          currentMemberId={currentMemberId}
          locations={locations}
          onClose={() => setAddOpen(false)}
        />
      )}
      {settlePreset && (
        <SettleUpDialog
          tripId={tripId}
          members={members}
          preset={settlePreset}
          onClose={() => setSettlePreset(null)}
        />
      )}
    </div>
  );
}

function ExpenseRow({
  e,
  index,
  paidBy,
  members,
  location,
  tripId,
}: {
  e: Expense;
  index: number;
  paidBy: Member | undefined;
  members: Member[];
  location: Location | undefined;
  tripId: string;
}) {
  const [, startTransition] = useTransition();
  const onDelete = () => {
    if (!confirm(`"${e.title}" silinsin mi?`)) return;
    startTransition(async () => {
      await deleteExpense(e.id, tripId);
    });
  };
  const splitLabel =
    e.split_mode === "half"
      ? "yarı yarı"
      : e.split_mode === "full"
      ? "karşı tam"
      : "özel";
  const customLine =
    e.split_mode === "custom" && e.shares
      ? members
          .map((m) => {
            const s = Number(e.shares?.[m.id] ?? 0);
            if (s <= 0) return null;
            return `${m.name.toLowerCase()} ${s.toLocaleString("tr-TR", {
              minimumFractionDigits: s % 1 === 0 ? 0 : 2,
              maximumFractionDigits: 2,
            })}`;
          })
          .filter(Boolean)
          .join(" · ")
      : null;
  return (
    <article
      className="anim-reveal flex items-center gap-3 p-3"
      style={{
        animationDelay: `${index * 30}ms`,
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "16px",
        boxShadow: "var(--shadow-pop-sm)",
      }}
    >
      <div
        className="flex items-center justify-center text-[1.2rem] shrink-0"
        style={{
          width: "44px",
          height: "44px",
          background: "var(--accent-3-soft)",
          border: "2px solid var(--ink)",
          borderRadius: "12px",
        }}
      >
        💸
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="font-semibold tracking-tight truncate"
          style={{ fontSize: "0.98rem", color: "var(--ink)" }}
        >
          {e.title}
        </div>
        <div
          className="text-[0.8rem] mt-0.5 truncate"
          style={{ color: "var(--text-muted)" }}
        >
          {paidBy?.name.toLowerCase() ?? "?"} ödedi · {splitLabel}
          {location && (
            <>
              {" · "}
              <span style={{ color: "var(--text)" }}>{location.name}</span>
            </>
          )}
        </div>
        {customLine && (
          <div
            className="text-[0.78rem] mt-0.5 truncate"
            style={{ color: "var(--text-dim)" }}
          >
            {customLine}
          </div>
        )}
        {e.note && (
          <div
            className="text-[0.78rem] mt-0.5 italic truncate"
            style={{ color: "var(--text-dim)" }}
          >
            {e.note}
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div
          className="font-bold"
          style={{ fontSize: "1.05rem", color: "var(--ink)", lineHeight: 1 }}
        >
          {symbolFor(e.currency)}
          {Number(e.amount).toLocaleString("tr-TR", {
            minimumFractionDigits: e.amount % 1 === 0 ? 0 : 2,
            maximumFractionDigits: 2,
          })}
        </div>
        <div
          className="text-[0.7rem] mt-0.5"
          style={{ color: "var(--text-dim)" }}
        >
          {formatDate(e.spent_at)}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="p-1 opacity-50 hover:opacity-100 shrink-0"
        style={{ color: "var(--text-muted)" }}
        aria-label="sil"
      >
        <Trash2 size={14} strokeWidth={2} />
      </button>
    </article>
  );
}

function SettlementRow({
  s,
  index,
  fromMember,
  toMember,
  tripId,
}: {
  s: Settlement;
  index: number;
  fromMember: Member | undefined;
  toMember: Member | undefined;
  tripId: string;
}) {
  const [, startTransition] = useTransition();
  const onDelete = () => {
    if (!confirm("bu ödeme silinsin mi?")) return;
    startTransition(async () => {
      await deleteSettlement(s.id, tripId);
    });
  };
  return (
    <article
      className="anim-reveal flex items-center gap-3 p-3"
      style={{
        animationDelay: `${index * 30}ms`,
        background: "var(--accent-2-soft)",
        border: "2px solid var(--ink)",
        borderRadius: "16px",
        boxShadow: "var(--shadow-pop-sm)",
      }}
    >
      <div
        className="flex items-center justify-center text-[1.2rem] shrink-0"
        style={{
          width: "44px",
          height: "44px",
          background: "var(--accent-2)",
          border: "2px solid var(--ink)",
          borderRadius: "12px",
        }}
      >
        ✓
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="font-semibold tracking-tight truncate"
          style={{ fontSize: "0.98rem", color: "var(--ink)" }}
        >
          {fromMember?.name.toLowerCase() ?? "?"} ↦{" "}
          {toMember?.name.toLowerCase() ?? "?"}
        </div>
        <div
          className="text-[0.8rem] mt-0.5"
          style={{ color: "var(--text-muted)" }}
        >
          ödeme yapıldı
        </div>
        {s.note && (
          <div
            className="text-[0.78rem] mt-0.5 italic truncate"
            style={{ color: "var(--text-dim)" }}
          >
            {s.note}
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div
          className="font-bold"
          style={{ fontSize: "1.05rem", color: "var(--ink)", lineHeight: 1 }}
        >
          {symbolFor(s.currency)}
          {Number(s.amount).toLocaleString("tr-TR", {
            minimumFractionDigits: s.amount % 1 === 0 ? 0 : 2,
            maximumFractionDigits: 2,
          })}
        </div>
        <div
          className="text-[0.7rem] mt-0.5"
          style={{ color: "var(--text-dim)" }}
        >
          {formatDate(s.settled_at)}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="p-1 opacity-50 hover:opacity-100 shrink-0"
        style={{ color: "var(--text-muted)" }}
        aria-label="sil"
      >
        <Trash2 size={14} strokeWidth={2} />
      </button>
    </article>
  );
}

function formatDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("tr-TR", { day: "numeric", month: "short" })
    .toLowerCase();
}
