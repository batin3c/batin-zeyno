import Link from "next/link";
import { db } from "@/lib/supabase";
import { PickMemberForm } from "@/components/pick-member-form";
import type { Member } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PickMemberPage() {
  const { data } = await db
    .from("members")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  const members = (data ?? []) as Member[];

  return (
    <main className="flex-1 relative flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
      <div
        aria-hidden
        className="absolute bottom-[-4vh] right-[-2vw] page-numeral"
      >
        ?
      </div>
      <div className="absolute top-8 left-6 right-6 flex items-center justify-between pointer-events-none">
        <span className="label">baze</span>
        <span className="label">kim?</span>
      </div>
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        <div className="text-center anim-reveal">
          <h1
            className="display leading-[1.0]"
            style={{ fontSize: "2.4rem", color: "var(--ink)" }}
          >
            kim girdi?
          </h1>
          <p
            className="mt-3 text-[0.9rem] font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            kendine tıkla, geç
          </p>
        </div>
        <PickMemberForm members={members} />
        <div
          className="w-full flex justify-center pt-3 mt-1"
          style={{ borderTop: "2px dashed var(--line-soft)" }}
        >
          <Link
            href="/katil"
            className="text-sm font-medium underline decoration-2 underline-offset-4"
            style={{ color: "var(--text-muted)" }}
          >
            davet kodum var
          </Link>
        </div>
      </div>
    </main>
  );
}
