import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import {
  requireCurrentMember,
  requireActiveGroupId,
  getActiveGroupMembers,
} from "@/lib/dal";
import { AppHeader } from "@/components/app-header";
import { TripDetailClient } from "@/components/trip-detail-client";
import { EditTripButton } from "@/components/edit-trip-dialog";
import { SharePostButton } from "@/components/share-post-dialog";
import type { Trip, Location } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireCurrentMember();
  const groupId = await requireActiveGroupId();

  // Filtering by group_id here also stops users from seeing another group's
  // trip by guessing the URL — they get a 404 instead.
  const { data: trip } = await db
    .from("trips")
    .select("*")
    .eq("id", id)
    .eq("group_id", groupId)
    .maybeSingle();
  if (!trip) notFound();

  const { data: locations } = await db
    .from("locations")
    .select("*")
    .eq("trip_id", id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const members = await getActiveGroupMembers();
  const tripTyped = trip as Trip;
  const locs = (locations ?? []) as Location[];

  return (
    <>
      <AppHeader
        member={me}
        title={tripTyped.name}
        back="/tatiller"
        right={
          <>
            <SharePostButton
              refType="trip"
              refId={tripTyped.id}
              existingPhotos={
                tripTyped.cover_url ? [{ url: tripTyped.cover_url }] : []
              }
              label="paylaş"
              buttonClassName="btn-chip"
              buttonStyle={{
                background: "var(--accent)",
                fontWeight: 700,
              }}
            />
            <EditTripButton trip={tripTyped} />
          </>
        }
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
