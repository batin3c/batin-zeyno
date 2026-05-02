import { requireCurrentMember, getMembers, getPuzzlePattern } from "@/lib/dal";
import { AppHeader } from "@/components/app-header";
import { SettingsClient } from "@/components/settings-client";
import { LogoutLargeButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const me = await requireCurrentMember();
  const members = await getMembers();
  const pattern = await getPuzzlePattern();

  return (
    <>
      <AppHeader member={me} title="profil" />
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 pb-32">
        <SettingsClient
          members={members}
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
