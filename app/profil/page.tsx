import { redirect } from "next/navigation";
import {
  requireCurrentMember,
  getActiveGroupMembers,
  getMemberGroups,
  getCurrentGroup,
  getPuzzlePattern,
} from "@/lib/dal";
import { db } from "@/lib/supabase";
import { AppHeader } from "@/components/app-header";
import { SettingsClient } from "@/components/settings-client";
import { LogoutLargeButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const [me, members, myGroups, activeGroup, pattern] = await Promise.all([
    requireCurrentMember(),
    getActiveGroupMembers(),
    getMemberGroups(),
    getCurrentGroup(),
    getPuzzlePattern(),
  ]);

  // profil is always in the context of the active group
  if (!activeGroup) redirect("/select-group");

  // figure out my role in active group for the gruplarım UI
  const { data: gm } = await db
    .from("group_members")
    .select("role")
    .eq("group_id", activeGroup.id)
    .eq("member_id", me.id)
    .maybeSingle();
  const myRole: "owner" | "member" | null =
    (gm?.role as "owner" | "member" | null) ?? null;

  return (
    <>
      <AppHeader member={me} title="profil" />
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 pb-32">
        <SettingsClient
          members={members}
          currentMemberId={me.id}
          activeGroup={activeGroup}
          myGroups={myGroups}
          myRole={myRole}
          currentPatternLength={pattern.length}
        />
        <div className="mt-8">
          <LogoutLargeButton />
        </div>
        <p
          className="text-center mt-8 text-[0.72rem]"
          style={{ color: "var(--text-dim)" }}
        >
          ikimize özel · 2026
        </p>
      </main>
    </>
  );
}
