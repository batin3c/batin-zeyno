import { requireCurrentMember, requireActiveGroupId } from "@/lib/dal";
import { AppHeader } from "@/components/app-header";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const me = await requireCurrentMember();
  // Side-effect: redirect to /select-group if the user has no active group.
  // The persistent globe in layout.tsx requires an active group to render,
  // so the home tab demands one as a precondition.
  await requireActiveGroupId();
  // The globe view itself is rendered by <PersistentGlobe> in app/layout.tsx
  // — that way the three.js scene survives navigation between bottom-nav tabs
  // and feels instant on return. This page contributes only the header.
  return <AppHeader member={me} />;
}
