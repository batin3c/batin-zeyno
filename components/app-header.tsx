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
        background: "color-mix(in srgb, var(--bg) 88%, transparent)",
        backdropFilter: "blur(14px) saturate(140%)",
        WebkitBackdropFilter: "blur(14px) saturate(140%)",
        borderBottom: "1px solid var(--line-soft)",
      }}
    >
      <div className="flex items-center gap-2 px-4 h-14 max-w-3xl mx-auto">
        {back ? (
          <Link
            href={back}
            className="btn-icon -ml-2"
            aria-label="siktir geri"
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </Link>
        ) : (
          <Link
            href="/"
            className="-ml-1 px-1 text-[1rem] font-semibold tracking-tight"
          >
            baze
          </Link>
        )}

        <h1 className="flex-1 text-center text-[0.95rem] font-medium tracking-tight truncate">
          {title ?? ""}
        </h1>

        <div className="flex items-center gap-0.5">
          {right}
          <Link
            href="/globe"
            className="btn-icon"
            aria-label="dünya"
            title="dünya"
          >
            <Globe2 size={18} strokeWidth={1.5} />
          </Link>
          <Link
            href="/settings"
            className="btn-icon"
            aria-label="Ayarlar"
            title="Ayarlar"
          >
            <Settings size={18} strokeWidth={1.5} />
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
      className="w-8 h-8 overflow-hidden flex items-center justify-center text-[0.75rem] font-medium ml-1"
      style={{
        background: "var(--surface-2)",
        color: "var(--text)",
        borderRadius: "10px",
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
