"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { Heart, MessageCircle, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { isoToFlag } from "@/lib/country-codes";
import { toggleReaction, deletePost } from "@/app/actions/posts";
import { CommentsAccordion } from "./comments-accordion";
import type { FeedPost } from "@/lib/types";

export function FeedCard({
  post,
  currentMemberId,
  onRemoved,
}: {
  post: FeedPost;
  currentMemberId: string;
  onRemoved?: (id: string) => void;
}) {
  const [reacted, setReacted] = useState(post.i_reacted);
  const [reactCount, setReactCount] = useState(post.reactions_count);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comments_count);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [, startTransition] = useTransition();

  const photos = post.snapshot.photo_urls ?? [];
  const flag = post.snapshot.country_code
    ? isoToFlag(post.snapshot.country_code)
    : null;
  const canDelete = post.author_id === currentMemberId;

  const onReact = () => {
    const next = !reacted;
    setReacted(next);
    setReactCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      const r = await toggleReaction(post.id);
      if (r.ok && typeof r.reacted === "boolean") {
        setReacted(r.reacted);
      }
    });
  };

  const onDelete = () => {
    if (!confirm("paylaşımı silmek istiyor musun?")) return;
    startTransition(async () => {
      const r = await deletePost(post.id);
      if (r.ok) onRemoved?.(post.id);
    });
  };

  return (
    <article
      className="overflow-hidden anim-reveal"
      style={{
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "22px",
        boxShadow: "var(--shadow-pop)",
      }}
    >
      <header className="flex items-center gap-3 px-4 pt-3.5 pb-3">
        <Link
          href={`/u/${post.author_id}`}
          className="flex items-center gap-2.5 flex-1 min-w-0"
        >
          <Avatar
            name={post.author.name}
            color={post.author.color}
            size={36}
          />
          <div className="flex flex-col min-w-0">
            <span
              className="text-[0.95rem] font-semibold truncate"
              style={{ color: "var(--ink)" }}
            >
              {post.author.name.toLowerCase()}
            </span>
            <span
              className="text-[0.75rem]"
              style={{ color: "var(--text-dim)" }}
            >
              {timeAgo(post.created_at)}
            </span>
          </div>
        </Link>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-1 opacity-50 hover:opacity-100"
            style={{ color: "var(--text-muted)" }}
            aria-label="sil"
          >
            <Trash2 size={15} strokeWidth={2} />
          </button>
        )}
      </header>

      {photos.length > 0 && (
        <div
          className="relative w-full aspect-[4/5] overflow-hidden"
          style={{
            background: "var(--bg)",
            borderTop: "2px solid var(--ink)",
            borderBottom: "2px solid var(--ink)",
          }}
        >
          <Image
            src={photos[photoIdx]}
            alt={post.snapshot.title}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            priority={false}
          />
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  background: "color-mix(in srgb, var(--bg) 80%, transparent)",
                  border: "1.5px solid var(--ink)",
                  borderRadius: 999,
                  color: "var(--ink)",
                }}
                aria-label="önceki"
              >
                <ChevronLeft size={18} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() =>
                  setPhotoIdx((i) => (i + 1) % photos.length)
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  background: "color-mix(in srgb, var(--bg) 80%, transparent)",
                  border: "1.5px solid var(--ink)",
                  borderRadius: 999,
                  color: "var(--ink)",
                }}
                aria-label="sonraki"
              >
                <ChevronRight size={18} strokeWidth={2.5} />
              </button>
              <div
                className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1"
                style={{ pointerEvents: "none" }}
              >
                {photos.map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background:
                        i === photoIdx ? "var(--ink)" : "rgba(255,255,255,0.7)",
                      border: "1px solid var(--ink)",
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
        <div className="flex items-baseline gap-2 flex-wrap">
          {flag && <span style={{ fontSize: "1.1rem" }}>{flag}</span>}
          <h3
            className="font-bold tracking-tight"
            style={{ fontSize: "1.05rem", color: "var(--ink)" }}
          >
            {post.snapshot.title}
          </h3>
          {post.snapshot.subtitle && (
            <span
              className="text-[0.82rem]"
              style={{ color: "var(--text-muted)" }}
            >
              {post.snapshot.subtitle}
            </span>
          )}
        </div>
        {post.caption && (
          <p
            className="text-[0.93rem] leading-relaxed whitespace-pre-wrap"
            style={{ color: "var(--text)" }}
          >
            {post.caption}
          </p>
        )}

        <div className="flex items-center gap-3 mt-1">
          <button
            type="button"
            onClick={onReact}
            className="flex items-center gap-1.5 transition-transform active:scale-95"
            style={{
              padding: "0.35rem 0.7rem",
              background: reacted ? "var(--accent-soft)" : "var(--surface)",
              border: "2px solid var(--ink)",
              borderRadius: 999,
              color: reacted ? "var(--accent)" : "var(--ink)",
              fontWeight: 700,
              fontSize: "0.85rem",
            }}
            aria-label="kalp at"
          >
            <Heart
              size={14}
              strokeWidth={2.5}
              fill={reacted ? "var(--accent)" : "none"}
            />
            {reactCount}
          </button>
          <button
            type="button"
            onClick={() => setCommentsOpen((v) => !v)}
            className="flex items-center gap-1.5"
            style={{
              padding: "0.35rem 0.7rem",
              background: commentsOpen ? "var(--accent-3-soft)" : "var(--surface)",
              border: "2px solid var(--ink)",
              borderRadius: 999,
              color: "var(--ink)",
              fontWeight: 700,
              fontSize: "0.85rem",
            }}
            aria-label="yorum"
          >
            <MessageCircle size={14} strokeWidth={2.5} />
            {commentCount}
          </button>
        </div>

        {commentsOpen && (
          <CommentsAccordion
            postId={post.id}
            postAuthorId={post.author_id}
            currentMemberId={currentMemberId}
            initialCount={commentCount}
            onCountChange={setCommentCount}
          />
        )}
      </div>
    </article>
  );
}

function Avatar({
  name,
  color,
  size = 32,
}: {
  name: string;
  color: string | null;
  size?: number;
}) {
  const initial = (name?.[0] ?? "·").toUpperCase();
  return (
    <span
      className="flex items-center justify-center font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: color ?? "var(--accent-3)",
        color: "var(--ink)",
        border: "2px solid var(--ink)",
        borderRadius: 999,
        fontSize: size * 0.45,
      }}
    >
      {initial}
    </span>
  );
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec} sn`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} dk`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} sa`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day} gün`;
  if (day < 30) return `${Math.floor(day / 7)} hf`;
  if (day < 365) return `${Math.floor(day / 30)} ay`;
  return `${Math.floor(day / 365)} yıl`;
}
