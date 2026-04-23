import { requireCurrentMember, getMembers, getPuzzlePattern } from "@/lib/dal";
import { AppHeader } from "@/components/app-header";
import { SettingsClient } from "@/components/settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await requireCurrentMember();
  const members = await getMembers();
  const pattern = await getPuzzlePattern();

  return (
    <>
      <AppHeader member={me} title="ayarlar" back="/" />
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 pb-16">
        <SettingsClient
          members={members}
          currentPatternLength={pattern.length}
        />
      </main>
    </>
  );
}
