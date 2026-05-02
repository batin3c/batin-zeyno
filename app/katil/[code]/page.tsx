import Link from "next/link";
import { getCurrentMember } from "@/lib/dal";
import { db } from "@/lib/supabase";
import { JoinGroupConfirm } from "@/components/join-group-confirm";
import type { Group } from "@/lib/types";

export default async function JoinByCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode ?? "").trim().toUpperCase();

  // anonymous-friendly: a fresh visitor without a session can also land here
  // and create a member identity in one go via the join form
  const me = await getCurrentMember();

  const { data: group } = await db
    .from("groups")
    .select("*")
    .eq("invite_code", code)
    .maybeSingle();

  return (
    <main className="flex-1 relative flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
      <div
        aria-hidden
        className="absolute bottom-[-4vh] right-[-2vw] page-numeral"
      >
        Ⅳ
      </div>

      <div className="absolute top-8 left-6 right-6 flex items-center justify-between pointer-events-none">
        <span className="label">davet</span>
        <span className="label">{code || "—"}</span>
      </div>

      {group ? (
        <JoinGroupConfirm
          inviteCode={code}
          groupName={(group as Group).name}
          groupColor={(group as Group).color}
          needsMemberName={!me}
        />
      ) : (
        <div className="flex flex-col items-center gap-7 w-full max-w-sm anim-reveal">
          <div className="text-center">
            <h1
              className="display leading-[1.05]"
              style={{ fontSize: "2.4rem", color: "var(--ink)" }}
            >
              böyle bir grup yok
            </h1>
            <p
              className="mt-3 text-[0.9rem] font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              kod yanlış galiba — bir daha bak
            </p>
          </div>

          <div
            className="w-full text-center"
            style={{
              background: "var(--surface)",
              border: "2px solid var(--ink)",
              borderRadius: "20px",
              boxShadow: "var(--shadow-pop)",
              padding: "1.1rem",
              fontFamily:
                "var(--font-jetbrains, ui-monospace, monospace)",
              fontSize: "1.05rem",
              letterSpacing: "0.18em",
              color: "var(--text-muted)",
            }}
          >
            {code || "—"}
          </div>

          <div className="flex flex-col items-center gap-2">
            <Link href="/katil" className="btn-primary justify-center">
              başka kod gir
            </Link>
            <Link
              href="/select-group"
              className="text-sm font-medium underline decoration-2 underline-offset-4"
              style={{ color: "var(--text-muted)" }}
            >
              gruplarıma dön
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
