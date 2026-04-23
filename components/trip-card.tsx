import Link from "next/link";
import type { Trip } from "@/lib/types";

const PILL_COLORS = [
  "var(--accent-soft)",
  "var(--accent-2-soft)",
  "var(--accent-3-soft)",
  "var(--accent-4-soft)",
];

export function TripCard({
  trip,
  locationCount,
  index = 0,
}: {
  trip: Trip;
  locationCount: number;
  index?: number;
}) {
  const dateStr = formatDates(trip.start_date, trip.end_date);
  const pillBg = PILL_COLORS[index % PILL_COLORS.length];

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group block anim-reveal"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <article
        className="flex flex-col overflow-hidden transition-transform duration-200 group-hover:-translate-x-[2px] group-hover:-translate-y-[2px] group-active:translate-x-[2px] group-active:translate-y-[2px]"
        style={{
          background: "var(--surface)",
          border: "2px solid var(--ink)",
          borderRadius: "20px",
          boxShadow: "var(--shadow-pop)",
        }}
      >
        <div
          className="relative w-full aspect-[4/5] overflow-hidden"
          style={{
            background: pillBg,
            borderBottom: "2px solid var(--ink)",
          }}
        >
          {trip.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trip.cover_url}
              alt={trip.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <EmptyCover />
          )}
          <div
            className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 text-[0.72rem] font-bold"
            style={{
              background: "var(--bg)",
              border: "1.5px solid var(--ink)",
              borderRadius: "999px",
              color: "var(--ink)",
              boxShadow: "1.5px 1.5px 0 var(--ink)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            {locationCount}
          </div>
        </div>
        <div className="flex flex-col gap-0.5 px-3 py-2.5">
          <h3
            className="text-[1.02rem] font-semibold tracking-tight leading-tight line-clamp-2"
            style={{ color: "var(--ink)" }}
          >
            {trip.name}
          </h3>
          <span
            className="text-[0.75rem] font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            {dateStr ?? "tarih yok"}
          </span>
        </div>
      </article>
    </Link>
  );
}

function EmptyCover() {
  return (
    <div
      className="w-full h-full flex items-center justify-center text-4xl"
    >
      🌴
    </div>
  );
}

function formatDates(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  const fmt = (s: string) => {
    const d = new Date(s);
    return d
      .toLocaleDateString("tr-TR", { day: "numeric", month: "short" })
      .toLowerCase();
  };
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt((start ?? end) as string);
}
