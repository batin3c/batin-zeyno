import { db } from "@/lib/supabase";
import { requireCurrentMember } from "@/lib/dal";
import { AppHeader } from "@/components/app-header";
import { TripCard } from "@/components/trip-card";
import { CreateTripButton } from "@/components/create-trip-dialog";
import type { Trip } from "@/lib/types";

export const dynamic = "force-dynamic";

type HomeStats = {
  trips: number;
  locations: number;
  visited: number;
  loves: number;
  countries: number;
  cities: number;
};

async function loadHome(): Promise<{
  trips: { trip: Trip; count: number }[];
  stats: HomeStats;
}> {
  const { data: trips, error } = await db
    .from("trips")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const list = (trips ?? []) as Trip[];

  const counts = new Map<string, number>();
  let locations = 0;
  let visited = 0;
  let loves = 0;
  if (list.length > 0) {
    const { data: locs } = await db
      .from("locations")
      .select("trip_id, status, loved_by")
      .in(
        "trip_id",
        list.map((t) => t.id)
      );
    for (const l of locs ?? []) {
      counts.set(l.trip_id, (counts.get(l.trip_id) ?? 0) + 1);
      locations++;
      if (l.status === "visited") visited++;
      if (Array.isArray(l.loved_by)) loves += l.loved_by.length;
    }
  }

  const [{ count: countryCount }, { count: cityCount }] = await Promise.all([
    db
      .from("visited_countries")
      .select("code", { count: "exact", head: true }),
    db
      .from("visited_cities")
      .select("id", { count: "exact", head: true }),
  ]);

  const tripsOut = list.map((t) => ({ trip: t, count: counts.get(t.id) ?? 0 }));
  const stats: HomeStats = {
    trips: list.length,
    locations,
    visited,
    loves,
    countries: countryCount ?? 0,
    cities: cityCount ?? 0,
  };
  return { trips: tripsOut, stats };
}

export default async function HomePage() {
  const me = await requireCurrentMember();
  const { trips, stats } = await loadHome();

  return (
    <>
      <AppHeader member={me} />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 pt-8 pb-32">
        <div className="flex items-end justify-between mb-6 anim-reveal">
          <div>
            <span className="label">arşiv</span>
            <h1
              className="display mt-2"
              style={{ fontSize: "2.75rem", color: "var(--ink)" }}
            >
              tatiller
            </h1>
          </div>
          <div
            className="flex items-center justify-center font-bold"
            style={{
              minWidth: "44px",
              height: "44px",
              padding: "0 12px",
              background: "var(--accent-3-soft)",
              border: "2px solid var(--ink)",
              borderRadius: "999px",
              fontSize: "0.95rem",
              color: "var(--ink)",
              boxShadow: "var(--shadow-pop-sm)",
            }}
          >
            {trips.length.toString().padStart(2, "0")}
          </div>
        </div>

        {trips.length > 0 && (
          <StatsStrip stats={stats} />
        )}

        {trips.length === 0 ? (
          <EmptyState memberName={me.name} />
        ) : (
          <div className="flex flex-col gap-4 sm:gap-5">
            {trips.map(({ trip, count }, i) => (
              <TripCard
                key={trip.id}
                trip={trip}
                locationCount={count}
                index={i}
              />
            ))}
          </div>
        )}
      </main>
      <CreateTripButton />
    </>
  );
}

function StatsStrip({ stats }: { stats: HomeStats }) {
  const items = [
    { label: "yer", value: stats.locations, bg: "var(--accent-soft)" },
    { label: "gittik", value: stats.visited, bg: "var(--accent-2-soft)" },
    { label: "ülke", value: stats.countries, bg: "var(--accent-3-soft)" },
    { label: "şehir", value: stats.cities, bg: "var(--accent-4-soft)" },
    { label: "♡", value: stats.loves, bg: "var(--surface-soft)" },
  ];
  return (
    <div
      className="grid grid-cols-5 gap-1.5 mb-6 anim-reveal"
      style={{ animationDelay: "60ms" }}
    >
      {items.map((it) => (
        <div
          key={it.label}
          className="flex flex-col items-center justify-center py-2"
          style={{
            background: it.bg,
            border: "2px solid var(--ink)",
            borderRadius: "12px",
            boxShadow: "var(--shadow-pop-sm)",
          }}
        >
          <span
            className="font-bold leading-none"
            style={{ fontSize: "1.15rem", color: "var(--ink)" }}
          >
            {it.value}
          </span>
          <span
            className="text-[0.62rem] font-semibold mt-0.5"
            style={{
              color: "var(--ink-soft)",
              letterSpacing: "0.04em",
            }}
          >
            {it.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ memberName }: { memberName: string }) {
  return (
    <div
      className="flex flex-col items-center py-10 gap-5 anim-reveal max-w-sm mx-auto text-center"
      style={{
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "24px",
        boxShadow: "var(--shadow-pop)",
        padding: "2.5rem 1.5rem",
      }}
    >
      <div style={{ fontSize: "4rem", lineHeight: 1 }}>🏖️</div>
      <div className="flex flex-col gap-2">
        <h3
          className="font-bold tracking-tight"
          style={{ fontSize: "1.5rem", color: "var(--ink)" }}
        >
          naaber {memberName.toLowerCase()}
        </h3>
        <p
          className="text-[0.95rem] leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          daha hiçbir yere gitmemişiz aq. aşağıdan{" "}
          <span style={{ color: "var(--ink)", fontWeight: 600 }}>yeni tatil</span>&apos;e
          bas da başlayalım.
        </p>
      </div>
    </div>
  );
}
