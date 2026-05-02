"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Settings as SettingsIcon,
  Copy,
  Check,
  ChevronsUpDown,
  Trash2,
  ArrowUp,
  Plus,
  RefreshCw,
} from "lucide-react";
import { SimpleDialog } from "../simple-dialog";
import { GroupColorDot } from "./group-color-dot";
import {
  switchGroup,
  leaveGroup,
  kickMember,
  promoteMember,
  joinGroupByCode,
  updateGroup,
  regenerateInviteCode,
} from "@/app/actions/groups";
import type { Group, Member } from "@/lib/types";

type Props = {
  activeGroup: Group | null;
  myGroups: Group[];
  members: Member[];
  myRole: "owner" | "member" | null;
  currentMemberId: string;
};

export function GroupSection({
  activeGroup,
  myGroups,
  members,
  myRole,
  currentMemberId,
}: Props) {
  const [joinOpen, setJoinOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Fallback empty state — shouldn't happen given auth flow
  if (!activeGroup) {
    return (
      <section>
        <h2 className="label mb-3 ml-0.5">gruplarım</h2>
        <div
          className="p-5 flex flex-col gap-3"
          style={{
            background: "var(--surface)",
            border: "2px solid var(--ink)",
            borderRadius: "20px",
            boxShadow: "var(--shadow-pop)",
          }}
        >
          <p
            className="text-[0.9rem] font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            henüz hiçbir grupta değilsin
          </p>
          <Link
            href="/yeni-grup"
            className="btn-primary justify-center"
            style={{ padding: "0.75rem 1rem" }}
          >
            yeni grup aç
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="label mb-3 ml-0.5">gruplarım</h2>

      <div className="flex flex-col gap-4">
        {/* Active group card */}
        <ActiveGroupCard
          group={activeGroup}
          isOwner={myRole === "owner"}
          canSwitch={myGroups.length > 1}
          onSwitchClick={() => setSwitchOpen(true)}
          onEditClick={() => setEditOpen(true)}
        />

        {/* Members list */}
        <MembersCard
          groupId={activeGroup.id}
          groupName={activeGroup.name}
          members={members}
          myRole={myRole}
          currentMemberId={currentMemberId}
        />

        {/* Bottom buttons */}
        <div className="flex gap-2">
          <Link
            href="/yeni-grup"
            className="btn-chip flex-1 justify-center"
            style={{ padding: "0.7rem 1rem" }}
          >
            <Plus size={14} strokeWidth={2.5} />
            yeni grup
          </Link>
          <button
            type="button"
            onClick={() => setJoinOpen(true)}
            className="btn-chip flex-1 justify-center"
            style={{ padding: "0.7rem 1rem" }}
          >
            gruba katıl
          </button>
        </div>
      </div>

      {switchOpen && (
        <SwitchDialog
          open={switchOpen}
          onClose={() => setSwitchOpen(false)}
          groups={myGroups}
          activeId={activeGroup.id}
        />
      )}
      {editOpen && (
        <EditGroupDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          group={activeGroup}
        />
      )}
      {joinOpen && (
        <JoinDialog open={joinOpen} onClose={() => setJoinOpen(false)} />
      )}
    </section>
  );
}

// ---------- Active group card ----------

function ActiveGroupCard({
  group,
  isOwner,
  canSwitch,
  onSwitchClick,
  onEditClick,
}: {
  group: Group;
  isOwner: boolean;
  canSwitch: boolean;
  onSwitchClick: () => void;
  onEditClick: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [leaveErr, setLeaveErr] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(group.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const doLeave = () => {
    setLeaveOpen(false);
    setLeaveErr(null);
    startTransition(async () => {
      const r = await leaveGroup(group.id);
      if (!r.ok) setLeaveErr(r.error ?? "olmadı");
    });
  };

  return (
    <div
      className="overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "20px",
        boxShadow: "var(--shadow-pop)",
      }}
    >
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <GroupColorDot color={group.color} size={14} />
          <h3
            className="flex-1 font-semibold tracking-tight truncate"
            style={{ fontSize: "1.05rem", color: "var(--ink)" }}
          >
            {group.name}
          </h3>
          {isOwner && (
            <button
              type="button"
              onClick={onEditClick}
              className="btn-icon"
              aria-label="grubu düzenle"
              title="grubu düzenle"
            >
              <SettingsIcon size={16} strokeWidth={2} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onCopy}
            className="pill flex items-center gap-1.5"
            style={{ cursor: "pointer" }}
            title="kodu kopyala"
          >
            <span style={{ color: "var(--text-muted)" }}>kod:</span>
            <span
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                letterSpacing: "0.08em",
                color: "var(--ink)",
              }}
            >
              {group.invite_code}
            </span>
            {copied ? (
              <Check size={12} strokeWidth={2.5} />
            ) : (
              <Copy size={12} strokeWidth={2} />
            )}
          </button>
          {copied && (
            <span
              className="text-[0.72rem] font-semibold"
              style={{ color: "var(--accent-3)" }}
            >
              kopyalandı
            </span>
          )}
          {canSwitch && (
            <button
              type="button"
              onClick={onSwitchClick}
              className="btn-chip"
              style={{ padding: "0.4rem 0.7rem", fontSize: "0.78rem" }}
            >
              <ChevronsUpDown size={12} strokeWidth={2} />
              değiştir
            </button>
          )}
        </div>
      </div>

      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{
          borderTop: "2px solid var(--ink)",
          background: "var(--surface-2)",
        }}
      >
        <button
          type="button"
          onClick={() => setLeaveOpen(true)}
          disabled={pending}
          className="text-[0.82rem] font-semibold disabled:opacity-50"
          style={{ color: "var(--danger)" }}
        >
          {pending ? "ayrılıyor…" : "ayrıl"}
        </button>
        {leaveErr && (
          <span
            className="text-[0.72rem] font-medium"
            style={{ color: "var(--danger)" }}
          >
            {leaveErr}
          </span>
        )}
      </div>
      {leaveOpen && (
        <ConfirmDialog
          title="gruptan ayrıl"
          body={`"${group.name}" grubundan ayrılmak istediğine emin misin?`}
          confirmLabel="ayrıl"
          onCancel={() => setLeaveOpen(false)}
          onConfirm={doLeave}
        />
      )}
    </div>
  );
}

