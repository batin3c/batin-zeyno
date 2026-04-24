"use client";

import { useEffect, useState, useTransition } from "react";
import { GripVertical } from "lucide-react";
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
import { TripCard } from "./trip-card";
import { reorderTrips } from "@/app/actions/trips";
import type { Trip } from "@/lib/types";

type Item = { trip: Trip; count: number };

export function TripList({ items }: { items: Item[] }) {
  const [order, setOrder] = useState<string[]>(items.map((i) => i.trip.id));
  const [, startTransition] = useTransition();

  useEffect(() => {
    setOrder(items.map((i) => i.trip.id));
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    })
  );

  const byId = new Map(items.map((i) => [i.trip.id, i]));
  const ordered = order
    .map((id) => byId.get(id))
    .filter((x): x is Item => !!x);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = order.indexOf(String(active.id));
    const newIdx = order.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(order, oldIdx, newIdx);
    setOrder(next);
    startTransition(async () => {
      await reorderTrips(next);
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-4 sm:gap-5">
          {ordered.map((it, i) => (
            <SortableTripCard
              key={it.trip.id}
              trip={it.trip}
              count={it.count}
              index={i}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableTripCard({
  trip,
  count,
  index,
}: {
  trip: Trip;
  count: number;
  index: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: trip.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  } as React.CSSProperties;
  return (
    <div ref={setNodeRef} style={style} className="relative">
      <TripCard trip={trip} locationCount={count} index={index} />
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
