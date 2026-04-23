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
          <div
            className="inline-flex p-0.5"
            style={{
              background: "var(--surface-2)",
              borderRadius: "10px",
            }}
          >
            <TabBtn active={tab === "list"} onClick={() => setTab("list")}>
              <List size={13} strokeWidth={1.75} /> liste
            </TabBtn>
            <TabBtn active={tab === "map"} onClick={() => setTab("map")}>
              <MapIcon size={13} strokeWidth={1.75} /> harita
            </TabBtn>
          </div>
          <ImportKmlButton tripId={tripId} />
        </div>
        {locations.length > 0 && (
          <div
            className="label-dim mt-3 flex items-center gap-3"
            style={{ fontSize: "0.65rem" }}
          >
            <span>{locations.length} yer</span>
            <span style={{ color: "var(--line)" }}>·</span>
            <span>{visitedCount} gittik</span>
            <span style={{ color: "var(--line)" }}>·</span>
            <span>
              {locations.reduce((acc, l) => acc + l.loved_by.length, 0)} ♡
            </span>
          </div>
        )}
      </div>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 pb-32">
        {tab === "map" ? (
          <div
            className="h-[72vh] overflow-hidden"
            style={{
              borderRadius: "16px",
              border: "1px solid var(--line)",
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
      className="flex items-center gap-1.5 px-3 py-1.5 text-[0.8rem] font-medium tracking-tight transition-all duration-200"
      style={{
        color: active ? "var(--text)" : "var(--text-muted)",
        background: active ? "var(--bg)" : "transparent",
        borderRadius: "8px",
        boxShadow: active
          ? "0 1px 3px -1px color-mix(in srgb, var(--text) 20%, transparent)"
          : "none",
      }}
    >
      {children}
    </button>
  );
}
