"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { FeedCard } from "./feed-card";
import { loadFeed } from "@/app/actions/posts";
import type { FeedMode, FeedPost } from "@/lib/types";

export function FeedClient({
  initialPosts,
  initialCursor,
  initialMode,
  currentMemberId,
}: {
  initialPosts: FeedPost[];
  initialCursor: string | null;
  initialMode: FeedMode;
  currentMemberId: string;
}) {
  const [mode, setMode] = useState<FeedMode>(initialMode);
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [pending, startTransition] = useTransition();
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // refetch on tab change
  useEffect(() => {
    if (mode === initialMode) return;
    let cancelled = false;
    startTransition(async () => {
      const r = await loadFeed({ mode });
      if (cancelled) return;
      setPosts(r.posts);
      setCursor(r.nextCursor);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, initialMode]);

  // infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && cursor && !loadingMore) {
            setLoadingMore(true);
            loadFeed({ mode, cursor }).then((r) => {
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
  }, [cursor, mode, loadingMore]);

  const onRemoved = (id: string) => {
    setPosts((arr) => arr.filter((p) => p.id !== id));
  };

  return (
    <>
      <div className="max-w-3xl w-full mx-auto px-4 pt-3">
        <div className="flex gap-1.5">
          <TabBtn active={mode === "discover"} onClick={() => setMode("discover")}>
            keşfet
          </TabBtn>
          <TabBtn
            active={mode === "following"}
            onClick={() => setMode("following")}
          >
            takip
          </TabBtn>
        </div>
      </div>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 pt-4 pb-32 flex flex-col gap-5">
        {pending && posts.length === 0 ? (
          <p
            className="text-center text-[0.9rem] mt-8"
            style={{ color: "var(--text-dim)" }}
          >
            yükleniyor…
          </p>
        ) : posts.length === 0 ? (
          <EmptyState mode={mode} />
        ) : (
          <>
            {posts.map((p) => (
              <FeedCard
                key={p.id}
                post={p}
                currentMemberId={currentMemberId}
                onRemoved={onRemoved}
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
      </main>
    </>
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

function EmptyState({ mode }: { mode: FeedMode }) {
  return (
    <div
      className="flex flex-col items-center text-center gap-3 mt-12 max-w-sm mx-auto"
      style={{
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "24px",
        boxShadow: "var(--shadow-pop)",
        padding: "2.5rem 1.5rem",
      }}
    >
      <div style={{ fontSize: "3rem" }}>{mode === "following" ? "👥" : "❤️"}</div>
      <h3
        className="font-bold tracking-tight"
        style={{ fontSize: "1.2rem", color: "var(--ink)" }}
      >
        {mode === "following" ? "kimse paylaşmamış" : "henüz paylaşım yok"}
      </h3>
      <p
        className="text-[0.9rem] leading-relaxed"
        style={{ color: "var(--text-muted)" }}
      >
        {mode === "following"
          ? "takip ettiklerin paylaşmaya başlayınca burada görünecek. keşfet sekmesini gez."
          : "albüme git, bir şehri aç, 'akışta paylaş'a bas."}
      </p>
    </div>
  );
}
