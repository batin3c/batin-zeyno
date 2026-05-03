"use client";

import { useState, useTransition } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { toggleFollow } from "@/app/actions/follows";

export function FollowButton({
  memberId,
  initialFollowing,
  onChange,
}: {
  memberId: string;
  initialFollowing: boolean;
  onChange?: (following: boolean) => void;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    const next = !following;
    setFollowing(next);
    onChange?.(next);
    startTransition(async () => {
      const r = await toggleFollow(memberId);
      if (r.ok && typeof r.following === "boolean") {
        setFollowing(r.following);
        onChange?.(r.following);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="flex items-center gap-1.5"
      style={{
        padding: "0.55rem 1rem",
        background: following ? "var(--surface)" : "var(--accent)",
        border: "2px solid var(--ink)",
        borderRadius: 999,
        color: "var(--ink)",
        fontWeight: 700,
        fontSize: "0.85rem",
        boxShadow: "var(--shadow-pop-sm)",
      }}
    >
      {following ? (
        <>
          <UserCheck size={14} strokeWidth={2.5} />
          takiptesin
        </>
      ) : (
        <>
          <UserPlus size={14} strokeWidth={2.5} />
          takip et
        </>
      )}
    </button>
  );
}
