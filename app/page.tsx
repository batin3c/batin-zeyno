import { requireCurrentMember } from "@/lib/dal";
import { AppHeader } from "@/components/app-header";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const me = await requireCurrentMember();
  // The globe view itself is rendered by <PersistentGlobe> in app/layout.tsx
  // — that way the three.js scene survives navigation between bottom-nav tabs
  // and feels instant on return. This page contributes only the header.
  return <AppHeader member={me} />;
}
