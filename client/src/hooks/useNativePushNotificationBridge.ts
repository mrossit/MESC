import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import type { ActionPerformed, PushNotificationSchema } from "@capacitor/push-notifications";
import { useLocation } from "wouter";
import { isNativeRuntime } from "@/lib/api-url";
import { ensureNativePushChannel } from "@/hooks/usePushNotifications";

function isNativePushRuntime() {
  if (typeof window === "undefined" || !isNativeRuntime()) return false;
  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function safeInternalPath(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  return trimmed;
}

function getNotificationPath(notification: PushNotificationSchema) {
  const data = asRecord(notification.data);
  return (
    safeInternalPath(data.url)
    || safeInternalPath(data.path)
    || safeInternalPath(data.route)
    || safeInternalPath(notification.link)
    || null
  );
}

export function useNativePushNotificationBridge() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isNativePushRuntime()) return;

    let cancelled = false;
    let receivedHandle: PluginListenerHandle | undefined;
    let actionHandle: PluginListenerHandle | undefined;

    async function setupBridge() {
      try {
        await ensureNativePushChannel();

        receivedHandle = await PushNotifications.addListener("pushNotificationReceived", (notification) => {
          window.dispatchEvent(new CustomEvent("mesc:native-push-received", { detail: notification }));
        });

        actionHandle = await PushNotifications.addListener("pushNotificationActionPerformed", (action: ActionPerformed) => {
          window.dispatchEvent(new CustomEvent("mesc:native-push-action", { detail: action }));

          const path = getNotificationPath(action.notification);
          if (path && !cancelled) {
            setLocation(path);
          }
        });
      } catch (error) {
        console.warn("[Push] Native notification bridge failed:", error);
      }
    }

    void setupBridge();

    return () => {
      cancelled = true;
      void receivedHandle?.remove();
      void actionHandle?.remove();
    };
  }, [setLocation]);
}
