"use client";

import { useState } from "react";
import { Map as MapIcon, ListOrdered } from "lucide-react";
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
  const [tab, setTab] = useState<"map" | "list">("map");
  const visitedCount = locations.filter((l) => l.status === "visited").length;

  return (
    <>
      <div className="max-w-3xl w-full mx-auto px-4 pt-5 pb-3">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex gap-0">
            <TabBtn active={tab === "map"} onClick={() => setTab("map")}>
              <MapIcon size={13} strokeWidth={1.5} /> harita
            </TabBtn>
            <TabBtn active={tab === "list"} onClick={() => setTab("list")}>
              <ListOrdered size={13} strokeWidth={1.5} /> liste
              <span className="opacity-60 ml-0.5">· {locations.length}</span>
            </TabBtn>
          </div>
          <ImportKmlButton tripId={tripId} />
        </div>
        {locations.length > 0 && (
          <div className="label-mono flex items-center gap-3">
            <span>{visitedCount}/{locations.length} gittik</span>
            <span className="flex-1 dashed-rule" />
            <span>
              {locations.reduce((acc, l) => acc + l.loved_by.length, 0)} ♡
            </span>
          </div>
        )}
      </div>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 pb-32">
        {tab === "map" ? (
          <div
            className="h-[68vh] overflow-hidden"
            style={{
              border: "1px solid var(--faded)",
              boxShadow: "inset 0 0 0 1px var(--paper-soft)",
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
      className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.18em] transition-colors border-b-2"
      style={{
        color: active ? "var(--ink)" : "var(--ink-soft)",
        borderColor: active ? "var(--stamp)" : "transparent",
      }}
    >
      {children}
    </button>
  );
}
