import * as Sentry from "@sentry/react";

function isPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "" ||
    normalized.includes("your_sentry_dsn_here") ||
    normalized.includes("change_me") ||
    normalized.includes("placeholder")
  );
}

export function initClientErrorMonitoring(): boolean {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn || isPlaceholder(dsn)) {
    return false;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,
    sendDefaultPii: false,
  });

  return true;
}

export const SentryErrorBoundary = Sentry.ErrorBoundary;
