"use client";

import { useState, useTransition } from "react";
import { SimpleDialog } from "../simple-dialog";
import { CURRENCIES } from "@/lib/currency";
import { createSettlement } from "@/app/actions/expenses";
import type { Member } from "@/lib/types";

export type SettlementPreset = {
  from_member: string;
  to_member: string;
  amount: number;
  currency: string;
};

export function SettleUpDialog({
  tripId,
  members,
  preset,
  onClose,
}: {
  tripId: string;
  members: Member[];
  preset: SettlementPreset;
  onClose: () => void;
}) {
  const [from, setFrom] = useState(preset.from_member);
  const [to, setTo] = useState(preset.to_member);
  const [amount, setAmount] = useState(
    preset.amount.toFixed(preset.amount % 1 === 0 ? 0 : 2)
  );
  const [currency, setCurrency] = useState(preset.currency);
  const [settledAt, setSettledAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0 || from === to) return;
    startTransition(async () => {
      const r = await createSettlement(tripId, {
        from_member: from,
        to_member: to,
        amount: amt,
        currency,
        settled_at: settledAt || null,
        note: note.trim() || null,
      });
      if (!r.ok) {
        setError(r.error ?? "olmadı");
        return;
      }
      onClose();
    });
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <SimpleDialog open={true} onClose={onClose} title="hesap kapat">
      <div className="flex flex-col gap-5">
        <div>
          <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
            kim kime ödedi
          </div>
          <div className="flex items-center gap-2">
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="field-select flex-1"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name.toLowerCase()}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={swap}
              className="btn-chip"
              style={{ padding: "0.5rem 0.7rem" }}
              aria-label="ters çevir"
            >
              ↦
            </button>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="field-select flex-1"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name.toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
            tutar
          </div>
          <div className="flex gap-1">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="field-input flex-1"
              style={{ minWidth: 0 }}
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="field-select"
              style={{
                width: "auto",
                padding: "0.75rem 1.75rem 0.75rem 0.7rem",
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
            tarih
          </div>
          <input
            type="date"
            value={settledAt}
            onChange={(e) => setSettledAt(e.target.value)}
            className="field-input"
          />
        </div>

        <div>
          <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
            not
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="…"
            className="field-textarea"
          />
        </div>

        {error && (
          <p className="text-[0.85rem]" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}

        <button
          onClick={submit}
          disabled={pending || !amount.trim() || from === to}
          className="btn-primary w-full"
          style={{ padding: "0.95rem 1.25rem" }}
        >
          {pending ? "kayıt…" : "kapat"}
        </button>
      </div>
    </SimpleDialog>
  );
}
