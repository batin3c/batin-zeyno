"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { joinGroup } from "@/app/actions/auth";

type Props = {
  inviteCode: string;
  groupName: string;
  groupColor: string | null;
  needsMemberName?: boolean;
};

export function JoinGroupConfirm({
  inviteCode,
  groupName,
  groupColor,
  needsMemberName = false,
}: Props) {
  const [memberName, setMemberName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const join = () => {
    if (needsMemberName && !memberName.trim()) {
      setError("adın boş");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await joinGroup({
        inviteCode,
        memberName: needsMemberName ? memberName.trim() : undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-sm anim-reveal">
      <div className="text-center">
        <p
          className="label mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          davet
        </p>
        <h1
          className="display leading-[1.05]"
          style={{ fontSize: "2.1rem", color: "var(--ink)" }}
        >
          {groupName}
          <br />
          <span style={{ fontSize: "1.4rem", color: "var(--text-muted)" }}>
            grubuna katılalım mı?
          </span>
        </h1>
      </div>

      <div
        className="w-full flex items-center justify-center gap-3"
        style={{
          background: "var(--surface)",
          border: "2px solid var(--ink)",
          borderRadius: "20px",
          boxShadow: "var(--shadow-pop)",
          padding: "1.4rem 1rem",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            background: groupColor ?? "var(--accent)",
            border: "2px solid var(--ink)",
            borderRadius: "999px",
            flexShrink: 0,
          }}
        />
        <span
          className="font-semibold"
          style={{ color: "var(--ink)", fontSize: "1.1rem" }}
        >
          {groupName}
        </span>
      </div>

      {needsMemberName && (
        <div className="w-full flex flex-col gap-2">
          <label className="label" htmlFor="join-name">
            adın
          </label>
          <input
            id="join-name"
            className="field-input"
            type="text"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            placeholder="adın"
            maxLength={40}
            disabled={pending}
            autoFocus
          />
        </div>
      )}

      {error && (
        <p
          className="text-sm anim-fade-in"
          style={{ color: "var(--danger)" }}
        >
          {error}
        </p>
      )}

      <div className="w-full flex flex-col gap-3">
        <button
          type="button"
          onClick={join}
          disabled={pending}
          className="btn-primary w-full justify-center"
        >
          {pending ? "katılıyorum..." : "katıl"}
        </button>
        <Link
          href="/"
          aria-disabled={pending}
          className="btn-chip w-full justify-center"
          style={{
            pointerEvents: pending ? "none" : undefined,
            opacity: pending ? 0.5 : 1,
          }}
        >
          vazgeç
        </Link>
      </div>
    </div>
  );
}
