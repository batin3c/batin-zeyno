import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Member } from "@/lib/types";

export function AppHeader({
  title,
  back,
  right,
}: {
  member?: Member;
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
      <div className="flex items-center gap-2 px-4 h-16 max-w-3xl mx-auto">
        {back ? (
          <Link
            href={back}
            className="btn-icon"
            aria-label="geri"
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

        <div className="flex items-center gap-1.5 min-w-[40px] justify-end">
          {right}
        </div>
      </div>
    </header>
  );
}
