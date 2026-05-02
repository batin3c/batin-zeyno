"use client";

import { useState, useTransition } from "react";
import { SimpleDialog } from "../simple-dialog";
import { CURRENCIES } from "@/lib/currency";
import { createExpense } from "@/app/actions/expenses";
import type { ExpenseSplitMode, Location, Member } from "@/lib/types";

export function AddExpenseDialog({
  tripId,
  members,
  currentMemberId,
  locations,
  onClose,
}: {
  tripId: string;
  members: Member[];
  currentMemberId: string;
  locations: Location[];
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [paidBy, setPaidBy] = useState(currentMemberId);
  const [splitMode, setSplitMode] = useState<ExpenseSplitMode>("half");
  const [spentAt, setSpentAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [locationId, setLocationId] = useState<string>("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const amt = parseFloat(amount);
    if (!title.trim() || !Number.isFinite(amt) || amt <= 0) return;
    startTransition(async () => {
      const r = await createExpense(tripId, {
        title: title.trim(),
        amount: amt,
        currency,
        paid_by: paidBy,
        split_mode: splitMode,
        spent_at: spentAt || null,
        note: note.trim() || null,
        location_id: locationId || null,
      });
      if (!r.ok) {
        setError(r.error ?? "olmadı aq");
        return;
      }
      onClose();
    });
  };

  return (
    <SimpleDialog open={true} onClose={onClose} title="harcama ekle">
      <div className="flex flex-col gap-5">
        <div>
          <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
            ne için
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="bilet, akşam yemeği, taksi…"
            className="field-input"
          />
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
            kim ödedi
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaidBy(m.id)}
                className="btn-chip"
                style={{
                  background:
                    paidBy === m.id ? "var(--accent-2)" : "var(--surface)",
                  fontWeight: paidBy === m.id ? 700 : 500,
                }}
              >
                {m.name.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
            nasıl bölüşelim
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSplitMode("half")}
              className="btn-chip"
              style={{
                background:
                  splitMode === "half" ? "var(--accent-2)" : "var(--surface)",
                fontWeight: splitMode === "half" ? 700 : 500,
              }}
            >
              yarı yarı
            </button>
            <button
              type="button"
              onClick={() => setSplitMode("full")}
              className="btn-chip"
              style={{
                background:
                  splitMode === "full" ? "var(--accent-2)" : "var(--surface)",
                fontWeight: splitMode === "full" ? 700 : 500,
              }}
            >
              karşı tam ödesin
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
              tarih
            </div>
            <input
              type="date"
              value={spentAt}
              onChange={(e) => setSpentAt(e.target.value)}
              className="field-input"
            />
          </div>
          {locations.length > 0 && (
            <div>
              <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
                yer (opsiyonel)
              </div>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="field-select"
              >
                <option value="">—</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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
          disabled={pending || !title.trim() || !amount.trim()}
          className="btn-primary w-full"
          style={{ padding: "0.95rem 1.25rem" }}
        >
          {pending ? "kayıt…" : "kaydet"}
        </button>
      </div>
    </SimpleDialog>
  );
}
