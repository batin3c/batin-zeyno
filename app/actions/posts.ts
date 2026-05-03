"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase";
import { requireCurrentMember } from "@/lib/dal";
import { notifyMembers } from "./push";
import type {
  Post,
  PostComment,
  PostRefType,
  PostSnapshot,
  FeedPost,
  FeedMode,
  Member,
  Category,
} from "@/lib/types";

const FEED_PAGE = 20;

type CreatePostInput = {
  refType: PostRefType;
  refId: string;
  caption?: string | null;
  photoUrls?: string[];
};

/**
 * Build the snapshot the feed card renders from. Queries the live source row
 * and copies the fields we care about. Stored as jsonb so deleting the source
 * (which CASCADE-deletes the post anyway) doesn't leave broken cards.
 */
async function buildSnapshot(
  refType: PostRefType,
  refId: string,
  groupId: string,
  extraPhotoUrls: string[]
): Promise<{ snapshot: PostSnapshot } | { error: string }> {
  if (refType === "city") {
    const { data: city } = await db
      .from("visited_cities")
      .select("name, country_code, group_id")
      .eq("id", refId)
      .maybeSingle();
    if (!city || city.group_id !== groupId) return { error: "yetkisiz" };
    const { data: photos } = await db
      .from("city_photos")
      .select("url")
      .eq("city_id", refId)
      .order("added_at", { ascending: false })
      .limit(10);
    const dbUrls = (photos ?? []).map((p) => p.url as string);
    const photo_urls = extraPhotoUrls.length > 0 ? extraPhotoUrls : dbUrls;
    return {
      snapshot: {
        title: city.name as string,
        country_code: (city.country_code as string | null) ?? null,
        photo_urls: photo_urls.slice(0, 10),
      },
    };
  }

  if (refType === "location") {
    const { data: loc } = await db
      .from("locations")
      .select(
        "name, address, photo_urls, google_photo_urls, trip_id, category, rating, lat, lng"
      )
      .eq("id", refId)
      .maybeSingle();
    if (!loc) return { error: "yer yok" };
    let tripName: string | null = null;
    if (loc.trip_id) {
      const { data: trip } = await db
        .from("trips")
        .select("name, group_id")
        .eq("id", loc.trip_id)
        .maybeSingle();
      if (!trip || trip.group_id !== groupId) return { error: "yetkisiz" };
      tripName = trip.name as string;
    }
    // best-effort city resolution: nearest visited_city in the same group by
    // bounding box (~30km). cheap heuristic, no PostGIS.
    let cityName: string | null = null;
    let cityCountry: string | null = null;
    if (typeof loc.lat === "number" && typeof loc.lng === "number") {
      const { data: nearby } = await db
        .from("visited_cities")
        .select("name, country_code, lat, lng")
        .eq("group_id", groupId)
        .gte("lat", (loc.lat as number) - 0.3)
        .lte("lat", (loc.lat as number) + 0.3)
        .gte("lng", (loc.lng as number) - 0.3)
        .lte("lng", (loc.lng as number) + 0.3)
        .limit(1);
      if (nearby && nearby[0]) {
        cityName = nearby[0].name as string;
        cityCountry = (nearby[0].country_code as string | null) ?? null;
      }
    }
    const dbUrls = [
      ...((loc.photo_urls as string[] | null) ?? []),
      ...((loc.google_photo_urls as string[] | null) ?? []),
    ];
    const photo_urls = extraPhotoUrls.length > 0 ? extraPhotoUrls : dbUrls;
    return {
      snapshot: {
        title: loc.name as string,
        subtitle: (loc.address as string | null) ?? null,
        country_code: cityCountry,
        photo_urls: photo_urls.slice(0, 10),
        category: (loc.category as Category | null) ?? null,
        rating: (loc.rating as number | null) ?? null,
        city_name: cityName,
        trip_name: tripName,
      },
    };
  }

  // trip
  const { data: trip } = await db
    .from("trips")
    .select(
      "name, cover_url, group_id, description, start_date, end_date"
    )
    .eq("id", refId)
    .maybeSingle();
  if (!trip || trip.group_id !== groupId) return { error: "yetkisiz" };
  const photo_urls =
    extraPhotoUrls.length > 0
      ? extraPhotoUrls
      : trip.cover_url
        ? [trip.cover_url as string]
        : [];

  // count locations + distinct cities (via lat/lng dedupe by visited_cities
  // proximity isn't worth it — just count locations and distinct trip-tagged
  // cities)
  const [{ count: locCount }, { data: cityRows }] = await Promise.all([
    db
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", refId),
    db
      .from("visited_cities")
      .select("id")
      .eq("group_id", groupId)
      .eq("trip_id", refId),
  ]);
  const desc = trip.description as string | null;
  const trimmedDesc =
    desc && desc.length > 140 ? desc.slice(0, 140).trimEnd() + "…" : desc;

  // try to infer a country flag from any tagged city
  let tripCountry: string | null = null;
  if (cityRows && cityRows.length > 0) {
    const { data: oneCity } = await db
      .from("visited_cities")
      .select("country_code")
      .eq("id", cityRows[0].id as string)
      .maybeSingle();
    tripCountry = (oneCity?.country_code as string | null) ?? null;
  }

  return {
    snapshot: {
      title: trip.name as string,
      country_code: tripCountry,
      photo_urls: photo_urls.slice(0, 10),
      description: trimmedDesc ?? null,
      start_date: (trip.start_date as string | null) ?? null,
      end_date: (trip.end_date as string | null) ?? null,
      location_count: locCount ?? 0,
      city_count: cityRows?.length ?? 0,
    },
  };
}

