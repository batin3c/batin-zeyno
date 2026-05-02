"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { GripVertical, MapPin } from "lucide-react";
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
import { isoToFlag } from "@/lib/country-codes";
import { reorderVisitedCities } from "@/app/actions/cities";
import type { VisitedCity, CityPhoto } from "@/lib/types";

type Props = {
  cities: VisitedCity[];
  photos: CityPhoto[];
  onSelectCity: (id: string) => void;
};

export function AlbumGrid({ cities, photos, onSelectCity }: Props) {
  const photosByCity = useMemo(() => {
    const m = new Map<string, CityPhoto[]>();
    for (const p of photos) {
      const arr = m.get(p.city_id) ?? [];
      arr.push(p);
      m.set(p.city_id, arr);
    }
    return m;
  }, [photos]);

  // store-prop-in-state: when the parent pushes a new id set (add/remove/
  // remote reorder) resync during render — no effect, no extra render.
  const ids = cities.map((c) => c.id);
  const idsKey = ids.join(",");
  const [lastIdsKey, setLastIdsKey] = useState(idsKey);
  const [order, setOrder] = useState<string[]>(ids);
  if (idsKey !== lastIdsKey) {
    setLastIdsKey(idsKey);
    setOrder(ids);
  }
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
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
      await reorderVisitedCities(next);
    });
  };

  if (cities.length === 0) {
    return (
      <div
        className="flex flex-col items-center text-center gap-4 max-w-sm mx-auto anim-reveal mt-12"
        style={{
          background: "var(--surface)",
          border: "2px solid var(--ink)",
          borderRadius: "24px",
          boxShadow: "var(--shadow-pop)",
          padding: "2.5rem 1.5rem",
        }}
      >
        <div style={{ fontSize: "3.5rem", lineHeight: 1 }}>📸</div>
        <h3
          className="font-bold tracking-tight"
          style={{ fontSize: "1.3rem", color: "var(--ink)" }}
        >
          arşiv boş
        </h3>
        <p
          className="text-[0.9rem] leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          küreye dön, bir ülkeye tık, şehir ekle, foto at.
        </p>
      </div>
    );
  }

  const byId = new Map(cities.map((c) => [c.id, c]));
  const ordered = order.map((id) => byId.get(id)).filter((c): c is VisitedCity => !!c);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-4 sm:gap-5">
          {ordered.map((c, i) => (
            <SortableAlbumCard
              key={c.id}
              city={c}
              cityPhotos={photosByCity.get(c.id) ?? []}
              index={i}
              onSelect={onSelectCity}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

const PILL_COLORS = [
  "var(--accent-soft)",
  "var(--accent-2-soft)",
  "var(--accent-3-soft)",
  "var(--accent-4-soft)",
];

function SortableAlbumCard({
  city,
  cityPhotos,
  index,
  onSelect,
}: {
  city: VisitedCity;
  cityPhotos: CityPhoto[];
  index: number;
  onSelect: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: city.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <AlbumCard
        city={city}
        cityPhotos={cityPhotos}
        index={index}
        onSelect={onSelect}
      />
      <button
        type="button"
        {...(listeners ?? {})}
        {...(attributes ?? {})}
        aria-label="sürükle"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="absolute top-3 left-3 flex items-center justify-center"
        style={{
          width: "34px",
          height: "34px",
          background: "var(--bg)",
          border: "2px solid var(--ink)",
          borderRadius: "12px",
          color: "var(--ink)",
          boxShadow: "2px 2px 0 var(--ink)",
          cursor: "grab",
          touchAction: "none",
        }}
      >
        <GripVertical size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function AlbumCard({
  city,
  cityPhotos,
  index,
  onSelect,
}: {
  city: VisitedCity;
  cityPhotos: CityPhoto[];
  index: number;
  onSelect: (id: string) => void;
}) {
  const first = cityPhotos[0];
  const flag = city.country_code ? isoToFlag(city.country_code) : "📍";
  const pillBg = PILL_COLORS[index % PILL_COLORS.length];
  return (
    <button
      onClick={() => onSelect(city.id)}
      className="group block w-full text-left anim-reveal"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <article
        className="flex flex-col overflow-hidden transition-transform duration-200 group-hover:-translate-x-[2px] group-hover:-translate-y-[2px] group-active:translate-x-[2px] group-active:translate-y-[2px]"
        style={{
          background: "var(--surface)",
          border: "2px solid var(--ink)",
          borderRadius: "22px",
          boxShadow: "var(--shadow-pop)",
        }}
      >
        <div
          className="relative w-full aspect-[16/9] overflow-hidden"
          style={{
            background: pillBg,
            borderBottom: "2px solid var(--ink)",
          }}
        >
          {first ? (
            <Image
              src={first.url}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority={index < 2}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin
                size={36}
                strokeWidth={2}
                style={{ color: "var(--accent)" }}
              />
            </div>
          )}
          {cityPhotos.length > 0 && (
            <div
              className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1 text-[0.78rem] font-bold"
              style={{
                background: "var(--bg)",
                border: "2px solid var(--ink)",
                borderRadius: "999px",
                color: "var(--ink)",
                boxShadow: "2px 2px 0 var(--ink)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--accent)" }}
              />
              {cityPhotos.length}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <span style={{ fontSize: "1.4rem", lineHeight: 1 }}>{flag}</span>
          <h3
            className="font-bold tracking-tight leading-tight line-clamp-1 flex-1 min-w-0"
            style={{ fontSize: "1.15rem", color: "var(--ink)" }}
          >
            {city.name}
          </h3>
        </div>
      </article>
    </button>
  );
}
