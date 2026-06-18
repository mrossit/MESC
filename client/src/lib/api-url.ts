import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

const PRODUCTION_API_ORIGIN = "https://saojudastadeu.app";
const TRANSPARENT_STATUS_BAR_COLOR = "#00000000";

declare global {
  interface Window {
    __mescNativeApiFetchBridgeInstalled?: boolean;
  }
}

function normalizeOrigin(value?: string): string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "/") return "";
  return trimmed.replace(/\/+$/, "");
}

function isApiPath(value: string): boolean {
  return /^\/?api(?:[/?#]|$)/.test(value);
}

export function isNativeRuntime(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform() || window.location.protocol === "capacitor:";
}

export function getApiOrigin(): string {
  const configured = normalizeOrigin(import.meta.env.VITE_API_URL);
  if (configured) return configured;
  return isNativeRuntime() ? PRODUCTION_API_ORIGIN : "";
}

function isDarkThemeActive(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export async function syncNativeStatusBarStyle() {
  if (!isNativeRuntime()) return;

  const isDark = isDarkThemeActive();

  await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
  await StatusBar.setBackgroundColor({ color: TRANSPARENT_STATUS_BAR_COLOR });
}

async function configureNativeStatusBar() {
  if (!isNativeRuntime() || Capacitor.getPlatform() !== "ios") return;

  await StatusBar.show();
  await StatusBar.setOverlaysWebView({ overlay: true });
  await syncNativeStatusBarStyle();
}

export function apiUrl(path: string): string {
  if (!path) return path;
  if (/^(https?:|data:|blob:|mailto:|tel:)/i.test(path)) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!isApiPath(normalizedPath)) return normalizedPath;

  const origin = getApiOrigin();
  return origin ? `${origin}${normalizedPath}` : normalizedPath;
}

function rewriteNativeApiUrl(input: string): string {
  if (!isNativeRuntime()) return input;

  const origin = getApiOrigin();
  if (!origin) return input;

  if (isApiPath(input)) return `${origin}/${input.replace(/^\/+/, "")}`;
  if (input.startsWith("capacitor://localhost/api/") || input === "capacitor://localhost/api") {
    return input.replace("capacitor://localhost", origin);
  }

  return input;
}

function rewriteFetchInput(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input === "string") return rewriteNativeApiUrl(input);
  if (input instanceof URL) return new URL(rewriteNativeApiUrl(input.toString()));
  return input;
}

export function configureClientRuntime() {
  if (typeof window === "undefined") return;

  if (isNativeRuntime()) {
    const platform = Capacitor.getPlatform();
    document.documentElement.classList.add("capacitor-native", `capacitor-${platform}`);
    void configureNativeStatusBar().catch((error) => {
      console.warn("Native status bar configuration failed", error);
    });
  }

  if (window.__mescNativeApiFetchBridgeInstalled) return;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
    originalFetch(rewriteFetchInput(input), init);

  window.__mescNativeApiFetchBridgeInstalled = true;
}
