import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { apiRequest } from "@/lib/queryClient";
import { isNativeRuntime } from "@/lib/api-url";
import { mobileUpdateCurrentDevice } from "@/lib/mobile-auth-session";

type PushConfig = {
  enabled: boolean;
  publicKey: string | null;
};

export type PushStatus =
  | "idle"
  | "no-support"
  | "missing-key"
  | "ready"
  | "errored";

export type PushRuntime = "native" | "web";
export type PushPermissionState =
  | NotificationPermission
  | "prompt"
  | "prompt-with-rationale"
  | "granted"
  | "denied";

const NATIVE_PUSH_TOKEN_KEY = "mesc_native_push_token";
const NATIVE_PUSH_PROVIDER_KEY = "mesc_native_push_provider";
export const NATIVE_PUSH_CHANNEL_ID = "mesc_general";
const NATIVE_PUSH_REGISTRATION_TIMEOUT_MS = 20000;

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

function getStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

function getWebPushPermission(): PushPermissionState {
  return typeof Notification !== "undefined" ? Notification.permission : "default";
}

function isNativePushRuntime() {
  if (typeof window === "undefined" || !isNativeRuntime()) return false;
  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android";
}

function getNativePushProvider(): "apns" | "fcm" | null {
  const platform = Capacitor.getPlatform();
  if (platform === "ios") return "apns";
  if (platform === "android") return "fcm";
  return null;
}

export async function ensureNativePushChannel() {
  if (!isNativePushRuntime() || Capacitor.getPlatform() !== "android") return;

  await PushNotifications.createChannel({
    id: NATIVE_PUSH_CHANNEL_ID,
    name: "MESC",
    description: "Avisos sobre escalas, questionários, trocas e comunicados.",
    importance: 4,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: "#C5A059",
  });
}

function readStoredNativePushToken() {
  return getStorage()?.getItem(NATIVE_PUSH_TOKEN_KEY) ?? null;
}

function storeNativePushToken(token: string, provider: "apns" | "fcm") {
  const localStorage = getStorage();
  if (!localStorage) return;

  localStorage.setItem(NATIVE_PUSH_TOKEN_KEY, token);
  localStorage.setItem(NATIVE_PUSH_PROVIDER_KEY, provider);
}

function clearStoredNativePushToken() {
  const localStorage = getStorage();
  if (!localStorage) return;

  localStorage.removeItem(NATIVE_PUSH_TOKEN_KEY);
  localStorage.removeItem(NATIVE_PUSH_PROVIDER_KEY);
}

function normalizeNativePermission(value: string | undefined): PushPermissionState {
  if (value === "granted" || value === "denied" || value === "prompt-with-rationale") return value;
  return "prompt";
}

async function waitForNativeRegistrationToken() {
  let registrationHandle: PluginListenerHandle | undefined;
  let errorHandle: PluginListenerHandle | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const cleanup = () => {
    if (timeout) clearTimeout(timeout);
    void registrationHandle?.remove();
    void errorHandle?.remove();
  };

  return new Promise<string>(async (resolve, reject) => {
    const settle = (callback: () => void) => {
      cleanup();
      callback();
    };

    timeout = setTimeout(() => {
      settle(() => reject(new Error("Tempo esgotado ao registrar notificações do aparelho.")));
    }, NATIVE_PUSH_REGISTRATION_TIMEOUT_MS);

    try {
      registrationHandle = await PushNotifications.addListener("registration", (token) => {
        if (!token.value) {
          settle(() => reject(new Error("O aparelho não retornou um token de notificação.")));
          return;
        }
        settle(() => resolve(token.value));
      });

      errorHandle = await PushNotifications.addListener("registrationError", (registrationError) => {
        settle(() => reject(new Error(registrationError.error || "Falha ao registrar notificações do aparelho.")));
      });

      await PushNotifications.register();
    } catch (error) {
      settle(() => reject(error));
    }
  });
}

async function syncNativePushDevice(token: string, provider: "apns" | "fcm", enabled: boolean) {
  await mobileUpdateCurrentDevice({
    pushToken: enabled ? token : null,
    pushProvider: enabled ? provider : null,
    pushEnabled: enabled,
    notificationPreferences: {
      schedules: true,
      questionnaires: true,
      substitutions: true,
      announcements: true,
    },
  });
}

export interface PushNotificationsState {
  runtime: PushRuntime;
  isNative: boolean;
  isSupported: boolean;
  config: PushConfig | null;
  status: PushStatus;
  permission: PushPermissionState;
  isSubscribed: boolean;
  isBusy: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePushNotifications(): PushNotificationsState {
  const isNative = isNativePushRuntime();
  const runtime: PushRuntime = isNative ? "native" : "web";
  const isWebSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
  const isSupported = isNative || isWebSupported;

  const [config, setConfig] = useState<PushConfig | null>(null);
  const [status, setStatus] = useState<PushStatus>(isSupported ? "idle" : "no-support");
  const [permission, setPermission] = useState<PushPermissionState>(isNative ? "prompt" : getWebPushPermission());
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!isNative) return;

