"use client";

import { useTransition, useState } from "react";
import {
  Heart,
  Check,
  Trash2,
  Navigation,
  ExternalLink,
} from "lucide-react";
import type { Location, Member } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { directionsUrl, openInMapsUrl } from "@/lib/google-maps";
import {
  toggleLove,
  toggleVisited,
  deleteLocation,
} from "@/app/actions/locations";
import { LocationPhotos } from "./location-photos";

export function LocationList({
  locations,
  members,
  currentMemberId,
  tripId,
}: {
  locations: Location[];
  members: Member[];
  currentMemberId: string;
  tripId: string;
}) {
  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-start py-12 gap-3 max-w-sm anim-reveal">
        <div
          className="w-12 h-12 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--accent) 35%, transparent), transparent 70%)",
          }}
        />
        <h3 className="text-[1.2rem] font-medium tracking-tight">
          bok gibi boş
        </h3>
        <p
          className="text-[0.9rem] leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          aşağıdan <span style={{ color: "var(--text)" }}>yer at</span> da
          başlayalım — link yapıştır, ara ya da elle gir. siktir et
          komplikasyonu.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {locations.map((loc, i) => (
        <LocationEntry
          key={loc.id}
          loc={loc}
          members={members}
          currentMemberId={currentMemberId}
          tripId={tripId}
          index={i}
          last={i === locations.length - 1}
        />
      ))}
    </div>
  );
}

function LocationEntry({
  loc,
  members,
  currentMemberId,
  tripId,
  index,
  last,
}: {
  loc: Location;
  members: Member[];
  currentMemberId: string;
  tripId: string;
  index: number;
  last: boolean;
}) {
  const cat = CATEGORIES.find((c) => c.key === loc.category);
  const addedBy = members.find((m) => m.id === loc.added_by);
  const iLoved = loc.loved_by.includes(currentMemberId);
  const visited = loc.status === "visited";
  const [, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      className="anim-reveal py-5"
      style={{
        animationDelay: `${index * 50}ms`,
        opacity: visited ? 0.7 : 1,
        borderBottom: last ? "none" : "1px solid var(--line-soft)",
      }}
    >
      <div className="flex items-start gap-3 mb-2">
        <div
          className="w-9 h-9 flex items-center justify-center text-[1.1rem] shrink-0"
          style={{
            background: "var(--surface-2)",
            borderRadius: "10px",
          }}
        >
          {cat?.emoji ?? "📍"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3
              className="text-[1.05rem] font-medium tracking-tight leading-snug text-[color:var(--text)]"
              style={{
                textDecoration: visited ? "line-through" : "none",
                textDecorationColor: "var(--text-dim)",
                textDecorationThickness: "1px",
              }}
            >
              {loc.name}
            </h3>
            {loc.visit_date && (
              <span className="label-dim whitespace-nowrap">
                {formatVisitDate(loc.visit_date)}
              </span>
            )}
          </div>
          {loc.address && (
            <p
              className="text-[0.8rem] mt-0.5 truncate"
              style={{ color: "var(--text-muted)" }}
            >
              {loc.address}
            </p>
          )}
        </div>
        <button
          onClick={() => startTransition(() => toggleLove(loc.id, tripId))}
          className="btn-icon -mr-1 -mt-1"
          aria-label="kalp at"
          style={{
            width: 34,
            height: 34,
            color: iLoved ? "var(--accent)" : "var(--text-muted)",
          }}
        >
          <Heart
            size={17}
            strokeWidth={1.75}
            fill={iLoved ? "var(--accent)" : "none"}
          />
        </button>
      </div>

      {loc.note && (
        <p
          className={`text-[0.9rem] leading-relaxed mb-3 cursor-pointer ${
            expanded ? "" : "line-clamp-2"
          }`}
          style={{ color: "var(--text-muted)", paddingLeft: "48px" }}
          onClick={() => setExpanded((v) => !v)}
        >
          {loc.note}
        </p>
      )}

      <div style={{ paddingLeft: "48px" }}>
        <LocationPhotos
          locationId={loc.id}
          tripId={tripId}
          urls={loc.photo_urls}
          googleUrls={loc.google_photo_urls}
        />
      </div>

      <div
        className="flex items-center gap-2 mt-3 flex-wrap"
        style={{ paddingLeft: "48px" }}
      >
        <a
          href={directionsUrl(loc.lat, loc.lng, loc.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-chip"
          style={{
            color: "var(--accent)",
            borderColor: "var(--accent-soft)",
            background: "var(--accent-soft)",
          }}
        >
          <Navigation size={11} strokeWidth={1.75} />
          yol tarifi
        </a>
        <a
          href={openInMapsUrl(
            loc.lat,
            loc.lng,
            loc.google_place_id,
            loc.name
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-chip"
        >
          <ExternalLink size={11} strokeWidth={1.75} />
          haritalar
        </a>
        <button
          onClick={() => startTransition(() => toggleVisited(loc.id, tripId))}
          className="btn-chip"
          style={
            visited
              ? {
                  color: "var(--accent)",
                  borderColor: "var(--accent-soft)",
                  background: "var(--accent-soft)",
                }
              : undefined
          }
        >
          <Check size={11} strokeWidth={1.75} />
          {visited ? "gittik" : "gidilecek"}
        </button>

        <div
          className="ml-auto flex items-center gap-2"
          style={{ color: "var(--text-dim)" }}
        >
          {addedBy && (
            <span className="text-[0.7rem]">
              {addedBy.name.toLowerCase()}
            </span>
          )}
          {loc.loved_by.length > 0 && (
            <span
              className="text-[0.7rem] flex items-center gap-0.5"
              style={{ color: "var(--accent)" }}
            >
              <Heart size={9} fill="var(--accent)" strokeWidth={0} />
              {loc.loved_by.length}
            </span>
          )}
          <button
            onClick={() => {
              if (!confirm("bu yeri siktir edelim mi?")) return;
              startTransition(() => deleteLocation(loc.id, tripId));
            }}
            className="p-1 opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: "var(--text-dim)" }}
            aria-label="siktir et"
          >
            <Trash2 size={12} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </article>
  );
}

function formatVisitDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("tr-TR", { day: "numeric", month: "short" })
    .toLowerCase();
}
