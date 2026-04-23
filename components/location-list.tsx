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

// stable stamp rotation per location id
function stampTilt(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 9) - 4) * 1.5;
}

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
      <div className="flex flex-col items-center text-center py-20 gap-3 animate-rise">
        <div className="font-serif italic text-4xl opacity-40">—&nbsp;·&nbsp;—</div>
        <h3 className="font-serif italic text-xl text-[color:var(--ink)]">
          henüz hiçbir yer yok
        </h3>
        <p className="font-serif italic text-sm text-[color:var(--ink-soft)] max-w-xs">
          sağ alttaki <span className="ink-highlight">yer ekle</span> düğmesiyle
          başla — bir link yapıştır veya ara.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {locations.map((loc, i) => (
        <LocationEntry
          key={loc.id}
          loc={loc}
          members={members}
          currentMemberId={currentMemberId}
          tripId={tripId}
          index={i}
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
}: {
  loc: Location;
  members: Member[];
  currentMemberId: string;
  tripId: string;
  index: number;
}) {
  const cat = CATEGORIES.find((c) => c.key === loc.category);
  const addedBy = members.find((m) => m.id === loc.added_by);
  const iLoved = loc.loved_by.includes(currentMemberId);
  const visited = loc.status === "visited";
  const [, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const tilt = stampTilt(loc.id);

  const entryNo = String(index + 1).padStart(2, "0");

  return (
    <article
      className="relative animate-rise flex gap-4"
      style={{
        animationDelay: `${index * 55}ms`,
      }}
    >
      {/* Left gutter — stamp + entry no. */}
      <div className="flex flex-col items-center gap-2 pt-1 shrink-0 w-14">
        <div
          className="w-12 h-12 flex items-center justify-center relative shrink-0"
          style={{
            background: "var(--paper-soft)",
            border: "1.5px solid var(--ink)",
            transform: `rotate(${tilt}deg)`,
          }}
        >
          <span className="text-[1.5rem] leading-none">{cat?.emoji ?? "📍"}</span>
          <div
            className="absolute inset-[2px] pointer-events-none"
            style={{ border: "1px dashed var(--faded)" }}
          />
        </div>
        <span className="label-mono text-[0.6rem]">#{entryNo}</span>
        {loc.loved_by.length > 0 && (
          <span
            className="label-mono text-[0.6rem] flex items-center gap-0.5"
            style={{ color: "var(--stamp)" }}
          >
            <Heart size={9} fill="var(--stamp)" strokeWidth={0} />
            {loc.loved_by.length}
          </span>
        )}
      </div>

      {/* Main */}
      <div
        className="flex-1 min-w-0 relative pb-4"
        style={{
          borderBottom: "1px dashed var(--faded)",
          opacity: visited ? 0.72 : 1,
        }}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3
              className="font-serif text-[1.35rem] leading-tight text-[color:var(--ink)] truncate"
              style={{
                textDecoration: visited ? "line-through" : "none",
                textDecorationColor: "var(--faded)",
                textDecorationThickness: "1px",
              }}
            >
              {loc.name}
            </h3>
            {loc.address && (
              <p className="label-mono mt-1 truncate">{loc.address}</p>
            )}
            {loc.note && (
              <p
                className={`mt-2 font-serif italic text-[0.98rem] leading-snug text-[color:var(--ink-soft)] cursor-pointer ${
                  expanded ? "" : "line-clamp-2"
                }`}
                onClick={() => setExpanded((v) => !v)}
              >
                &ldquo;{loc.note}&rdquo;
              </p>
            )}
            {addedBy && (
              <p className="mt-2 label-mono opacity-70">
                · {addedBy.name.toLowerCase()} ekledi
              </p>
            )}
          </div>
          <button
            onClick={() => startTransition(() => toggleLove(loc.id, tripId))}
            className="p-2 -mr-2 -mt-1 text-[color:var(--ink-soft)] transition-colors"
            aria-label="Beğen"
          >
            <Heart
              size={18}
              strokeWidth={1.5}
              fill={iLoved ? "var(--stamp)" : "none"}
              stroke={iLoved ? "var(--stamp)" : "currentColor"}
            />
          </button>
        </div>

        <LocationPhotos
          locationId={loc.id}
          tripId={tripId}
          urls={loc.photo_urls}
        />

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <a
            href={directionsUrl(loc.lat, loc.lng, loc.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="j-btn-stamp"
            style={{ padding: "0.45rem 0.85rem", fontSize: "0.65rem" }}
          >
            <Navigation size={11} strokeWidth={1.8} />
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
            className="j-btn-ghost"
            style={{ padding: "0.45rem 0.75rem", fontSize: "0.62rem" }}
          >
            <ExternalLink size={11} strokeWidth={1.8} />
            haritalar
          </a>
          <button
            onClick={() => startTransition(() => toggleVisited(loc.id, tripId))}
            className="j-btn-ghost"
            style={{
              padding: "0.45rem 0.75rem",
              fontSize: "0.62rem",
              borderColor: visited ? "var(--sea)" : undefined,
              color: visited ? "var(--sea)" : undefined,
              borderStyle: visited ? "solid" : "dashed",
            }}
          >
            <Check size={11} strokeWidth={1.8} />
            {visited ? "gittik ✓" : "gidilecek"}
          </button>
          <button
            onClick={() => {
              if (!confirm("Bu yer silinsin mi?")) return;
              startTransition(() => deleteLocation(loc.id, tripId));
            }}
            className="ml-auto p-1.5 text-[color:var(--ink-soft)] opacity-40 hover:opacity-100 hover:text-[color:var(--stamp)] transition-all"
            aria-label="Sil"
          >
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </article>
  );
}