// ---------- Reusable confirm dialog ----------

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <SimpleDialog open onClose={onCancel} title={title}>
      <p
        className="mb-5 text-[0.95rem] leading-relaxed"
        style={{ color: "var(--text)" }}
      >
        {body}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn-chip flex-1 justify-center"
          style={{ padding: "0.75rem 1rem" }}
        >
          vazgeç
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="btn-primary flex-1 justify-center"
          style={{
            padding: "0.75rem 1rem",
            background: "var(--danger)",
            color: "#fff",
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </SimpleDialog>
  );
}

// ---------- Members card ----------

function MembersCard({
  groupId,
  groupName,
  members,
  myRole,
  currentMemberId,
}: {
  groupId: string;
  groupName: string;
  members: Member[];
  myRole: "owner" | "member" | null;
  currentMemberId: string;
}) {
  return (
    <div
      className="overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "20px",
        boxShadow: "var(--shadow-pop)",
      }}
    >
      {members.map((m, i) => (
        <MemberRow
          key={m.id}
          member={m}
          last={i === members.length - 1}
          groupId={groupId}
          groupName={groupName}
          isOwnerView={myRole === "owner"}
          isMe={m.id === currentMemberId}
        />
      ))}
    </div>
  );
}

function MemberRow({
  member,
  last,
  groupId,
  groupName,
  isOwnerView,
  isMe,
}: {
  member: Member;
  last: boolean;
  groupId: string;
  groupName: string;
  isOwnerView: boolean;
  isMe: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [kickOpen, setKickOpen] = useState(false);
  // we don't get role per-member from the parent, so we approximate:
  // for the kick/promote actions the server still verifies. We render the
  // promote button on everyone except yourself; the action is idempotent.

  const doKick = () => {
    setKickOpen(false);
    setErr(null);
    startTransition(async () => {
      const r = await kickMember(groupId, member.id);
      if (!r.ok) setErr(r.error ?? "olmadı");
    });
  };

  const onPromote = () => {
    if (!confirm(`"${member.name}" owner yapılsın mı?`)) return;
    setErr(null);
    startTransition(async () => {
      const r = await promoteMember(groupId, member.id);
      if (!r.ok) setErr(r.error ?? "olmadı");
    });
  };

  return (
    <div
      className="flex items-center gap-3 p-4"
      style={{ borderBottom: last ? "none" : "2px solid var(--ink)" }}
    >
      <GroupColorDot color={member.color} size={12} />
      <span
        className="flex-1 font-semibold tracking-tight truncate"
        style={{ color: "var(--ink)", fontSize: "0.98rem" }}
      >
        {member.name}
        {isMe && (
          <span
            className="ml-1.5 text-[0.7rem] font-medium"
            style={{ color: "var(--text-dim)" }}
          >
            (sen)
          </span>
        )}
      </span>

      {isOwnerView && !isMe && (
        <>
          <button
            type="button"
            onClick={onPromote}
            disabled={pending}
            className="btn-icon"
            aria-label="owner yap"
            title="owner yap"
          >
            <ArrowUp size={14} strokeWidth={2.25} />
          </button>
          <button
            type="button"
            onClick={() => setKickOpen(true)}
            disabled={pending}
            className="btn-icon"
            aria-label="çıkar"
            title="çıkar"
            style={{ color: "var(--danger)" }}
          >
            <Trash2 size={14} strokeWidth={2.25} />
          </button>
        </>
      )}

      {err && (
        <span
          className="text-[0.72rem] font-medium"
          style={{ color: "var(--danger)" }}
        >
          {err}
        </span>
      )}
      {kickOpen && (
        <ConfirmDialog
          title="üyeyi çıkar"
          body={`"${member.name}" "${groupName}" grubundan çıkarılsın mı?`}
          confirmLabel="çıkar"
          onCancel={() => setKickOpen(false)}
          onConfirm={doKick}
        />
      )}
    </div>
  );
}

// ---------- Switch group dialog ----------

function SwitchDialog({
  open,
  onClose,
  groups,
  activeId,
}: {
  open: boolean;
  onClose: () => void;
  groups: Group[];
  activeId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const onPick = (id: string) => {
    if (id === activeId) {
      onClose();
      return;
    }
    setErr(null);
    startTransition(async () => {
      const r = await switchGroup(id);
      if (!r.ok) {
        setErr(r.error ?? "olmadı");
        return;
      }
      onClose();
      router.push("/");
      router.refresh();
    });
  };

  return (
    <SimpleDialog open={open} onClose={onClose} title="grubu değiştir">
      <div className="flex flex-col gap-2">
        {groups.map((g) => {
          const isActive = g.id === activeId;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onPick(g.id)}
              disabled={pending}
              className="w-full text-left flex items-center gap-3 transition-transform active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50"
              style={{
                background: isActive ? "var(--accent-soft)" : "var(--surface)",
                border: "2px solid var(--ink)",
                borderRadius: "14px",
                padding: "0.8rem 0.95rem",
                boxShadow: "var(--shadow-pop-sm)",
                cursor: pending ? "wait" : "pointer",
              }}
            >
              <GroupColorDot color={g.color} size={12} />
              <span
                className="flex-1 font-semibold truncate"
                style={{ color: "var(--ink)", fontSize: "1rem" }}
              >
                {g.name}
              </span>
              {isActive && (
                <span
                  className="text-[0.72rem] font-semibold"
                  style={{ color: "var(--text-muted)" }}
                >
                  aktif
                </span>
              )}
            </button>
          );
        })}
        {err && (
          <p
            className="text-[0.78rem] mt-1"
            style={{ color: "var(--danger)" }}
          >
            {err}
          </p>
        )}
      </div>
    </SimpleDialog>
  );
}