export async function createPost(
  input: CreatePostInput
): Promise<{ ok: boolean; postId?: string; error?: string }> {
  const me = await requireCurrentMember();
  // active group is implied by the source row's group_id
  if (!input?.refType || !input?.refId) {
    return { ok: false, error: "kaynak yok" };
  }
  const caption =
    typeof input.caption === "string" ? input.caption.trim() : null;
  if (caption && caption.length > 500) {
    return { ok: false, error: "açıklama çok uzun" };
  }
  const photoUrls = Array.isArray(input.photoUrls)
    ? input.photoUrls.filter(
        (u): u is string => typeof u === "string" && u.length > 0
      )
    : [];
  if (photoUrls.length > 10) {
    return { ok: false, error: "max 10 foto" };
  }

  // resolve the group via the source row — caller's active group must match
  let sourceGroupId: string | null = null;
  if (input.refType === "city") {
    const { data } = await db
      .from("visited_cities")
      .select("group_id")
      .eq("id", input.refId)
      .maybeSingle();
    sourceGroupId = (data?.group_id as string | null) ?? null;
  } else if (input.refType === "location") {
    const { data } = await db
      .from("locations")
      .select("trip_id")
      .eq("id", input.refId)
      .maybeSingle();
    if (data?.trip_id) {
      const { data: trip } = await db
        .from("trips")
        .select("group_id")
        .eq("id", data.trip_id)
        .maybeSingle();
      sourceGroupId = (trip?.group_id as string | null) ?? null;
    }
  } else {
    const { data } = await db
      .from("trips")
      .select("group_id")
      .eq("id", input.refId)
      .maybeSingle();
    sourceGroupId = (data?.group_id as string | null) ?? null;
  }
  if (!sourceGroupId) return { ok: false, error: "kaynak bulunamadı" };

  // verify caller is a member of that group
  const { data: gm } = await db
    .from("group_members")
    .select("member_id")
    .eq("group_id", sourceGroupId)
    .eq("member_id", me.id)
    .maybeSingle();
  if (!gm) return { ok: false, error: "bu grupta değilsin" };

  const built = await buildSnapshot(
    input.refType,
    input.refId,
    sourceGroupId,
    photoUrls
  );
  if ("error" in built) return { ok: false, error: built.error };

  const row: {
    author_id: string;
    group_id: string;
    caption: string | null;
    ref_type: PostRefType;
    snapshot: PostSnapshot;
    city_id?: string;
    location_id?: string;
    trip_id?: string;
  } = {
    author_id: me.id,
    group_id: sourceGroupId,
    caption,
    ref_type: input.refType,
    snapshot: built.snapshot,
  };
  if (input.refType === "city") row.city_id = input.refId;
  else if (input.refType === "location") row.location_id = input.refId;
  else row.trip_id = input.refId;

  const { data: created, error } = await db
    .from("posts")
    .insert(row)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/akis");
  return { ok: true, postId: created.id as string };
}

