import Link from "next/link";
import { Settings, ArrowLeft, Globe2 } from "lucide-react";
import type { Member } from "@/lib/types";
import { LogoutButton } from "./logout-button";

export function AppHeader({
  member,
  title,
  back,
  right,
}: {
  member: Member;
  title?: string;
  back?: string;
  right?: React.ReactNode;
}) {
  return (
    <header
      className="sticky top-0 z-20"
      style={{
        background: "var(--bg)",
        borderBottom: "2px solid var(--ink)",
      }}
    >
      <div className="flex items-center gap-1.5 px-4 h-16 max-w-3xl mx-auto">
        {back ? (
          <Link
            href={back}
            className="btn-icon"
            aria-label="siktir geri"
          >
            <ArrowLeft size={18} strokeWidth={2} />
          </Link>
        ) : (
          <Link
            href="/"
            className="font-bold tracking-tight px-1"
            style={{
              fontSize: "1.3rem",
              color: "var(--ink)",
              letterSpacing: "-0.03em",
            }}
          >
            baze
          </Link>
        )}

        <h1 className="flex-1 text-center text-[1rem] font-semibold tracking-tight truncate">
          {title ?? ""}
        </h1>

        <div className="flex items-center gap-1.5">
          {right}
          <Link
            href="/globe"
            className="btn-icon"
            aria-label="dünya"
            title="dünya"
          >
            <Globe2 size={18} strokeWidth={2} />
          </Link>
          <Link
            href="/settings"
            className="btn-icon"
            aria-label="Ayarlar"
            title="Ayarlar"
          >
            <Settings size={18} strokeWidth={2} />
          </Link>
          <MemberChip member={member} />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

function MemberChip({ member }: { member: Member }) {
  const initial = member.name.slice(0, 1).toUpperCase();
  return (
    <div
      className="w-10 h-10 overflow-hidden flex items-center justify-center text-[0.85rem] font-bold"
      style={{
        background: "var(--accent-3-soft)",
        color: "var(--ink)",
        border: "2px solid var(--ink)",
        borderRadius: "12px",
        boxShadow: "var(--shadow-pop-sm)",
      }}
      title={member.name}
    >
      {member.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.avatar_url}
          alt={member.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
