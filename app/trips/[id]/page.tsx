import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import { requireCurrentMember, getMembers } from "@/lib/dal";
import { AppHeader } from "@/components/app-header";
import { TripDetailClient } from "@/components/trip-detail-client";
import { EditTripButton } from "@/components/edit-trip-dialog";
import { fetchRatesToTRY } from "@/lib/currency";
import type { Trip, Location } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireCurrentMember();

  const { data: trip } = await db
    .from("trips")
    .select("*")
    .eq("id", id)
    .single();
  if (!trip) notFound();

  const { data: locations } = await db
    .from("locations")
    .select("*")
    .eq("trip_id", id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const members = await getMembers();
  const tripTyped = trip as Trip;
  const locs = (locations ?? []) as Location[];

  // compute TRY total of tracked expenses
  const currencyCodes = locs
    .map((l) => l.currency)
    .filter((c): c is string => !!c);
  const rates = await fetchRatesToTRY(currencyCodes);
  let expenseTRY = 0;
  for (const l of locs) {
    if (l.amount != null && l.currency) {
      const rate = rates[l.currency] ?? null;
      if (rate) expenseTRY += Number(l.amount) * rate;
    }
  }

  return (
    <>
      <AppHeader
        member={me}
        title={tripTyped.name}
        back="/tatiller"
        right={<EditTripButton trip={tripTyped} />}
      />
      <TripDetailClient
        tripId={tripTyped.id}
        locations={locs}
        members={members}
        currentMemberId={me.id}
        expenseTRY={Math.round(expenseTRY)}
      />
    </>
  );
}