    let cancelled = false;
    async function setupNativePush() {
      try {
        setStatus("ready");
        await ensureNativePushChannel();

        const permissions = await PushNotifications.checkPermissions();
        if (cancelled) return;

        const nativePermission = normalizeNativePermission(permissions.receive);
        setPermission(nativePermission);

        const storedToken = readStoredNativePushToken();
        if (nativePermission === "granted" && storedToken) {
          setIsSubscribed(true);

          const provider = getNativePushProvider();
          if (provider && !hasSyncedRef.current) {
            await syncNativePushDevice(storedToken, provider, true).catch((syncError) => {
              console.warn("[Push] Failed to sync native token:", syncError);
            });
            hasSyncedRef.current = true;
          }
        }
      } catch (setupError) {
        console.warn("[Push] Native push setup failed:", setupError);
        if (!cancelled) {
          setStatus("errored");
          setError(setupError instanceof Error ? setupError.message : "Não foi possível inicializar notificações do aparelho.");
        }
      }
    }

    void setupNativePush();

    return () => {
      cancelled = true;
    };
  }, [isNative]);

  // Fetch push configuration from server
  useEffect(() => {
    if (isNative) {
      return;
    }

    if (!isWebSupported) {
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
  }, [isNative, isWebSupported]);

  // Sync existing subscription with backend when config is ready
  useEffect(() => {
    if (isNative || !isWebSupported || !config?.enabled || hasSyncedRef.current) {
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
  }, [config, isNative, isWebSupported]);

  const subscribe = useCallback(async () => {
    setError(null);

    if (isNative) {
      const provider = getNativePushProvider();
      if (!provider) {
        setError("Notificações nativas não estão disponíveis neste aparelho.");
        return;
      }

      try {
        setIsBusy(true);
        setStatus("ready");
        await ensureNativePushChannel();

        let nativePermission = normalizeNativePermission((await PushNotifications.checkPermissions()).receive);
        if (nativePermission === "prompt" || nativePermission === "prompt-with-rationale") {
          nativePermission = normalizeNativePermission((await PushNotifications.requestPermissions()).receive);
        }

        setPermission(nativePermission);
        if (nativePermission !== "granted") {
          setError("Permissão para notificações negada nas configurações do aparelho.");
          return;
        }

        const token = await waitForNativeRegistrationToken();
        await syncNativePushDevice(token, provider, true);
        storeNativePushToken(token, provider);
        setIsSubscribed(true);
        hasSyncedRef.current = true;
      } catch (err) {
        console.error("[Push] Failed to subscribe native device:", err);
        setStatus("errored");
        setError(err instanceof Error ? err.message : "Não foi possível ativar as notificações do aparelho.");
      } finally {
        setIsBusy(false);
      }
      return;
    }

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
    } catch (err) {
      console.error("[Push] Failed to subscribe:", err);
      setError(err instanceof Error ? err.message : "Não foi possível ativar as notificações push.");
    } finally {
      setIsBusy(false);
    }
  }, [config, isNative, isSupported, permission]);

  const unsubscribe = useCallback(async () => {
    setError(null);

    if (isNative) {
      try {
        setIsBusy(true);
        const provider = getNativePushProvider();
        const storedToken = readStoredNativePushToken();
        await PushNotifications.unregister().catch((unregisterError) => {
          console.warn("[Push] Native unregister failed:", unregisterError);
        });

        if (provider && storedToken) {
          await syncNativePushDevice(storedToken, provider, false);
        } else {
          await mobileUpdateCurrentDevice({
            pushToken: null,
            pushProvider: null,
            pushEnabled: false,
          });
        }

        clearStoredNativePushToken();
        setIsSubscribed(false);
        hasSyncedRef.current = false;
      } catch (err) {
        console.error("[Push] Failed to unsubscribe native device:", err);
        setError(err instanceof Error ? err.message : "Não foi possível desativar as notificações do aparelho.");
      } finally {
        setIsBusy(false);
      }
      return;
    }

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
    } catch (err) {
      console.error("[Push] Failed to unsubscribe:", err);
      setError(err instanceof Error ? err.message : "Não foi possível desativar as notificações push.");
    } finally {
      setIsBusy(false);
    }
  }, [isNative, isSupported]);

  const state: PushNotificationsState = useMemo(
    () => ({
      runtime,
      isNative,
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
    [config, error, isBusy, isNative, isSubscribed, isSupported, permission, runtime, status, subscribe, unsubscribe]
  );

  return state;
}
