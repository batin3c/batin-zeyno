import Link from "next/link";
import type { Trip } from "@/lib/types";

// deterministic tilt per id so SSR and client agree
function tiltFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return (((Math.abs(h) % 11) - 5) * 0.28);
}

export function TripCard({
  trip,
  locationCount,
  index = 0,
}: {
  trip: Trip;
  locationCount: number;
  index?: number;
}) {
  const tilt = tiltFor(trip.id);
  const dateStr = formatDates(trip.start_date, trip.end_date);
  const stampDate = formatStamp(trip.start_date ?? trip.created_at);

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group block animate-rise"
      style={{
        animationDelay: `${index * 70}ms`,
        transform: `rotate(${tilt}deg)`,
        transformOrigin: "center",
      }}
    >
      <article
        className="relative transition-transform duration-300 group-hover:rotate-0 group-active:scale-[0.98]"
        style={{
          background: "color-mix(in srgb, var(--paper-soft) 90%, #fff)",
          boxShadow: `
            0 1px 0 rgba(28,24,20,0.04),
            0 10px 30px rgba(28,24,20,0.12),
            0 2px 8px rgba(28,24,20,0.06)
          `,
          transform: `rotate(${-tilt}deg)`,
          transformOrigin: "center",
          padding: "0.75rem 0.75rem 1.1rem",
        }}
      >
        {/* stamp badge — tilted postal stamp in corner */}
        <div
          className="absolute -top-2 -right-2 z-10 flex flex-col items-center justify-center"
          style={{
            transform: "rotate(8deg)",
            background: "var(--paper)",
            border: "1.5px solid var(--stamp)",
            padding: "0.25rem 0.55rem",
            minWidth: "52px",
            fontFamily: "var(--font-dm-mono), monospace",
            color: "var(--stamp)",
          }}
        >
          <span
            className="text-[0.55rem] font-medium tracking-[0.15em] uppercase leading-none"
            style={{ opacity: 0.9 }}
          >
            trip
          </span>
          <span className="text-[0.9rem] font-semibold leading-tight mt-0.5">
            {stampDate}
          </span>
        </div>

        <div
          className="relative aspect-[5/3] w-full overflow-hidden"
          style={{
            boxShadow: "inset 0 0 0 1px rgba(28,24,20,0.08)",
          }}
        >
          {trip.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trip.cover_url}
              alt={trip.name}
              className="w-full h-full object-cover"
              style={{ filter: "saturate(0.92) contrast(1.02)" }}
            />
          ) : (
            <NoCoverPattern />
          )}
          {/* sepia overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(180deg, transparent 70%, rgba(28,24,20,0.12) 100%)",
            }}
          />
        </div>

        <div className="px-1 pt-3 flex flex-col gap-2">
          <h3 className="font-serif italic text-[1.35rem] leading-tight text-[color:var(--ink)]">
            {trip.name}
          </h3>
          <div className="dashed-rule" />
          <div className="flex items-center justify-between label-mono">
            <span>{dateStr ?? "tarih yok"}</span>
            <span>
              {locationCount} {locationCount === 1 ? "yer" : "yer"}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function NoCoverPattern() {
  return (
    <div
      className="w-full h-full flex items-center justify-center relative"
      style={{
        background:
          "repeating-linear-gradient(135deg, var(--paper-soft) 0px, var(--paper-soft) 14px, color-mix(in srgb, var(--faded) 25%, var(--paper-soft)) 14px, color-mix(in srgb, var(--faded) 25%, var(--paper-soft)) 15px)",
      }}
    >
      <span
        className="font-serif italic text-5xl"
        style={{ color: "var(--ink-soft)", opacity: 0.55 }}
      >
        ·  ·  ·
      </span>
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

function formatStamp(iso: string): string {
  const d = new Date(iso);
  const m = d.toLocaleDateString("tr-TR", { month: "short" }).slice(0, 3);
  return `${m} '${String(d.getFullYear()).slice(-2)}`;
}
