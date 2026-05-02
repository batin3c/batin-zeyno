"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { pickMember } from "@/app/actions/auth";
import type { Member } from "@/lib/types";

export function PickMemberForm({ members }: { members: Member[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const router = useRouter();

  const pick = (id: string) => {
    if (pending) return;
    setPickedId(id);
    setError(null);
    startTransition(async () => {
      const r = await pickMember(id);
      // pickMember redirects on success, so the next line only runs on error
      if (r && !r.ok) {
        setError(r.error ?? "olmadı");
        setPickedId(null);
        return;
      }
      router.refresh();
    });
  };

  if (members.length === 0) {
    return (
      <p
        className="text-[0.9rem] text-center"
        style={{ color: "var(--text-muted)" }}
      >
        henüz hiç üye yok. aşağıdan yeni grup aç.
      </p>
    );
  }

  return (
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
      {error && (
        <li className="text-[0.85rem]" style={{ color: "var(--danger)" }}>
          {error}
        </li>
      )}
    </ul>
  );
}