export async function deletePost(
  postId: string
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireCurrentMember();
  if (!postId) return { ok: false, error: "id yok" };
  // RLS-bypassed service role, so enforce author ownership in the predicate
  const { error } = await db
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", me.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/akis");
  return { ok: true };
}

export async function toggleReaction(
  postId: string
): Promise<{ ok: boolean; reacted?: boolean; error?: string }> {
  const me = await requireCurrentMember();
  if (!postId) return { ok: false, error: "id yok" };
  const { data: existing } = await db
    .from("post_reactions")
    .select("post_id")
    .eq("post_id", postId)
    .eq("member_id", me.id)
    .maybeSingle();
  if (existing) {
    const { error } = await db
      .from("post_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("member_id", me.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/akis");
    return { ok: true, reacted: false };
  }
  const { error } = await db
    .from("post_reactions")
    .insert({ post_id: postId, member_id: me.id });
  if (error) return { ok: false, error: error.message };

  // notify the post author (skip self-likes)
  const { data: post } = await db
    .from("posts")
    .select("author_id, snapshot")
    .eq("id", postId)
    .maybeSingle();
  if (post && post.author_id !== me.id) {
    const snap = post.snapshot as PostSnapshot;
    notifyMembers([post.author_id as string], {
      title: `${me.name.toLowerCase()} kalp attı ❤️`,
      body: snap.title,
      url: `/akis`,
      tag: `react-${postId}`,
    }).catch(() => {});
  }
  revalidatePath("/akis");
  return { ok: true, reacted: true };
}

export async function addComment(
  postId: string,
  body: string
): Promise<{ ok: boolean; comment?: PostComment; error?: string }> {
  const me = await requireCurrentMember();
  const clean = (body ?? "").trim();
  if (!postId) return { ok: false, error: "id yok" };
  if (clean.length === 0) return { ok: false, error: "yorum boş" };
  if (clean.length > 500) return { ok: false, error: "yorum çok uzun" };
  const { data: created, error } = await db
    .from("post_comments")
    .insert({ post_id: postId, author_id: me.id, body: clean })
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };

  // notify post author + previous distinct commenters (excluding self)
  const { data: post } = await db
    .from("posts")
    .select("author_id, snapshot")
    .eq("id", postId)
    .maybeSingle();
  if (post) {
    const { data: prevs } = await db
      .from("post_comments")
      .select("author_id")
      .eq("post_id", postId);
    const recipients = new Set<string>();
    if (post.author_id) recipients.add(post.author_id as string);
    for (const r of prevs ?? []) {
      if (r.author_id) recipients.add(r.author_id as string);
    }
    recipients.delete(me.id);
    if (recipients.size > 0) {
      const snap = post.snapshot as PostSnapshot;
      const preview = clean.length > 60 ? clean.slice(0, 60) + "…" : clean;
      notifyMembers(Array.from(recipients), {
        title: `${me.name.toLowerCase()} yorum yazdı 💬`,
        body: `${snap.title} · ${preview}`,
        url: `/akis`,
        tag: `comment-${postId}`,
      }).catch(() => {});
    }
  }
  revalidatePath("/akis");
  return { ok: true, comment: created as PostComment };
}

