import { requireCurrentMember } from "@/lib/dal";
import { AppHeader } from "@/components/app-header";
import { FeedClient } from "@/components/feed-client";
import { loadFeed } from "@/app/actions/posts";

export const dynamic = "force-dynamic";

export default async function AkisPage() {
  const me = await requireCurrentMember();
  const { posts, nextCursor } = await loadFeed({ mode: "discover" });
  return (
    <>
      <AppHeader member={me} title="akış" />
      <FeedClient
        initialPosts={posts}
        initialCursor={nextCursor}
        initialMode="discover"
        currentMemberId={me.id}
      />
    </>
  );
}
