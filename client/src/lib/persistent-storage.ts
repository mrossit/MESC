const PRESERVED_LOCAL_STORAGE_KEYS = [
  "token",
  "auth_token",
  "session_token",
  "mesc_biometric_login_enabled",
  "mesc-ui-theme",
  "theme",
  "userId",
  "app_version",
  "mesc-app-version",
  "app-cache-version",
  "minister-tutorial-dismissed",
];
const SKIP_AUTO_BIOMETRIC_KEY = "mesc_skip_auto_biometric_once";

export function clearLocalStoragePreservingSession(): void {
  if (typeof window === "undefined") return;

  const preservedEntries = PRESERVED_LOCAL_STORAGE_KEYS
    .map((key) => [key, localStorage.getItem(key)] as const)
    .filter((entry): entry is readonly [string, string] => entry[1] !== null);

  localStorage.clear();

  preservedEntries.forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
}

export function clearLocalSession(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem("token");
  localStorage.removeItem("auth_token");
  localStorage.removeItem("session_token");
  localStorage.removeItem("user");
  sessionStorage.clear();
}

export function markSkipAutoBiometricOnce(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SKIP_AUTO_BIOMETRIC_KEY, "true");
}

export function consumeSkipAutoBiometricOnce(): boolean {
  if (typeof window === "undefined") return false;
  const shouldSkip = localStorage.getItem(SKIP_AUTO_BIOMETRIC_KEY) === "true";
  if (shouldSkip) {
    localStorage.removeItem(SKIP_AUTO_BIOMETRIC_KEY);
  }
  return shouldSkip;
}
