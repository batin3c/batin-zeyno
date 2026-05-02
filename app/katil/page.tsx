import Link from "next/link";
import { getCurrentMember, getMemberGroups } from "@/lib/dal";
import { JoinCodeForm } from "@/components/join-code-form";

export default async function JoinIndexPage() {
  // anonymous-friendly: someone with an invite code can land here without
  // having a session yet
  const me = await getCurrentMember();
  const groups = me ? await getMemberGroups() : [];
  const hasOtherGroups = groups.length > 0;

  return (
    <main className="flex-1 relative flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
      <div
        aria-hidden
        className="absolute bottom-[-4vh] left-[-2vw] page-numeral"
      >
        Ⅳ
      </div>

      <div className="absolute top-8 left-6 right-6 flex items-center justify-between pointer-events-none">
        <span className="label">gruba katıl</span>
        {me?.name && <span className="label">{me.name.toLowerCase()}</span>}
      </div>

      <div className="flex flex-col items-center gap-8 w-full max-w-sm anim-reveal">
        <div className="text-center">
          <h1
            className="display leading-[1.0]"
            style={{ fontSize: "2.4rem", color: "var(--ink)" }}
          >
            kod var mı?
          </h1>
          <p
            className="mt-3 text-[0.9rem] font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            6 harfli davet kodunu yapıştır
          </p>
        </div>

        <div
          className="w-full"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--ink)",
            borderRadius: "20px",
            boxShadow: "var(--shadow-pop)",
            padding: "1.25rem",
          }}
        >
          <JoinCodeForm />
        </div>

        <div className="flex flex-col items-center gap-2">
          <Link
            href="/yeni-grup"
            className="text-sm font-medium underline decoration-2 underline-offset-4"
            style={{ color: "var(--text-muted)" }}
          >
            yoksa kendin aç
          </Link>
          {hasOtherGroups && (
            <Link
              href="/select-group"
              className="text-sm font-medium underline decoration-2 underline-offset-4"
              style={{ color: "var(--text-muted)" }}
            >
              gruplarıma dön
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
