"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Bell, BellOff } from "lucide-react";
import {
  saveSubscription,
  deleteSubscription,
} from "@/app/actions/push";

type State = "unsupported" | "loading" | "off" | "on" | "denied";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (!reg) {
        setState("off");
        return;
      }
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    } catch {
      setState("off");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enable = async () => {
    setErr(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg =
        (await navigator.serviceWorker.getRegistration("/sw.js")) ||
        (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!pubKey) {
        setErr("vapid key yok");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pubKey) as BufferSource,
      });
      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setErr("abonelik alınamadı");
        return;
      }
      startTransition(async () => {
        const r = await saveSubscription({
          endpoint: json.endpoint!,
          keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
        });
        if (!r.ok) {
          setErr(r.error ?? "kayıt başarısız");
          return;
        }
        setState("on");
      });
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const disable = async () => {
    setErr(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        startTransition(async () => {
          await deleteSubscription(endpoint);
          setState("off");
        });
      } else {
        setState("off");
      }
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  if (state === "loading") return null;

  const isOn = state === "on";
  const disabled = pending || state === "unsupported" || state === "denied";

  return (
    <div className="flex items-center justify-between p-4 gap-3">
      <div className="flex flex-col gap-0.5">
        <div
          className="text-[1.02rem] font-semibold tracking-tight"
          style={{ color: "var(--ink)" }}
        >
          bildirim
        </div>
        <div
          className="text-[0.82rem] font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          {state === "unsupported"
            ? "bu cihazda yok"
            : state === "denied"
            ? "tarayıcıdan engellenmiş"
            : isOn
            ? "açık — yeni eklemelerde ses çıkarır"
            : "kapalı"}
        </div>
        {err && (
          <div className="text-[0.75rem]" style={{ color: "var(--danger)" }}>
            {err}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={isOn ? disable : enable}
        disabled={disabled}
        className={isOn ? "btn-ghost" : "btn-primary"}
        style={{ padding: "0.55rem 1rem", fontSize: "0.85rem" }}
      >
        {isOn ? <BellOff size={14} strokeWidth={2} /> : <Bell size={14} strokeWidth={2} />}
        {isOn ? "kapat" : "aç"}
      </button>
    </div>
  );
}
