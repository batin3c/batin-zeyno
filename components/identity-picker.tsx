"use client";

import { useTransition } from "react";
import { pickIdentity } from "@/app/actions/auth";
import type { Member } from "@/lib/types";

export function IdentityPicker({ members }: { members: Member[] }) {
  const [pending, startTransition] = useTransition();

  const pick = (id: string) => {
    const fd = new FormData();
    fd.set("memberId", id);
    startTransition(() => pickIdentity(fd));
  };

  return (
    <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
      {members.map((m, idx) => (
        <button
          key={m.id}
          disabled={pending}
          onClick={() => pick(m.id)}
          className="group flex flex-col items-center gap-4 anim-reveal disabled:opacity-50 disabled:pointer-events-none"
          style={{ animationDelay: `${idx * 90}ms` }}
        >
          <div
            className="w-full aspect-square overflow-hidden transition-transform duration-300 group-hover:scale-[1.02] group-active:scale-[0.96]"
            style={{
              borderRadius: "18px",
              background: "var(--surface-2)",
              boxShadow:
                "0 1px 0 color-mix(in srgb, var(--text) 4%, transparent), 0 18px 40px -20px color-mix(in srgb, var(--text) 25%, transparent)",
            }}
          >
            {m.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.avatar_url}
                alt={m.name}
                className="w-full h-full object-cover transition-all duration-500 group-hover:saturate-110"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-5xl font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                {m.name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[1.05rem] font-medium tracking-tight text-[color:var(--text)]">
              {m.name}
            </span>
            <span
              className="label transition-colors group-hover:text-[color:var(--accent)]"
              style={{ fontSize: "0.6rem" }}
            >
              seç
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
