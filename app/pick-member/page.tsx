import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { getSession } from "@/lib/dal";
import { PickMemberForm } from "@/components/pick-member-form";
import type { Member, Group } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PickMemberPage() {
  const session = await getSession();
  if (!session?.activeGroupId) redirect("/puzzle");
  if (session.memberId) redirect("/");

  const [{ data: group }, { data: links }] = await Promise.all([
    db
      .from("groups")
      .select("*")
      .eq("id", session.activeGroupId)
      .maybeSingle(),
    db
      .from("group_members")
      .select("members(*)")
      .eq("group_id", session.activeGroupId),
  ]);

  if (!group) redirect("/puzzle");
  const members = ((links ?? []) as unknown as { members: Member }[])
    .map((l) => l.members)
    .filter((m) => m && m.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <main className="flex-1 relative flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
      <div
        aria-hidden
        className="absolute bottom-[-4vh] right-[-2vw] page-numeral"
      >
        ?
      </div>
      <div className="absolute top-8 left-6 right-6 flex items-center justify-between pointer-events-none">
        <span className="label">{(group as Group).name?.toLowerCase()}</span>
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
            kendine tıkla
          </p>
        </div>
        <PickMemberForm members={members} />
      </div>
    </main>
  );
}
