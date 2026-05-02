"use client";

import { useState, useTransition } from "react";
import { Plus, Search, Link2, PenLine, List, Star } from "lucide-react";
import { SimpleDialog } from "../simple-dialog";
import { CATEGORIES, type Category } from "@/lib/types";
import { createLocation } from "@/app/actions/locations";
import { EMPTY, draftToFormData, formatCount, type Draft } from "./draft";
import { PlaceSearch } from "./place-search";
import { LinkInput } from "./link-input";
import { ManualFields } from "./manual-fields";
import { ListImport } from "./list-import";

export function AddLocationButton({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary fixed safe-bottom right-6 z-30"
        style={{ padding: "0.85rem 1.35rem", fontSize: "0.95rem" }}
      >
        <Plus size={18} strokeWidth={2.5} />
        yer at
      </button>
      {open && (
        <AddLocationDialog tripId={tripId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

type Mode = "search" | "link" | "manual" | "list";

function AddLocationDialog({
  tripId,
  onClose,
}: {
  tripId: string;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>("search");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [pending, startTransition] = useTransition();
  const ready = draft.name.trim().length > 0 && draft.lat !== null;

  const submit = () => {
    if (!ready) return;
    startTransition(async () => {
      await createLocation(draftToFormData(tripId, draft));
      onClose();
    });
  };

  return (
    <SimpleDialog open={true} onClose={onClose} title="yer at">
      <div className="flex gap-1.5 mb-5 flex-wrap">
        <Tab active={mode === "search"} onClick={() => setMode("search")}>
          <Search size={13} strokeWidth={2} /> ara
        </Tab>
        <Tab active={mode === "link"} onClick={() => setMode("link")}>
          <Link2 size={13} strokeWidth={2} /> link
        </Tab>
        <Tab active={mode === "manual"} onClick={() => setMode("manual")}>
          <PenLine size={13} strokeWidth={2} /> elle
        </Tab>
        <Tab active={mode === "list"} onClick={() => setMode("list")}>
          <List size={13} strokeWidth={2} /> liste
        </Tab>
      </div>

      {mode === "list" ? (
        <ListImport tripId={tripId} onDone={onClose} />
      ) : (
        <>
          {mode === "search" && (
            <PlaceSearch onPick={(d) => setDraft({ ...draft, ...d })} />
          )}
          {mode === "link" && (
            <LinkInput onResolved={(d) => setDraft({ ...draft, ...d })} />
          )}
          {mode === "manual" && (
            <ManualFields draft={draft} setDraft={setDraft} />
          )}

          {draft.lat !== null && <DraftPreview draft={draft} />}

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
                kategori
              </div>
              <select
                value={draft.category}
                onChange={(e) =>
                  setDraft({ ...draft, category: e.target.value as Category })
                }
                className="field-select"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
                isim
              </div>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="yer ismi"
                className="field-input"
              />
            </div>
          </div>

          <div className="mt-5">
            <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
              tarih
            </div>
            <input
              type="date"
              value={draft.visit_date}
              onChange={(e) =>
                setDraft({ ...draft, visit_date: e.target.value })
              }
              className="field-input"
            />
          </div>

          <div className="mt-5">
            <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
              not
            </div>
            <textarea
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              rows={2}
              placeholder="…"
              className="field-textarea"
            />
          </div>

          <button
            onClick={submit}
            disabled={!ready || pending}
            className="btn-primary w-full mt-6"
            style={{ padding: "0.95rem 1.25rem" }}
          >
            {pending ? "atılıyor…" : ready ? "at" : "önce bir yer seç"}
          </button>
        </>
      )}
    </SimpleDialog>
  );
}

function DraftPreview({ draft }: { draft: Draft }) {
  return (
    <div
      className="mt-5 p-3 flex flex-col gap-1"
      style={{
        background: "var(--accent-2-soft)",
        border: "2px solid var(--ink)",
        borderRadius: "14px",
      }}
    >
      <div
        className="text-[0.95rem] font-medium tracking-tight"
        style={{ color: "var(--text)" }}
      >
        {draft.name || "(isimsiz)"}
      </div>
      {draft.address && (
        <div className="text-[0.8rem]" style={{ color: "var(--text-muted)" }}>
          {draft.address}
        </div>
      )}
      {draft.rating !== null && (
        <div
          className="text-[0.8rem] flex items-center gap-1 mt-1"
          style={{ color: "var(--text-muted)" }}
        >
          <Star size={11} fill="var(--accent)" strokeWidth={0} />
          <span style={{ color: "var(--text)" }}>
            {draft.rating.toFixed(1)}
          </span>
          {draft.rating_count !== null && (
            <span>· {formatCount(draft.rating_count)}</span>
          )}
        </div>
      )}
      {draft.google_photo_urls.length > 0 && (
        <div className="flex gap-1.5 mt-2 -mx-1 overflow-x-auto">
          {draft.google_photo_urls.map((u) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={u}
              src={u}
              alt=""
              className="w-16 h-16 object-cover flex-shrink-0"
              style={{ borderRadius: "8px" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Tab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="btn-chip"
      style={{
        background: active ? "var(--accent-2)" : "var(--surface)",
        fontWeight: active ? 600 : 500,
      }}
    >
      {children}
    </button>
  );
}
