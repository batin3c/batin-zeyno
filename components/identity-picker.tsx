"use client";

import { useTransition } from "react";
import { pickIdentity } from "@/app/actions/auth";
import type { Member } from "@/lib/types";

// deterministic tilt per member index so SSR + client agree
const TILTS = [-3.5, 2.8, -1.4, 3.2];

export function IdentityPicker({ members }: { members: Member[] }) {
  const [pending, startTransition] = useTransition();

  const pick = (id: string) => {
    const fd = new FormData();
    fd.set("memberId", id);
    startTransition(() => pickIdentity(fd));
  };

  return (
    <div className="grid grid-cols-2 gap-6 sm:gap-10 w-full max-w-lg">
      {members.map((m, idx) => (
        <Polaroid
          key={m.id}
          member={m}
          tilt={TILTS[idx % TILTS.length]}
          delay={idx * 120}
          disabled={pending}
          onPick={() => pick(m.id)}
        />
      ))}
    </div>
  );
}

function Polaroid({
  member,
  tilt,
  delay,
  disabled,
  onPick,
}: {
  member: Member;
  tilt: number;
  delay: number;
  disabled: boolean;
  onPick: () => void;
}) {
  return (
    <button
      onClick={onPick}
      disabled={disabled}
      className="group relative animate-rise disabled:opacity-60 disabled:pointer-events-none"
      style={{
        animationDelay: `${delay}ms`,
        transform: `rotate(${tilt}deg)`,
        transformOrigin: "center",
      }}
    >
      <div
        className="tape-top relative p-2.5 pb-3 flex flex-col items-stretch transition-transform duration-300 group-hover:rotate-0 group-active:scale-[0.97]"
        style={{
          background: "color-mix(in srgb, var(--paper) 98%, #fff)",
          boxShadow: `
            0 1px 0 rgba(0,0,0,0.05),
            0 8px 24px rgba(28,24,20,0.18),
            0 2px 6px rgba(28,24,20,0.1)
          `,
          transform: `rotate(${-tilt}deg)`,
          transformOrigin: "center",
        }}
      >
        <div className="aspect-[4/5] w-full overflow-hidden bg-[color:var(--paper-soft)] relative">
          {member.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.avatar_url}
              alt={member.name}
              className="w-full h-full object-cover saturate-[0.92] contrast-[1.02]"
              style={{
                filter: "sepia(0.08)",
              }}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center font-serif text-6xl"
              style={{ color: "var(--ink-soft)" }}
            >
              {member.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          {/* inner frame */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: "inset 0 0 0 1px rgba(28,24,20,0.08)",
            }}
          />
        </div>
        <div className="pt-3 pb-1 text-center">
          <div className="font-serif italic text-lg leading-none text-[color:var(--ink)]">
            {member.name}
          </div>
          <div className="mt-1.5 label-mono opacity-70">seç</div>
        </div>
      </div>
    </button>
  );
}
