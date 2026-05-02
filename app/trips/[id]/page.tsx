import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import { requireCurrentMember, getMembers } from "@/lib/dal";
import { AppHeader } from "@/components/app-header";
import { TripDetailClient } from "@/components/trip-detail-client";
import { EditTripButton } from "@/components/edit-trip-dialog";
import type { Trip, Location, Expense, Settlement } from "@/lib/types";

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

  const [{ data: locations }, { data: expensesRaw }, { data: settlementsRaw }] =
    await Promise.all([
      db
        .from("locations")
        .select("*")
        .eq("trip_id", id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      db
        .from("expenses")
        .select("*")
        .eq("trip_id", id)
        .order("spent_at", { ascending: false })
        .order("created_at", { ascending: false }),
      db
        .from("settlements")
        .select("*")
        .eq("trip_id", id)
        .order("settled_at", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

  const members = await getMembers();
  const tripTyped = trip as Trip;
  const locs = (locations ?? []) as Location[];
  const expenses = (expensesRaw ?? []).map((e) => ({
    ...(e as Expense),
    amount: Number((e as Expense).amount),
  })) as Expense[];
  const settlements = (settlementsRaw ?? []).map((s) => ({
    ...(s as Settlement),
    amount: Number((s as Settlement).amount),
  })) as Settlement[];

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
        expenses={expenses}
        settlements={settlements}
      />
    </>
  );
}
