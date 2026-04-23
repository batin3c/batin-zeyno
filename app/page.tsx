import { db } from "@/lib/supabase";
import { requireCurrentMember } from "@/lib/dal";
import { AppHeader } from "@/components/app-header";
import { TripCard } from "@/components/trip-card";
import { CreateTripButton } from "@/components/create-trip-dialog";
import type { Trip } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadTrips() {
  const { data: trips, error } = await db
    .from("trips")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const list = (trips ?? []) as Trip[];

  const counts = new Map<string, number>();
  if (list.length > 0) {
    const { data: locs } = await db
      .from("locations")
      .select("trip_id")
      .in(
        "trip_id",
        list.map((t) => t.id)
      );
    for (const l of locs ?? []) {
      counts.set(l.trip_id, (counts.get(l.trip_id) ?? 0) + 1);
    }
  }
  return list.map((t) => ({ trip: t, count: counts.get(t.id) ?? 0 }));
}

export default async function HomePage() {
  const me = await requireCurrentMember();
  const trips = await loadTrips();

  return (
    <>
      <AppHeader member={me} />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 pt-6 pb-32">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-serif italic text-[2rem] leading-none text-[color:var(--ink)]">
            tatiller
          </h2>
          <span className="label-mono">
            {trips.length} {trips.length === 1 ? "kayıt" : "kayıt"}
          </span>
        </div>
        <div className="dashed-rule mb-6" />

        {trips.length === 0 ? (
          <EmptyState memberName={me.name} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-10 sm:gap-y-12">
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

function EmptyState({ memberName }: { memberName: string }) {
  return (
    <div className="flex flex-col items-center text-center py-16 gap-4 animate-rise">
      <div
        className="font-serif italic text-5xl"
        style={{ color: "var(--ink-soft)", opacity: 0.55 }}
      >
        —&nbsp;·&nbsp;—
      </div>
      <h3 className="font-serif italic text-2xl text-[color:var(--ink)]">
        selam {memberName.toLowerCase()},
      </h3>
      <p
        className="font-serif italic max-w-xs text-[color:var(--ink-soft)]"
        style={{ fontSize: "1.05rem" }}
      >
        henüz bir rota çizilmemiş. sağ alttaki <span className="ink-highlight">yeni tatil</span> düğmesine bas, ilk günlüğü aç.
      </p>
      <div className="dashed-rule w-24 mt-2" />
    </div>
  );
}
