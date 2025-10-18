import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

type PushConfig = {
  enabled: boolean;
  publicKey: string | null;
};

type PushStatus =
  | "idle"
  | "no-support"
  | "missing-key"
  | "ready"
  | "errored";

function urlBase64ToUint8Array(base64String: string) {
  if (typeof window === "undefined") {
    return new Uint8Array();
  }
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);

  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const [config, setConfig] = useState<PushConfig | null>(null);
  const [status, setStatus] = useState<PushStatus>(isSupported ? "idle" : "no-support");
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasSyncedRef = useRef(false);

  // Fetch push configuration from server
  useEffect(() => {
    if (!isSupported) {
      setStatus("no-support");
      return;
    }

    let cancelled = false;

    async function loadConfig() {
      try {
        const response = await apiRequest("GET", "/api/push-subscriptions/vapid-public-key");
        const data: { publicKey: string } = await response.json();
        if (cancelled) return;
        setConfig({
          enabled: !!data.publicKey,
          publicKey: data.publicKey || null
        });
        if (!data.publicKey) {
          setStatus("missing-key");
        } else {
          setStatus("ready");
        }
      } catch (err) {
        console.warn("[Push] Unable to fetch push configuration:", err);
        if (!cancelled) {
          setStatus("errored");
        }
      }
    }

    loadConfig();

    return () => {
      cancelled = true;
    };
  }, [isSupported]);

  // Sync existing subscription with backend when config is ready
  useEffect(() => {
    if (!isSupported || !config?.enabled || hasSyncedRef.current) {
      return;
    }

    let cancelled = false;

    async function syncExistingSubscription() {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (cancelled) return;

        setIsSubscribed(!!subscription);

        if (subscription) {
          try {
            await apiRequest("POST", "/api/push-subscriptions/subscribe", subscription.toJSON());
            hasSyncedRef.current = true;
          } catch (err) {
            console.warn("[Push] Failed to sync existing subscription:", err);
          }
        }
      } catch (err) {
        console.warn("[Push] Error checking subscription:", err);
      }
    }

    syncExistingSubscription();

    return () => {
      cancelled = true;
    };
  }, [config, isSupported]);

  const subscribe = useCallback(async () => {
    setError(null);

    if (!isSupported) {
      setError("Este navegador não suporta notificações push.");
      return;
    }

    if (!config?.enabled || !config.publicKey) {
      setError("Notificações push não estão habilitadas neste ambiente.");
      return;
    }

    try {
      if (permission === "default") {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== "granted") {
          setError("Permissão para notificações negada.");
          return;
        }
      } else if (permission === "denied") {
        setError("Permissão para notificações bloqueada no navegador.");
        return;
      }

      setIsBusy(true);
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(config.publicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
      }

      await apiRequest("POST", "/api/push-subscriptions/subscribe", subscription.toJSON());

      setPermission("granted");
      setIsSubscribed(true);
      hasSyncedRef.current = true;
    } catch (err: any) {
      console.error("[Push] Failed to subscribe:", err);
      setError(err?.message ?? "Não foi possível ativar as notificações push.");
    } finally {
      setIsBusy(false);
    }
  }, [config, isSupported, permission]);

  const unsubscribe = useCallback(async () => {
    setError(null);

    if (!isSupported) {
      return;
    }

    try {
      setIsBusy(true);
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setIsSubscribed(false);
        return;
      }

      await subscription.unsubscribe();
      await apiRequest("POST", "/api/push-subscriptions/unsubscribe", {
        endpoint: subscription.endpoint
      });

      setIsSubscribed(false);
    } catch (err: any) {
      console.error("[Push] Failed to unsubscribe:", err);
      setError(err?.message ?? "Não foi possível desativar as notificações push.");
    } finally {
      setIsBusy(false);
    }
  }, [isSupported]);

  const state = useMemo(
    () => ({
      isSupported,
      config,
      status,
      permission,
      isSubscribed,
      isBusy,
      error,
      subscribe,
      unsubscribe
    }),
    [config, error, isBusy, isSubscribed, isSupported, permission, status, subscribe, unsubscribe]
  );

  return state;
}
