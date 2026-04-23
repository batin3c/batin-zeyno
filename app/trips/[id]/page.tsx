import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import { requireCurrentMember, getMembers } from "@/lib/dal";
import { AppHeader } from "@/components/app-header";
import { TripDetailClient } from "@/components/trip-detail-client";
import { EditTripButton } from "@/components/edit-trip-dialog";
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
    .order("visit_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const members = await getMembers();
  const tripTyped = trip as Trip;
  const locs = (locations ?? []) as Location[];

  return (
    <>
      <AppHeader
        member={me}
        title={tripTyped.name}
        back="/"
        right={<EditTripButton trip={tripTyped} />}
      />
      <TripDetailClient
        tripId={tripTyped.id}
        locations={locs}
        members={members}
        currentMemberId={me.id}
      />
    </>
  );
}
