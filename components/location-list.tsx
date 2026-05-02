"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Heart,
  Check,
  Trash2,
  Navigation,
  ExternalLink,
  Star,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Location, Member } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { formatAmount } from "@/lib/currency";
import { directionsUrl, openInMapsUrl } from "@/lib/google-maps";
import {
  toggleLove,
  toggleVisited,
  deleteLocation,
  reorderLocations,
} from "@/app/actions/locations";
import { LocationPhotos } from "./location-photos";

const CATEGORY_BG: Record<string, string> = {
  restaurant: "var(--accent-soft)",
  cafe: "var(--accent-3-soft)",
  bar: "var(--accent-4-soft)",
  hotel: "var(--accent-2-soft)",
  museum: "var(--accent-4-soft)",
  view: "var(--accent-3-soft)",
  shopping: "var(--accent-soft)",
  nature: "var(--accent-2-soft)",
  activity: "var(--accent-3-soft)",
  other: "var(--surface-2)",
};

export function LocationList({
  locations,
  members,
  currentMemberId,
  tripId,
  draggable = false,
}: {
  locations: Location[];
  members: Member[];
  currentMemberId: string;
  tripId: string;
  draggable?: boolean;
}) {
  const [order, setOrder] = useState<string[]>(locations.map((l) => l.id));
  const [, startTransition] = useTransition();

  useEffect(() => {
    setOrder(locations.map((l) => l.id));
  }, [locations]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 160, tolerance: 6 },
    })
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = order.indexOf(String(active.id));
    const newIdx = order.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(order, oldIdx, newIdx);
    setOrder(next);
    startTransition(async () => {
      await reorderLocations(tripId, next);
    });
  };

  if (locations.length === 0) {
    return (
      <div
        className="flex flex-col items-center text-center gap-4 max-w-sm mx-auto anim-reveal mt-8"
        style={{
          background: "var(--surface)",
          border: "2px solid var(--ink)",
          borderRadius: "24px",
          boxShadow: "var(--shadow-pop)",
          padding: "2.5rem 1.5rem",
        }}
      >
        <div style={{ fontSize: "3.5rem", lineHeight: 1 }}>🗺️</div>
        <h3
          className="font-bold tracking-tight"
          style={{ fontSize: "1.4rem", color: "var(--ink)" }}
        >
          bok gibi boş
        </h3>
        <p
          className="text-[0.9rem] leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          aşağıdan{" "}
          <span style={{ color: "var(--ink)", fontWeight: 600 }}>yer at</span>{" "}
          da başlayalım — link yapıştır, ara ya da elle gir.
        </p>
      </div>
    );
  }

  const byId = new Map(locations.map((l) => [l.id, l]));
  const ordered = order.map((id) => byId.get(id)).filter(Boolean) as Location[];

  if (!draggable) {
    return (
      <div className="flex flex-col gap-3">
        {locations.map((loc, i) => (
          <LocationEntry
            key={loc.id}
            loc={loc}
            members={members}
            currentMemberId={currentMemberId}
            tripId={tripId}
            index={i}
            dragHandle={false}
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3">
          {ordered.map((loc, i) => (
            <SortableLocationEntry
              key={loc.id}
              loc={loc}
              members={members}
              currentMemberId={currentMemberId}
              tripId={tripId}
              index={i}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableLocationEntry(props: {
  loc: Location;
  members: Member[];
  currentMemberId: string;
  tripId: string;
  index: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.loc.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  } as React.CSSProperties;
  return (
    <div ref={setNodeRef} style={style}>
      <LocationEntry
        {...props}
        dragHandle
        dragListeners={listeners}
        dragAttributes={attributes}
      />
    </div>
  );
}

type DragListeners = ReturnType<typeof useSortable>["listeners"];
type DragAttributes = ReturnType<typeof useSortable>["attributes"];

function LocationEntry({
  loc,
  members,
  currentMemberId,
  tripId,
  index,
  dragHandle = false,
  dragListeners,
  dragAttributes,
}: {
  loc: Location;
  members: Member[];
  currentMemberId: string;
  tripId: string;
  index: number;
  dragHandle?: boolean;
  dragListeners?: DragListeners;
  dragAttributes?: DragAttributes;
}) {
  const cat = CATEGORIES.find((c) => c.key === loc.category);
  const addedBy = members.find((m) => m.id === loc.added_by);
  const iLoved = loc.loved_by.includes(currentMemberId);
  const visited = loc.status === "visited";
  const [, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [loveAnim, setLoveAnim] = useState(false);
  const categoryBg = CATEGORY_BG[loc.category] ?? "var(--surface-2)";

  const handleLove = () => {
    setLoveAnim(true);
    setTimeout(() => setLoveAnim(false), 600);
    startTransition(() => toggleLove(loc.id, tripId));
  };

  return (
    <article
      className="anim-reveal"
      style={{
        animationDelay: `${index * 50}ms`,
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "20px",
        boxShadow: "var(--shadow-pop)",
        padding: "1rem 1.1rem",
        opacity: visited ? 0.88 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        {dragHandle && (
          <button
            type="button"
            {...(dragListeners ?? {})}
            {...(dragAttributes ?? {})}
            aria-label="sürükle"
            className="flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing"
            style={{
              width: "28px",
              height: "48px",
              color: "var(--text-dim)",
              touchAction: "none",
            }}
          >
            <GripVertical size={18} strokeWidth={2} />
          </button>
        )}
        <div
          className="flex items-center justify-center text-[1.35rem] shrink-0"
          style={{
            width: "48px",
            height: "48px",
            background: categoryBg,
            border: "2px solid var(--ink)",
            borderRadius: "14px",
          }}
        >
          {cat?.emoji ?? "📍"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3
              className="font-semibold tracking-tight leading-snug"
              style={{
                fontSize: "1.05rem",
                color: "var(--ink)",
                textDecoration: visited ? "line-through" : "none",
                textDecorationColor: "var(--text-dim)",
                textDecorationThickness: "2px",
              }}
            >
              {loc.name}
            </h3>
            {loc.visit_date && (
              <span
                className="pill pill-mint"
                style={{ padding: "0.18rem 0.6rem", fontSize: "0.78rem" }}
              >
                {formatVisitDate(loc.visit_date)}
              </span>
            )}
            {loc.amount != null && (
              <span
                className="pill pill-yellow"
                style={{ padding: "0.18rem 0.6rem", fontSize: "0.8rem" }}
              >
                {formatAmount(loc.amount, loc.currency)}
              </span>
            )}
          </div>
          {loc.address && (
            <p
              className="text-[0.88rem] mt-1 truncate"
              style={{ color: "var(--text-muted)" }}
            >
              {loc.address}
            </p>
          )}
          {loc.rating !== null && (
            <div
              className="flex items-center gap-1 mt-1.5 text-[0.85rem] font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              <Star size={13} fill="var(--accent-3)" strokeWidth={2} />
              <span style={{ color: "var(--ink)", fontWeight: 700 }}>
                {loc.rating.toFixed(1)}
              </span>
              {loc.rating_count !== null && (
                <span>· {formatCount(loc.rating_count)}</span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={handleLove}
          aria-label="kalp at"
          className={loveAnim ? "anim-wobble" : ""}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
            height: "40px",
            background: iLoved ? "var(--accent-soft)" : "var(--surface)",
            border: "2px solid var(--ink)",
            borderRadius: "12px",
            boxShadow: "var(--shadow-pop-sm)",
            color: iLoved ? "var(--accent)" : "var(--ink)",
            transition: "background 140ms",
          }}
        >
          <Heart
            size={18}
            strokeWidth={2}
            fill={iLoved ? "var(--accent)" : "none"}
          />
        </button>
      </div>

      {loc.note && (
        <p
          className={`text-[0.9rem] leading-relaxed mt-3 cursor-pointer ${
            expanded ? "" : "line-clamp-2"
          }`}
          style={{ color: "var(--text-muted)" }}
          onClick={() => setExpanded((v) => !v)}
        >
          {loc.note}
        </p>
      )}

      <div className="mt-3">
        <LocationPhotos
          locationId={loc.id}
          tripId={tripId}
          urls={loc.photo_urls}
          googleUrls={loc.google_photo_urls}
        />
      </div>

      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        <a
          href={directionsUrl(loc.lat, loc.lng, loc.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-chip"
          style={{ background: "var(--accent-3-soft)" }}
        >
          <Navigation size={14} strokeWidth={2} />
          yol
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
          <ExternalLink size={14} strokeWidth={2} />
          haritalar
        </a>
        <button
          onClick={() => startTransition(() => toggleVisited(loc.id, tripId))}
          className="btn-chip"
          style={
            visited
              ? { background: "var(--accent-2)", fontWeight: 600 }
              : undefined
          }
        >
          <Check size={14} strokeWidth={2.5} />
          {visited ? "gittik" : "gidilecek"}
        </button>

        <div className="ml-auto flex items-center gap-2">
          {addedBy && (
            <span
              className="text-[0.82rem] font-medium"
              style={{ color: "var(--text-dim)" }}
            >
              {addedBy.name.toLowerCase()}
            </span>
          )}
          {loc.loved_by.length > 0 && (
            <span
              className="text-[0.82rem] font-bold flex items-center gap-0.5"
              style={{ color: "var(--accent)" }}
            >
              <Heart size={13} fill="var(--accent)" strokeWidth={0} />
              {loc.loved_by.length}
            </span>
          )}
          <button
            onClick={() => {
              if (!confirm("bu yeri siktir edelim mi?")) return;
              startTransition(() => deleteLocation(loc.id, tripId));
            }}
            className="p-1 opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: "var(--text-muted)" }}
            aria-label="siktir et"
          >
            <Trash2 size={14} strokeWidth={2} />
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

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
