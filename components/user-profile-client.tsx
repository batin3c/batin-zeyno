"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { isoToFlag } from "@/lib/country-codes";
import { FeedCard } from "./feed-card";
import { FollowButton } from "./follow-button";
import { loadFeed } from "@/app/actions/posts";
import type {
  Member,
  FeedPost,
  VisitedCity,
  CityPhoto,
} from "@/lib/types";

type Tab = "posts" | "cities";

export function UserProfileClient({
  user,
  isMe,
  initialFollowing,
  followers,
  following,
  initialPosts,
  initialCursor,
  publicCities,
  publicCityPhotos,
  currentMemberId,
}: {
  user: Pick<
    Member,
    "id" | "name" | "surname" | "color" | "bio" | "created_at"
  >;
  isMe: boolean;
  initialFollowing: boolean;
  followers: number;
  following: number;
  initialPosts: FeedPost[];
  initialCursor: string | null;
  publicCities: VisitedCity[];
  publicCityPhotos: CityPhoto[];
  currentMemberId: string;
}) {
  const [tab, setTab] = useState<Tab>("posts");
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [followerCount, setFollowerCount] = useState(followers);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (tab !== "posts") return;
    const el = sentinelRef.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && cursor && !loadingMore) {
            setLoadingMore(true);
            loadFeed({ authorId: user.id, cursor }).then((r) => {
              setPosts((arr) => [...arr, ...r.posts]);
              setCursor(r.nextCursor);
              setLoadingMore(false);
            });
            break;
          }
        }
      },
      { rootMargin: "300px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loadingMore, tab, user.id]);

  const onPostRemoved = (id: string) => {
    setPosts((arr) => arr.filter((p) => p.id !== id));
  };

  return (
    <main className="flex-1 max-w-3xl w-full mx-auto px-4 pt-5 pb-32">
      <section
        className="flex flex-col gap-3 p-5 mb-5"
        style={{
          background: "var(--surface)",
          border: "2px solid var(--ink)",
          borderRadius: "22px",
          boxShadow: "var(--shadow-pop)",
        }}
      >
        <div className="flex items-center gap-4">
          <Avatar member={user} size={64} />
          <div className="flex-1 min-w-0">
            <h1
              className="font-bold tracking-tight truncate"
              style={{ fontSize: "1.4rem", color: "var(--ink)" }}
            >
              {user.name.toLowerCase()}
              {user.surname ? ` ${user.surname.toLowerCase()}` : ""}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[0.85rem]" style={{ color: "var(--ink)" }}>
                <span style={{ fontWeight: 700 }}>{followerCount}</span>
                <span style={{ color: "var(--text-muted)" }}> takipçi</span>
              </span>
              <span className="text-[0.85rem]" style={{ color: "var(--ink)" }}>
                <span style={{ fontWeight: 700 }}>{following}</span>
                <span style={{ color: "var(--text-muted)" }}> takip</span>
              </span>
            </div>
          </div>
          {!isMe && (
            <FollowButton
              memberId={user.id}
              initialFollowing={initialFollowing}
              onChange={(f) =>
                setFollowerCount((n) => n + (f ? 1 : -1))
              }
            />
          )}
        </div>
        {user.bio && (
          <p
            className="text-[0.92rem] leading-relaxed whitespace-pre-wrap"
            style={{ color: "var(--text)" }}
          >
            {user.bio}
          </p>
        )}
      </section>

      <div className="flex gap-1.5 mb-4">
        <TabBtn active={tab === "posts"} onClick={() => setTab("posts")}>
          paylaşımlar ({posts.length}
          {cursor ? "+" : ""})
        </TabBtn>
        <TabBtn active={tab === "cities"} onClick={() => setTab("cities")}>
          şehirler ({publicCities.length})
        </TabBtn>
      </div>

      {tab === "posts" ? (
        <div className="flex flex-col gap-5">
          {posts.length === 0 ? (
            <Empty
              icon="✏️"
              title="henüz paylaşım yok"
              body={
                isMe
                  ? "albüme git, bir şehri aç, 'akışta paylaş'a bas."
                  : "bu kullanıcı henüz bir şey paylaşmamış."
              }
            />
          ) : (
            <>
              {posts.map((p) => (
                <FeedCard
                  key={p.id}
                  post={p}
                  currentMemberId={currentMemberId}
                  onRemoved={onPostRemoved}
                />
              ))}
              {cursor && (
                <div ref={sentinelRef} className="py-4 text-center">
                  <span
                    className="text-[0.85rem]"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {loadingMore ? "yükleniyor…" : ""}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <CityGrid cities={publicCities} photos={publicCityPhotos} />
      )}
    </main>
  );
}

function CityGrid({
  cities,
  photos,
}: {
  cities: VisitedCity[];
  photos: CityPhoto[];
}) {
  if (cities.length === 0) {
    return (
      <Empty
        icon="🌍"
        title="topluluğa açık şehir yok"
        body="bu kullanıcı henüz hiçbir şehri herkese açmamış."
      />
    );
  }
  const photosByCity = new Map<string, CityPhoto[]>();
  for (const p of photos) {
    const arr = photosByCity.get(p.city_id) ?? [];
    arr.push(p);
    photosByCity.set(p.city_id, arr);
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {cities.map((c) => {
        const ps = photosByCity.get(c.id) ?? [];
        const first =
          (c.cover_photo_id
            ? ps.find((p) => p.id === c.cover_photo_id)
            : null) ?? ps[0];
        const flag = c.country_code ? isoToFlag(c.country_code) : "📍";
        return (
          <article
            key={c.id}
            className="overflow-hidden"
            style={{
              background: "var(--surface)",
              border: "2px solid var(--ink)",
              borderRadius: "16px",
              boxShadow: "var(--shadow-pop-sm)",
            }}
          >
            <div
              className="relative w-full aspect-square"
              style={{
                background: "var(--accent-3-soft)",
                borderBottom: "2px solid var(--ink)",
              }}
            >
              {first ? (
                <Image
                  src={first.url}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 50vw, 384px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin
                    size={28}
                    strokeWidth={2}
                    style={{ color: "var(--accent)" }}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-2">
              <span style={{ fontSize: "1.1rem" }}>{flag}</span>
              <span
                className="text-[0.92rem] font-bold tracking-tight truncate"
                style={{ color: "var(--ink)" }}
              >
                {c.name}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="btn-chip"
      style={{
        background: active ? "var(--accent)" : "var(--surface)",
        fontWeight: active ? 700 : 500,
      }}
    >
      {children}
    </button>
  );
}

function Empty({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div
      className="flex flex-col items-center text-center gap-2 max-w-sm mx-auto mt-6"
      style={{
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "20px",
        boxShadow: "var(--shadow-pop)",
        padding: "2rem 1.5rem",
      }}
    >
      <div style={{ fontSize: "2.4rem" }}>{icon}</div>
      <h3 className="font-bold" style={{ fontSize: "1.05rem", color: "var(--ink)" }}>
        {title}
      </h3>
      <p
        className="text-[0.88rem] leading-relaxed"
        style={{ color: "var(--text-muted)" }}
      >
        {body}
      </p>
    </div>
  );
}

function Avatar({
  member,
  size = 32,
}: {
  member: Pick<Member, "id" | "name" | "color">;
  size?: number;
}) {
  const initial = (member.name?.[0] ?? "·").toUpperCase();
  return (
    <span
      className="flex items-center justify-center font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: member.color ?? "var(--accent-3)",
        color: "var(--ink)",
        border: "2px solid var(--ink)",
        borderRadius: 999,
        fontSize: size * 0.4,
      }}
    >
      {initial}
    </span>
  );
}

