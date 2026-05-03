import Link from "next/link";
import type { Member } from "@/lib/types";

export function HeaderAvatar({ member }: { member: Member }) {
  const initial = (member.name?.[0] ?? "·").toUpperCase();
  const bg = member.color ?? "var(--accent-3)";
  return (
    <Link
      href="/profil"
      aria-label="profil"
      className="flex items-center justify-center transition-transform active:translate-x-[1px] active:translate-y-[1px]"
      style={{
        width: 36,
        height: 36,
        background: bg,
        color: "var(--ink)",
        border: "2px solid var(--ink)",
        borderRadius: "999px",
        boxShadow: "var(--shadow-pop-sm)",
        fontWeight: 700,
        fontSize: "0.95rem",
      }}
    >
      {initial}
    </Link>
  );
}
