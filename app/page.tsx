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
        <div className="flex items-end justify-between mb-8 anim-reveal">
          <div>
            <span className="label">arşiv</span>
            <h1 className="display text-[2.4rem] mt-2">tatiller</h1>
          </div>
          <span className="label-dim pb-1">
            {trips.length.toString().padStart(2, "0")}
          </span>
        </div>

        {trips.length === 0 ? (
          <EmptyState memberName={me.name} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-5">
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
    <div className="flex flex-col items-start py-10 gap-4 anim-reveal max-w-sm">
      <div
        className="w-14 h-14 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--accent) 35%, transparent), transparent 70%)",
        }}
      />
      <div className="flex flex-col gap-1">
        <h3 className="text-[1.4rem] font-medium tracking-tight">
          selam {memberName.toLowerCase()}
        </h3>
        <p
          className="text-[0.95rem] leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          henüz bir rota çizilmemiş. aşağıdaki{" "}
          <span style={{ color: "var(--text)" }}>yeni tatil</span> düğmesine bas,
          ilk günlüğü aç.
        </p>
      </div>
    </div>
  );
}
