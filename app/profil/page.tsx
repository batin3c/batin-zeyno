import { redirect } from "next/navigation";
import {
  requireCurrentMember,
  getActiveGroupMembers,
  getMemberGroups,
  getCurrentGroup,
} from "@/lib/dal";
import { db } from "@/lib/supabase";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SettingsClient } from "@/components/settings-client";
import { LogoutLargeButton } from "@/components/logout-button";
import { BioEditor } from "@/components/bio-editor";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const [me, members, myGroups, activeGroup] = await Promise.all([
    requireCurrentMember(),
    getActiveGroupMembers(),
    getMemberGroups(),
    getCurrentGroup(),
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
        <section
          className="flex flex-col gap-3 mb-6 p-4"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--ink)",
            borderRadius: "20px",
            boxShadow: "var(--shadow-pop)",
          }}
        >
          <BioEditor initialBio={me.bio} />
          <Link
            href={`/u/${me.id}`}
            className="flex items-center justify-center gap-1.5 text-[0.85rem] font-semibold"
            style={{
              padding: "0.55rem 0.9rem",
              background: "var(--accent-3-soft)",
              border: "2px solid var(--ink)",
              borderRadius: 999,
              color: "var(--ink)",
            }}
          >
            <ExternalLink size={13} strokeWidth={2.5} />
            herkesin gördüğü profile bak
          </Link>
        </section>
        <SettingsClient
          members={members}
          currentMemberId={me.id}
          activeGroup={activeGroup}
          myGroups={myGroups}
          myRole={myRole}
        />
        <div className="mt-8">
          <LogoutLargeButton />
        </div>
        <p
          className="text-center mt-8 text-[0.72rem]"
          style={{ color: "var(--text-dim)" }}
        >
          gruplara özel · 2026
        </p>
      </main>
    </>
  );
}