export async function deleteComment(
  commentId: string
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireCurrentMember();
  if (!commentId) return { ok: false, error: "id yok" };
  // either the comment author OR the post author can delete
  const { data: c } = await db
    .from("post_comments")
    .select("author_id, post_id")
    .eq("id", commentId)
    .maybeSingle();
  if (!c) return { ok: false, error: "yorum yok" };
  let allowed = c.author_id === me.id;
  if (!allowed) {
    const { data: post } = await db
      .from("posts")
      .select("author_id")
      .eq("id", c.post_id as string)
      .maybeSingle();
    allowed = post?.author_id === me.id;
  }
  if (!allowed) return { ok: false, error: "yetkisiz" };
  const { error } = await db
    .from("post_comments")
    .delete()
    .eq("id", commentId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/akis");
  return { ok: true };
}

export async function loadFeed({
  cursor,
  mode = "discover",
  limit = FEED_PAGE,
  authorId,
}: {
  cursor?: string | null;
  mode?: FeedMode;
  limit?: number;
  /** when set, ignores mode and filters to a single author (for /u/[id]) */
  authorId?: string;
} = {}): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  const me = await requireCurrentMember();
  const take = Math.min(Math.max(limit, 1), 50);

  let q = db
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(take);

  if (cursor) q = q.lt("created_at", cursor);

  if (authorId) {
    q = q.eq("author_id", authorId);
  } else if (mode === "following") {
    const { data: follows } = await db
      .from("follows")
      .select("followed_id")
      .eq("follower_id", me.id);
    const ids = (follows ?? [])
      .map((f) => f.followed_id as string)
      .concat(me.id); // include own posts in following feed
    if (ids.length === 0) {
      return { posts: [], nextCursor: null };
    }
    q = q.in("author_id", ids);
  }

  const { data: rows } = await q;
  const posts = (rows ?? []) as Post[];
  if (posts.length === 0) return { posts: [], nextCursor: null };

  const ids = posts.map((p) => p.id);
  const authorIds = Array.from(new Set(posts.map((p) => p.author_id)));

  const [{ data: authors }, { data: reactions }, { data: comments }] =
    await Promise.all([
      db
        .from("members")
        .select("id, name, surname, color")
        .in("id", authorIds),
      db
        .from("post_reactions")
        .select("post_id, member_id")
        .in("post_id", ids),
      db
        .from("post_comments")
        .select("post_id")
        .in("post_id", ids),
    ]);

  const authorMap = new Map(
    ((authors ?? []) as Array<Pick<Member, "id" | "name" | "surname" | "color">>).map(
      (a) => [a.id, a]
    )
  );
  const reactCount = new Map<string, number>();
  const iReacted = new Set<string>();
  for (const r of (reactions ?? []) as Array<{
    post_id: string;
    member_id: string;
  }>) {
    reactCount.set(r.post_id, (reactCount.get(r.post_id) ?? 0) + 1);
    if (r.member_id === me.id) iReacted.add(r.post_id);
  }
  const commentCount = new Map<string, number>();
  for (const c of (comments ?? []) as Array<{ post_id: string }>) {
    commentCount.set(c.post_id, (commentCount.get(c.post_id) ?? 0) + 1);
  }

  const enriched: FeedPost[] = posts.map((p) => ({
    ...p,
    author:
      authorMap.get(p.author_id) ?? {
        id: p.author_id,
        name: "?",
        surname: null,
        color: null,
      },
    reactions_count: reactCount.get(p.id) ?? 0,
    comments_count: commentCount.get(p.id) ?? 0,
    i_reacted: iReacted.has(p.id),
  }));

  const last = posts[posts.length - 1];
  const nextCursor = posts.length === take ? last.created_at : null;
  return { posts: enriched, nextCursor };
}

export async function loadComments(
  postId: string
): Promise<{
  comments: Array<
    PostComment & { author: Pick<Member, "id" | "name" | "surname" | "color"> }
  >;
}> {
  await requireCurrentMember();
  if (!postId) return { comments: [] };
  const { data: rows } = await db
    .from("post_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  const comments = (rows ?? []) as PostComment[];
  if (comments.length === 0) return { comments: [] };
  const authorIds = Array.from(new Set(comments.map((c) => c.author_id)));
  const { data: authors } = await db
    .from("members")
    .select("id, name, surname, color")
    .in("id", authorIds);
  const map = new Map(
    ((authors ?? []) as Array<Pick<Member, "id" | "name" | "surname" | "color">>).map(
      (a) => [a.id, a]
    )
  );
  return {
    comments: comments.map((c) => ({
      ...c,
      author:
        map.get(c.author_id) ?? {
          id: c.author_id,
          name: "?",
          surname: null,
          color: null,
        },
    })),
  };
}
