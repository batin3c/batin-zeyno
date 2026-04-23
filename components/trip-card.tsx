import Link from "next/link";
import type { Trip } from "@/lib/types";

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

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group block anim-reveal"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <article
        className="flex flex-col gap-3 transition-transform duration-300 group-active:scale-[0.98]"
      >
        <div
          className="relative w-full aspect-[4/5] overflow-hidden"
          style={{
            borderRadius: "18px",
            background: "var(--surface-2)",
          }}
        >
          {trip.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trip.cover_url}
              alt={trip.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <EmptyCover />
          )}
          {/* minimal top gradient to keep any top-overlaid UI legible later */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, color-mix(in srgb, var(--text) 15%, transparent), transparent 45%)",
            }}
          />
          {/* count pill bottom-right */}
          <div
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 text-[0.7rem] font-medium"
            style={{
              background: "color-mix(in srgb, var(--bg) 80%, transparent)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              borderRadius: "999px",
              color: "var(--text)",
            }}
          >
            <span
              className="w-1 h-1 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            {locationCount}
          </div>
        </div>
        <div className="flex flex-col gap-1 px-0.5">
          <h3 className="text-[1.05rem] font-medium tracking-tight leading-tight text-[color:var(--text)] line-clamp-2">
            {trip.name}
          </h3>
          <span className="label-dim">
            {dateStr ?? "tarih belirlenmedi"}
          </span>
        </div>
      </article>
    </Link>
  );
}

function EmptyCover() {
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, var(--surface-2) 0%, var(--surface) 60%, var(--line-soft) 100%)",
      }}
    >
      <div
        className="w-12 h-12 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--accent) 30%, transparent), transparent 70%)",
        }}
      />
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
