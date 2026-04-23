"use client";

import { useState } from "react";
import { Map as MapIcon, List } from "lucide-react";
import { MapView } from "./map-view";
import { LocationList } from "./location-list";
import { AddLocationButton } from "./add-location-dialog";
import { ImportKmlButton } from "./import-kml-dialog";
import type { Location, Member } from "@/lib/types";

export function TripDetailClient({
  tripId,
  locations,
  members,
  currentMemberId,
}: {
  tripId: string;
  locations: Location[];
  members: Member[];
  currentMemberId: string;
}) {
  const [tab, setTab] = useState<"map" | "list">("list");
  const visitedCount = locations.filter((l) => l.status === "visited").length;

  return (
    <>
      <div className="max-w-3xl w-full mx-auto px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex gap-1.5">
            <TabBtn active={tab === "list"} onClick={() => setTab("list")}>
              <List size={14} strokeWidth={2} /> liste
            </TabBtn>
            <TabBtn active={tab === "map"} onClick={() => setTab("map")}>
              <MapIcon size={14} strokeWidth={2} /> harita
            </TabBtn>
          </div>
          <ImportKmlButton tripId={tripId} />
        </div>
        {locations.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="pill pill-mint">
              <span style={{ fontWeight: 700 }}>{locations.length}</span> yer
            </span>
            <span className="pill pill-pink">
              <span style={{ fontWeight: 700 }}>{visitedCount}</span> gittik
            </span>
            <span className="pill pill-lavender">
              <span style={{ fontWeight: 700 }}>
                {locations.reduce((acc, l) => acc + l.loved_by.length, 0)}
              </span>{" "}
              ♡
            </span>
          </div>
        )}
      </div>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 pb-32">
        {tab === "map" ? (
          <div
            className="overflow-hidden"
            style={{
              height: "72vh",
              borderRadius: "20px",
              border: "2px solid var(--ink)",
              boxShadow: "var(--shadow-pop)",
            }}
          >
            <MapView locations={locations} members={members} />
          </div>
        ) : (
          <LocationList
            locations={locations}
            members={members}
            currentMemberId={currentMemberId}
            tripId={tripId}
          />
        )}
      </main>

      <AddLocationButton tripId={tripId} />
    </>
  );
}

function TabBtn({
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
