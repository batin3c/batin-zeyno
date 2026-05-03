"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Trash2, Send } from "lucide-react";
import { addComment, deleteComment, loadComments } from "@/app/actions/posts";
import type { Member, PostComment } from "@/lib/types";

type CommentWithAuthor = PostComment & {
  author: Pick<Member, "id" | "name" | "surname" | "color">;
};

export function CommentsAccordion({
  postId,
  postAuthorId,
  currentMemberId,
  initialCount,
  onCountChange,
}: {
  postId: string;
  postAuthorId: string;
  currentMemberId: string;
  initialCount: number;
  onCountChange?: (n: number) => void;
}) {
  const [items, setItems] = useState<CommentWithAuthor[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadComments(postId).then((r) => {
      if (cancelled) return;
      setItems(r.comments);
      setLoaded(true);
      onCountChange?.(r.comments.length);
    });
    return () => {
      cancelled = true;
    };
    // intentionally no onCountChange in deps — parent keeps stable callback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    setError(null);
    startTransition(async () => {
      const r = await addComment(postId, body);
      if (!r.ok) {
        setError(r.error ?? "gönderilmedi");
        return;
      }
      if (r.comment) {
        // server returns the row but no joined author; synthesize from current
        const synthetic: CommentWithAuthor = {
          ...r.comment,
          author: {
            id: currentMemberId,
            name: "ben",
            surname: null,
            color: null,
          },
        };
        setItems((arr) => {
          const next = [...arr, synthetic];
          onCountChange?.(next.length);
          return next;
        });
        setDraft("");
        // refresh so the synthetic is replaced with the real author shape
        loadComments(postId).then((r2) => {
          setItems(r2.comments);
          onCountChange?.(r2.comments.length);
        });
      }
    });
  };

  const remove = (commentId: string) => {
    if (!confirm("yorum silinsin mi?")) return;
    startTransition(async () => {
      const r = await deleteComment(commentId);
      if (!r.ok) {
        setError(r.error ?? "silinemedi");
        return;
      }
      setItems((arr) => {
        const next = arr.filter((c) => c.id !== commentId);
        onCountChange?.(next.length);
        return next;
      });
    });
  };

  return (
    <div
      className="mt-3 pt-3 flex flex-col gap-2"
      style={{ borderTop: "1.5px dashed var(--line-soft)" }}
    >
      {!loaded && initialCount > 0 && (
        <p className="text-[0.85rem]" style={{ color: "var(--text-dim)" }}>
          yorumlar yükleniyor…
        </p>
      )}
      {loaded && items.length === 0 && (
        <p className="text-[0.85rem]" style={{ color: "var(--text-dim)" }}>
          ilk yorumu sen yaz.
        </p>
      )}
      {items.map((c) => {
        const canDelete =
          c.author_id === currentMemberId || postAuthorId === currentMemberId;
        return (
          <div key={c.id} className="flex items-start gap-2">
            <Avatar member={c.author} size={26} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span
                  className="text-[0.85rem] font-semibold"
                  style={{ color: "var(--ink)" }}
                >
                  {c.author.name.toLowerCase()}
                </span>
                <span
                  className="text-[0.72rem]"
                  style={{ color: "var(--text-dim)" }}
                >
                  {timeAgo(c.created_at)}
                </span>
              </div>
              <p
                className="text-[0.92rem] leading-relaxed whitespace-pre-wrap break-words"
                style={{ color: "var(--text)" }}
              >
                {c.body}
              </p>
            </div>
            {canDelete && (
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="p-1 opacity-50 hover:opacity-100"
                style={{ color: "var(--text-muted)" }}
                aria-label="sil"
              >
                <Trash2 size={13} strokeWidth={2} />
              </button>
            )}
          </div>
        );
      })}

      <div className="flex items-end gap-2 mt-1">
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={1}
          maxLength={500}
          placeholder="yorum yaz…"
          className="field-textarea flex-1"
          style={{ minHeight: "38px", padding: "0.55rem 0.8rem" }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button
          type="button"
          onClick={send}
          disabled={pending || draft.trim().length === 0}
          className="btn-primary"
          style={{ padding: "0.55rem 0.85rem" }}
          aria-label="gönder"
        >
          <Send size={14} strokeWidth={2.5} />
        </button>
      </div>
      {error && (
        <p className="text-[0.78rem]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function Avatar({
  member,
  size = 28,
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
        border: "1.5px solid var(--ink)",
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
