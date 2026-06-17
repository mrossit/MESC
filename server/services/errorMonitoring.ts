import * as Sentry from "@sentry/node";

let monitoringEnabled = false;

function isPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "" ||
    normalized.includes("your_sentry_dsn_here") ||
    normalized.includes("change_me") ||
    normalized.includes("placeholder")
  );
}

export function initErrorMonitoring(): boolean {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn || isPlaceholder(dsn)) {
    monitoringEnabled = false;
    return false;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    release: process.env.APP_VERSION || process.env.npm_package_version,
    sendDefaultPii: false,
  });

  monitoringEnabled = true;
  return true;
}

export function captureError(
  error: unknown,
  context?: Parameters<typeof Sentry.captureException>[1],
): void {
  if (!monitoringEnabled) return;
  Sentry.captureException(error, context);
}

export function isErrorMonitoringEnabled(): boolean {
  return monitoringEnabled;
}
