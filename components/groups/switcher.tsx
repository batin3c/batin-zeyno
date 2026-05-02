"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Check } from "lucide-react";
import { GroupColorDot } from "./group-color-dot";
import { switchGroup } from "@/app/actions/groups";
import type { Group } from "@/lib/types";

export function GroupSwitcher({
  activeGroup,
  myGroups,
}: {
  activeGroup: Group | null;
  myGroups: Group[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // No need to render switcher if user has only one group (or zero)
  if (!activeGroup || myGroups.length < 2) return null;

  const onPick = (id: string) => {
    if (id === activeGroup.id) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const r = await switchGroup(id);
      if (r.ok) {
        setOpen(false);
        router.push("/");
        router.refresh();
      }
    });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="flex items-center gap-1.5 transition-transform active:scale-[0.97] disabled:opacity-50"
        style={{
          background: "var(--surface)",
          border: "2px solid var(--ink)",
          borderRadius: "999px",
          padding: "0.35rem 0.7rem",
          boxShadow: "var(--shadow-pop-sm)",
          cursor: "pointer",
        }}
        aria-label="grubu değiştir"
        title={activeGroup.name}
      >
        <GroupColorDot color={activeGroup.color} size={10} />
        <span
          className="font-semibold tracking-tight max-w-[8rem] truncate"
          style={{ color: "var(--ink)", fontSize: "0.82rem" }}
        >
          {activeGroup.name}
        </span>
        <ChevronsUpDown size={12} strokeWidth={2} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-30 min-w-[14rem] flex flex-col gap-1 anim-bounce-in"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--ink)",
            borderRadius: "16px",
            boxShadow: "var(--shadow-pop)",
            padding: "0.4rem",
          }}
        >
          {myGroups.map((g) => {
            const isActive = g.id === activeGroup.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => onPick(g.id)}
                disabled={pending}
                className="text-left flex items-center gap-2.5 rounded-[10px] disabled:opacity-50"
                style={{
                  background: isActive
                    ? "var(--accent-soft)"
                    : "transparent",
                  padding: "0.55rem 0.7rem",
                  cursor: pending ? "wait" : "pointer",
                }}
              >
                <GroupColorDot color={g.color} size={10} />
                <span
                  className="flex-1 font-semibold truncate"
                  style={{ color: "var(--ink)", fontSize: "0.88rem" }}
                >
                  {g.name}
                </span>
                {isActive && <Check size={13} strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
