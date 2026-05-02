"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { requireCurrentMember } from "@/lib/dal";
import { notifyOthers } from "./push";
import type { ExpenseSplitMode } from "@/lib/types";

const CURRENCY_RE = /^[A-Z]{3}$/;

function clean(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

export async function createExpense(
  tripId: string,
  input: {
    title: string;
    amount: number;
    currency: string;
    paid_by: string;
    split_mode: ExpenseSplitMode;
    /** required when split_mode='custom': sum across members must equal `amount` */
    shares?: Record<string, number> | null;
    spent_at?: string | null;
    note?: string | null;
    location_id?: string | null;
  }
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireCurrentMember();
  const title = clean(input.title);
  const currency = clean(input.currency).toUpperCase();
  if (!tripId) return { ok: false, error: "trip yok" };
  if (!title) return { ok: false, error: "başlık boş" };
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "tutar geçersiz" };
  }
  if (!CURRENCY_RE.test(currency)) return { ok: false, error: "para birimi" };
  if (!input.paid_by) return { ok: false, error: "kim ödedi?" };
  if (
    input.split_mode !== "half" &&
    input.split_mode !== "full" &&
    input.split_mode !== "custom"
  ) {
    return { ok: false, error: "split mode" };
  }

  let shares: Record<string, number> | null = null;
  if (input.split_mode === "custom") {
    if (!input.shares || typeof input.shares !== "object") {
      return { ok: false, error: "özel bölüşüm boş" };
    }
    shares = {};
    let sum = 0;
    for (const [memberId, raw] of Object.entries(input.shares)) {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) {
        return { ok: false, error: "geçersiz pay" };
      }
      shares[memberId] = n;
      sum += n;
    }
    // tolerate small float errors
    if (Math.abs(sum - input.amount) > 0.01) {
      return {
        ok: false,
        error: `paylar toplamı (${sum.toFixed(2)}) tutarla (${input.amount}) eşleşmiyor`,
      };
    }
  }

  const { error } = await db.from("expenses").insert({
    trip_id: tripId,
    title,
    amount: input.amount,
    currency,
    paid_by: input.paid_by,
    split_mode: input.split_mode,
    shares,
    spent_at: input.spent_at && /^\d{4}-\d{2}-\d{2}$/.test(input.spent_at)
      ? input.spent_at
      : null,
    note: clean(input.note) || null,
    location_id: input.location_id || null,
    created_by: me.id,
  });
  if (error) return { ok: false, error: error.message };

  notifyOthers({
    title: `${me.name.toLowerCase()} harcama ekledi 💸`,
    body: `${title} · ${input.amount} ${currency}`,
    url: `/trips/${tripId}`,
    tag: `exp-${tripId}`,
  }).catch(() => {});

  revalidatePath(`/trips/${tripId}`);
  return { ok: true };
}

export async function deleteExpense(
  id: string,
  tripId: string
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  if (!id || !tripId) return { ok: false, error: "id yok" };
  const { error } = await db.from("expenses").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/trips/${tripId}`);
  return { ok: true };
}

export async function createSettlement(
  tripId: string,
  input: {
    from_member: string;
    to_member: string;
    amount: number;
    currency: string;
    settled_at?: string | null;
    note?: string | null;
  }
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireCurrentMember();
  const currency = clean(input.currency).toUpperCase();
  if (!tripId) return { ok: false, error: "trip yok" };
  if (!input.from_member || !input.to_member) {
    return { ok: false, error: "kim kime?" };
  }
  if (input.from_member === input.to_member) {
    return { ok: false, error: "aynı kişi" };
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "tutar geçersiz" };
  }
  if (!CURRENCY_RE.test(currency)) return { ok: false, error: "para birimi" };

  const { error } = await db.from("settlements").insert({
    trip_id: tripId,
    from_member: input.from_member,
    to_member: input.to_member,
    amount: input.amount,
    currency,
    settled_at: input.settled_at && /^\d{4}-\d{2}-\d{2}$/.test(input.settled_at)
      ? input.settled_at
      : null,
    note: clean(input.note) || null,
    created_by: me.id,
  });
  if (error) return { ok: false, error: error.message };

  notifyOthers({
    title: `${me.name.toLowerCase()} hesabı kapattı ✓`,
    body: `${input.amount} ${currency}`,
    url: `/trips/${tripId}`,
    tag: `settle-${tripId}`,
  }).catch(() => {});

  revalidatePath(`/trips/${tripId}`);
  return { ok: true };
}

export async function deleteSettlement(
  id: string,
  tripId: string
): Promise<{ ok: boolean; error?: string }> {
  await requireCurrentMember();
  if (!id || !tripId) return { ok: false, error: "id yok" };
  const { error } = await db.from("settlements").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/trips/${tripId}`);
  return { ok: true };
}
