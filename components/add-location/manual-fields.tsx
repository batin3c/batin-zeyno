"use client";

import type { Draft } from "./draft";

export function ManualFields({
  draft,
  setDraft,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
          adres
        </div>
        <input
          value={draft.address}
          onChange={(e) => setDraft({ ...draft, address: e.target.value })}
          className="field-input"
        />
      </div>
      <div>
        <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
          enlem
        </div>
        <input
          type="number"
          step="any"
          value={draft.lat ?? ""}
          onChange={(e) =>
            setDraft({
              ...draft,
              lat: e.target.value ? parseFloat(e.target.value) : null,
            })
          }
          className="field-input"
        />
      </div>
      <div>
        <div className="label mb-2" style={{ fontSize: "0.62rem" }}>
          boylam
        </div>
        <input
          type="number"
          step="any"
          value={draft.lng ?? ""}
          onChange={(e) =>
            setDraft({
              ...draft,
              lng: e.target.value ? parseFloat(e.target.value) : null,
            })
          }
          className="field-input"
        />
      </div>
    </div>
  );
}
