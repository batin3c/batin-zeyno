"use client";

import { SharePostButton } from "./share-post-dialog";

export function TripShareOverlay({
  tripId,
  coverUrl,
}: {
  tripId: string;
  coverUrl: string | null;
}) {
  return (
    <div
      className="absolute top-3 left-3"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <SharePostButton
        refType="trip"
        refId={tripId}
        existingPhotos={coverUrl ? [{ url: coverUrl }] : []}
        label="paylaş"
        buttonClassName="btn-chip"
        buttonStyle={{
          background: "var(--accent)",
          fontWeight: 700,
          boxShadow: "var(--shadow-pop-sm)",
        }}
      />
    </div>
  );
}
