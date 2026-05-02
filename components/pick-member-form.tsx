"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { pickMember, createAccount } from "@/app/actions/auth";
import type { Member } from "@/lib/types";

type Mode = "list" | "create";

export function PickMemberForm({ members }: { members: Member[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(members.length === 0 ? "create" : "list");
  const [name, setName] = useState("");
  const router = useRouter();

  const pick = (id: string) => {
    if (pending) return;
    setPickedId(id);
    setError(null);
    startTransition(async () => {
      const r = await pickMember(id);
      if (r && !r.ok) {
        setError(r.error ?? "olmadı");
        setPickedId(null);
        return;
      }
      router.refresh();
    });
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("adın boş");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await createAccount(trimmed);
      if (r && !r.ok) {
        setError(r.error ?? "olmadı");
        return;
      }
      router.refresh();
    });
  };

  if (mode === "create") {
    return (
      <form onSubmit={create} className="flex flex-col gap-3 w-full">
        <label className="label" htmlFor="new-name">
          adın
        </label>
        <input
          id="new-name"
          className="field-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="batın"
          maxLength={40}
          autoFocus
          disabled={pending}
        />
        {error && (
          <p className="text-[0.85rem]" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || name.trim().length === 0}
          className="btn-primary w-full justify-center"
          style={{ padding: "0.85rem 1.25rem" }}
        >
          {pending ? "açıyorum…" : "hesap aç"}
        </button>
        {members.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setMode("list");
              setError(null);
            }}
            className="text-sm font-medium underline decoration-2 underline-offset-4 self-center"
            style={{ color: "var(--text-muted)" }}
            disabled={pending}
          >
            mevcut hesaba gir
          </button>
        )}
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <ul className="flex flex-col gap-3 w-full">
        {members.map((m, idx) => {
          const isPicking = pickedId === m.id;
          return (
            <li
              key={m.id}
              className="anim-reveal"
              style={{ animationDelay: `${idx * 70}ms` }}
            >
              <button
                type="button"
                onClick={() => pick(m.id)}
                disabled={pending}
                className="w-full text-left flex items-center gap-3 transition-transform active:translate-x-[2px] active:translate-y-[2px] hover:-translate-x-[1px] hover:-translate-y-[1px] disabled:opacity-60"
                style={{
                  background: "var(--surface)",
                  border: "2px solid var(--ink)",
                  borderRadius: "16px",
                  padding: "0.9rem 1rem",
                  boxShadow: "var(--shadow-pop)",
                  cursor: pending ? "default" : "pointer",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    background: m.color ?? "var(--accent)",
                    border: "2px solid var(--ink)",
                    borderRadius: "999px",
                    flexShrink: 0,
                  }}
                />
                <span
                  className="font-semibold flex-1"
                  style={{ color: "var(--ink)", fontSize: "1.05rem" }}
                >
                  {m.name}
                </span>
                {isPicking && (
                  <span
                    className="text-[0.78rem]"
                    style={{ color: "var(--text-dim)" }}
                  >
                    geçiyor…
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {error && (
        <p className="text-[0.85rem] mt-1" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          setMode("create");
          setError(null);
        }}
        disabled={pending}
        className="btn-chip w-full justify-center mt-1"
        style={{ background: "var(--accent)", fontWeight: 700 }}
      >
        <Plus size={14} strokeWidth={2.5} /> yeni hesap aç
      </button>
    </div>
  );
}
