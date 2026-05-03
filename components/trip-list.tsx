import { TripCard } from "./trip-card";
import type { Trip } from "@/lib/types";

type Item = { trip: Trip; count: number };

export function TripList({ items }: { items: Item[] }) {
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {items.map((it, i) => (
        <TripCard
          key={it.trip.id}
          trip={it.trip}
          locationCount={it.count}
          index={i}
        />
      ))}
    </div>
  );
}
