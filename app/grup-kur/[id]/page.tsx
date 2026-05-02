import { db } from "@/lib/supabase";
import { GroupSetupForm } from "@/components/group-setup-form";
import type { Group, Member } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GrupKurPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: group } = await db
    .from("groups")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!group) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center gap-4">
        <h1
          className="display"
          style={{ fontSize: "2rem", color: "var(--ink)" }}
        >
          böyle bir grup yok
        </h1>
        <p className="text-[0.9rem]" style={{ color: "var(--text-muted)" }}>
          link bozuk olabilir.
        </p>
      </main>
    );
  }

  const groupTyped = group as Group;
  if (groupTyped.pattern_hash) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center gap-4">
        <h1
          className="display"
          style={{ fontSize: "2rem", color: "var(--ink)" }}
        >
          zaten kurulmuş
        </h1>
        <p className="text-[0.9rem]" style={{ color: "var(--text-muted)" }}>
          {groupTyped.name} grubunun şifresi belli. /puzzle&apos;a git, çiz, gir.
        </p>
        <a href="/puzzle" className="btn-primary">
          giriş yap
        </a>
      </main>
    );
  }

  const { data: links } = await db
    .from("group_members")
    .select("members(*)")
    .eq("group_id", id);
  const members = ((links ?? []) as unknown as { members: Member }[])
    .map((l) => l.members)
    .filter((m) => m && m.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <main className="flex-1 relative flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
      <div
        aria-hidden
        className="absolute bottom-[-4vh] left-[-2vw] page-numeral"
      >
        ◌
      </div>
      <div className="absolute top-8 left-6 right-6 flex items-center justify-between pointer-events-none">
        <span className="label">grup kur</span>
        <span className="label">{groupTyped.name?.toLowerCase()}</span>
      </div>
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        <div className="text-center anim-reveal">
          <h1
            className="display leading-[1.0]"
            style={{ fontSize: "2.4rem", color: "var(--ink)" }}
          >
            şifre belirle
          </h1>
          <p
            className="mt-3 text-[0.9rem] font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            bu grubun şifresi yok. çiz + sonra kim olduğunu seç.
          </p>
        </div>
        <GroupSetupForm groupId={id} members={members} />
      </div>
    </main>
  );
}