// ---------- Edit group dialog ----------

// Same palette as `components/new-group-form.tsx` — keep in sync so the
// chip swatches the user picked when creating a group still match here.
const COLOR_PRESETS = [
  "#ff6b9d",
  "#4ecdc4",
  "#ffd166",
  "#a78bfa",
  "#06d6a0",
  "#f4845f",
  "#118ab2",
  "#ef476f",
];

function EditGroupDialog({
  open,
  onClose,
  group,
}: {
  open: boolean;
  onClose: () => void;
  group: Group;
}) {
  const [name, setName] = useState(group.name);
  const [color, setColor] = useState<string>(group.color ?? "");
  const [code, setCode] = useState(group.invite_code);
  const [pending, startTransition] = useTransition();
  const [regenerating, startRegen] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [regenOpen, setRegenOpen] = useState(false);

  const onSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      const r = await updateGroup(group.id, { name, color });
      if (!r.ok) {
        setErr(r.error ?? "olmadı");
        return;
      }
      onClose();
    });
  };

  const doRegen = () => {
    setRegenOpen(false);
    setErr(null);
    startRegen(async () => {
      const r = await regenerateInviteCode(group.id);
      if (!r.ok) {
        setErr(r.error ?? "olmadı");
        return;
      }
      if (r.code) setCode(r.code);
    });
  };

  return (
    <SimpleDialog open={open} onClose={onClose} title="grubu düzenle">
      <form onSubmit={onSave} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="label" style={{ fontSize: "0.62rem" }}>
            isim
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className="field-input"
            autoFocus
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="label" style={{ fontSize: "0.62rem" }}>
            renk
          </span>
          <div className="flex flex-wrap gap-2 items-center">
            {COLOR_PRESETS.map((c) => {
              const selected = color === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`renk ${c}`}
                  style={{
                    width: 32,
                    height: 32,
                    background: c,
                    border: "2px solid var(--ink)",
                    borderRadius: "999px",
                    boxShadow: selected
                      ? "var(--shadow-pop)"
                      : "var(--shadow-pop-sm)",
                    transform: selected ? "translate(-1px,-1px)" : undefined,
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  {selected && (
                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--ink)",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        lineHeight: 1,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
            {color && (
              <button
                type="button"
                onClick={() => setColor("")}
                className="text-[0.72rem] font-semibold ml-1"
                style={{ color: "var(--text-muted)" }}
              >
                temizle
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="label" style={{ fontSize: "0.62rem" }}>
            davet kodu
          </span>
          <div className="flex items-center gap-2">
            <span
              className="pill flex-1 justify-center"
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                letterSpacing: "0.1em",
                fontSize: "0.95rem",
              }}
            >
              {code}
            </span>
            <button
              type="button"
              onClick={() => setRegenOpen(true)}
              disabled={regenerating}
              className="btn-ghost"
              style={{ padding: "0.55rem 0.85rem", fontSize: "0.8rem" }}
            >
              <RefreshCw size={13} strokeWidth={2} />
              {regenerating ? "…" : "yenile"}
            </button>
          </div>
        </div>

        {err && (
          <p
            className="text-[0.82rem] font-medium"
            style={{ color: "var(--danger)" }}
          >
            {err}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="btn-primary w-full"
          style={{ padding: "0.9rem 1.25rem" }}
        >
          {pending ? "kayıt…" : "kaydet"}
        </button>
      </form>
      {regenOpen && (
        <ConfirmDialog
          title="yeni davet kodu"
          body="yeni davet kodu üretilsin mi? eskisi geçersiz olur."
          confirmLabel="yenile"
          onCancel={() => setRegenOpen(false)}
          onConfirm={doRegen}
        />
      )}
    </SimpleDialog>
  );
}

// ---------- Join dialog ----------

function JoinDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      const r = await joinGroupByCode(code);
      if (!r.ok) {
        setErr(r.error ?? "olmadı");
        return;
      }
      onClose();
      router.push("/");
      router.refresh();
    });
  };

  return (
    <SimpleDialog open={open} onClose={onClose} title="gruba katıl">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="label" style={{ fontSize: "0.62rem" }}>
            davet kodu
          </span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            autoFocus
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="field-input"
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              letterSpacing: "0.18em",
              fontSize: "1.1rem",
              textAlign: "center",
              textTransform: "uppercase",
            }}
          />
        </label>

        {err && (
          <p
            className="text-[0.82rem] font-medium"
            style={{ color: "var(--danger)" }}
          >
            {err}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || code.trim().length === 0}
          className="btn-primary w-full"
          style={{ padding: "0.9rem 1.25rem" }}
        >
          {pending ? "katılıyor…" : "aha katıldım"}
        </button>
      </form>
    </SimpleDialog>
  );
}
