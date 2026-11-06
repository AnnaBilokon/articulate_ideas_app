"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removePushSubscription, savePushSubscription, sendTestReminder } from "./actions";

// Turns on push reminders for this device: a notification 5 minutes before
// each block, even when the app is closed. On an iPhone this works only in the
// app opened from the home screen.

type State = "checking" | "unsupported" | "install" | "denied" | "off" | "on";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

// The key in the form pushManager.subscribe wants.
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function deviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac/.test(ua)) return "Mac";
  return "Browser";
}

async function registration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

export function Reminders() {
  const [state, setState] = useState<State>("checking");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && PUBLIC_KEY;
    if (!supported) {
      // Safari on an iPhone has push only for apps added to the home screen.
      const iOS = /iPhone|iPad/.test(navigator.userAgent);
      queueMicrotask(() => setState(iOS ? "install" : "unsupported"));
      return;
    }
    registration()
      .then((reg) => reg.pushManager.getSubscription())
      .then(async (subscription) => {
        if (subscription && Notification.permission === "granted") {
          // Saved again, in case the server forgot it.
          await savePushSubscription(subscription.toJSON(), deviceName());
          setEndpoint(subscription.endpoint);
          setState("on");
        } else setState(Notification.permission === "denied" ? "denied" : "off");
      })
      .catch(() => setState("unsupported"));
  }, []);

  const turnOn = () =>
    start(async () => {
      setMessage(null);
      // Asked straight from the tap: an iPhone allows it only then.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      try {
        const reg = await registration();
        const subscription =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }));
        const result = await savePushSubscription(subscription.toJSON(), deviceName());
        if (result.error) return setMessage(result.error);
        setEndpoint(subscription.endpoint);
        setState("on");
        setMessage("Reminders are on for this device.");
      } catch {
        setMessage("This device couldn't turn on reminders. Try again.");
      }
    });

  const turnOff = () =>
    start(async () => {
      setMessage(null);
      const reg = await registration();
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setEndpoint(null);
      setState("off");
    });

  const test = () =>
    start(async () => {
      if (!endpoint) return;
      const result = await sendTestReminder(endpoint);
      setMessage(result.error ?? "Sent. It should show in a few seconds.");
    });

  if (state === "checking") return null;

  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-muted/60 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {state === "on" ? <Bell className="size-4 text-primary" /> : <BellOff className="size-4 text-muted-foreground" />}
        <span className="mr-auto">
          {state === "on"
            ? "Reminders on for this device: 5 minutes before each block."
            : state === "install"
              ? "For reminders on your iPhone, open the app from its home-screen icon (Share, then Add to Home Screen), then turn them on there."
              : state === "denied"
                ? "Notifications are blocked for this app. Allow them in your device's settings, then come back."
                : state === "unsupported"
                  ? "This browser can't show reminders."
                  : "Get a reminder 5 minutes before each block, even when the app is closed."}
        </span>
        {state === "off" && (
          <Button size="sm" onClick={turnOn} disabled={pending}>
            {pending && <Loader2 className="size-3.5 animate-spin" />} Turn on
          </Button>
        )}
        {state === "on" && (
          <span className="flex gap-1">
            <Button size="sm" variant="outline" onClick={test} disabled={pending}>
              {pending && <Loader2 className="size-3.5 animate-spin" />} Send a test
            </Button>
            <Button size="sm" variant="ghost" onClick={turnOff} disabled={pending}>
              Turn off
            </Button>
          </span>
        )}
      </div>
      {message && (
        <p className="text-muted-foreground" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
