import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import { requireCurrentMember } from "@/lib/dal";
import { AppHeader } from "@/components/app-header";
import { UserProfileClient } from "@/components/user-profile-client";
import { loadFeed } from "@/app/actions/posts";
import { isFollowing } from "@/app/actions/follows";
import type { Member, VisitedCity, CityPhoto } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const me = await requireCurrentMember();

  const { data: user } = await db
    .from("members")
    .select("id, name, surname, color, bio, created_at")
    .eq("id", memberId)
    .maybeSingle();
  if (!user) notFound();

  const isMe = user.id === me.id;

  const [
    { count: followers },
    { count: following },
    iFollow,
    feed,
    { data: publicCities },
  ] = await Promise.all([
    db
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("followed_id", user.id),
    db
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", user.id),
    isMe ? Promise.resolve(false) : isFollowing(user.id),
    loadFeed({ authorId: user.id }),
    db
      .from("visited_cities")
      .select("*")
      .eq("added_by", user.id)
      .eq("is_public", true)
      .order("added_at", { ascending: false }),
  ]);

  const cityIds = (publicCities ?? []).map((c) => c.id as string);
  let publicCityPhotos: CityPhoto[] = [];
  if (cityIds.length > 0) {
    const { data: ph } = await db
      .from("city_photos")
      .select("*")
      .in("city_id", cityIds)
      .order("added_at", { ascending: false });
    publicCityPhotos = (ph ?? []) as CityPhoto[];
  }

  return (
    <>
      <AppHeader member={me} title={user.name.toLowerCase()} back="/akis" />
      <UserProfileClient
        user={user as Pick<Member, "id" | "name" | "surname" | "color" | "bio" | "created_at">}
        isMe={isMe}
        initialFollowing={iFollow}
        followers={followers ?? 0}
        following={following ?? 0}
        initialPosts={feed.posts}
        initialCursor={feed.nextCursor}
        publicCities={(publicCities ?? []) as VisitedCity[]}
        publicCityPhotos={publicCityPhotos}
        currentMemberId={me.id}
      />
    </>
  );
}
