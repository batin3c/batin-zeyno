"use server";

import webpush from "web-push";
import { db } from "@/lib/supabase";
import { requireCurrentMember, requireActiveGroupId } from "@/lib/dal";

function configure() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:baze@example.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function saveSubscription(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<{ ok: boolean; error?: string }> {
  const me = await requireCurrentMember();
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return { ok: false, error: "bozuk abonelik" };
  }
  const { error } = await db.from("push_subscriptions").upsert(
    {
      member_id: me.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteSubscription(
  endpoint: string
): Promise<{ ok: boolean; error?: string }> {
  const me = await requireCurrentMember();
  if (!endpoint) return { ok: false, error: "endpoint yok" };
  const { error } = await db
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("member_id", me.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

// send a push to every member of the ACTIVE GROUP except the one who
// triggered (so the author doesn't get their own notification, and members
// of unrelated groups don't get spammed about activity they can't see)
export async function notifyOthers(
  payload: PushPayload
): Promise<{ ok: boolean; sent: number }> {
  if (!configure()) return { ok: false, sent: 0 };
  const me = await requireCurrentMember();
  const groupId = await requireActiveGroupId();
  const { data: gms } = await db
    .from("group_members")
    .select("member_id")
    .eq("group_id", groupId);
  const recipientIds = (gms ?? [])
    .map((g: { member_id: string }) => g.member_id)
    .filter((id: string) => id !== me.id);
  if (recipientIds.length === 0) return { ok: true, sent: 0 };
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("*")
    .in("member_id", recipientIds);
  if (!subs || subs.length === 0) return { ok: true, sent: 0 };

  let sent = 0;
  const deadEndpoints: string[] = [];
  for (const s of subs as Array<{
    endpoint: string;
    p256dh: string;
    auth: string;
  }>) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload)
      );
      sent++;
    } catch (e: unknown) {
      const err = e as { statusCode?: number };
      if (err.statusCode === 404 || err.statusCode === 410) {
        deadEndpoints.push(s.endpoint);
      }
    }
  }
  if (deadEndpoints.length > 0) {
    await db
      .from("push_subscriptions")
      .delete()
      .in("endpoint", deadEndpoints);
  }
  return { ok: true, sent };
}

// Send a push to a specific list of member ids (cross-group). Used by social
// actions (reactions / comments / follows) where the recipients aren't bound
// to the active group — the followed user, the post author, etc.
export async function notifyMembers(
  memberIds: string[],
  payload: PushPayload
): Promise<{ ok: boolean; sent: number }> {
  if (!configure()) return { ok: false, sent: 0 };
  const ids = Array.from(new Set(memberIds.filter(Boolean)));
  if (ids.length === 0) return { ok: true, sent: 0 };
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("*")
    .in("member_id", ids);
  if (!subs || subs.length === 0) return { ok: true, sent: 0 };

  let sent = 0;
  const deadEndpoints: string[] = [];
  for (const s of subs as Array<{
    endpoint: string;
    p256dh: string;
    auth: string;
  }>) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload)
      );
      sent++;
    } catch (e: unknown) {
      const err = e as { statusCode?: number };
      if (err.statusCode === 404 || err.statusCode === 410) {
        deadEndpoints.push(s.endpoint);
      }
    }
  }
  if (deadEndpoints.length > 0) {
    await db
      .from("push_subscriptions")
      .delete()
      .in("endpoint", deadEndpoints);
  }
  return { ok: true, sent };
}
