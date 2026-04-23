import Link from "next/link";
import { Settings, ArrowLeft } from "lucide-react";
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
    <header className="sticky top-0 z-20">
      <div
        className="relative"
        style={{
          background:
            "color-mix(in srgb, var(--paper) 92%, transparent)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3 max-w-3xl mx-auto">
          {back ? (
            <Link
              href={back}
              className="flex items-center gap-1.5 -ml-1 py-1 pr-2 label-mono hover:text-[color:var(--ink)] transition-colors"
              aria-label="Geri"
            >
              <ArrowLeft size={14} strokeWidth={1.5} />
              <span>geri</span>
            </Link>
          ) : (
            <Link
              href="/"
              className="label-mono -ml-1"
            >
              <span className="ink-highlight font-serif italic normal-case tracking-normal text-base text-[color:var(--ink)]">
                baze
              </span>
            </Link>
          )}
          <h1
            className={`flex-1 truncate text-center ${
              title
                ? "font-serif italic text-lg text-[color:var(--ink)]"
                : "font-mono text-xs uppercase tracking-[0.25em] opacity-0"
            }`}
          >
            {title ?? "baze"}
          </h1>
          <div className="flex items-center gap-1.5">
            {right}
            <Link
              href="/settings"
              className="p-2 text-[color:var(--ink-soft)] hover:text-[color:var(--ink)] transition-colors"
              aria-label="Ayarlar"
              title="Ayarlar"
            >
              <Settings size={17} strokeWidth={1.5} />
            </Link>
            <MemberChip member={member} />
            <LogoutButton />
          </div>
        </div>
        <div className="dashed-rule mx-4" />
      </div>
    </header>
  );
}

function MemberChip({ member }: { member: Member }) {
  const initial = member.name.slice(0, 1).toUpperCase();
  return (
    <div
      className="w-9 h-9 overflow-hidden flex items-center justify-center text-sm font-serif italic"
      style={{
        background: "var(--paper-soft)",
        border: "1px solid var(--faded)",
        color: "var(--ink)",
        transform: "rotate(-1.5deg)",
      }}
      title={member.name}
    >
      {member.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.avatar_url}
          alt={member.name}
          className="w-full h-full object-cover"
          style={{ filter: "sepia(0.08) saturate(0.9)" }}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
