"use server";

import webpush from "web-push";
import { db } from "@/lib/supabase";
import { requireCurrentMember } from "@/lib/dal";

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
  await requireCurrentMember();
  if (!endpoint) return { ok: false, error: "endpoint yok" };
  const { error } = await db
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

// send a push to every member EXCEPT the one who triggered (so the author
// doesn't get their own notification)
export async function notifyOthers(
  payload: PushPayload
): Promise<{ ok: boolean; sent: number }> {
  if (!configure()) return { ok: false, sent: 0 };
  const me = await requireCurrentMember();
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("*")
    .neq("member_id", me.id);
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
