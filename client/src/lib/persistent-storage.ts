const PRESERVED_LOCAL_STORAGE_KEYS = [
  "token",
  "auth_token",
  "session_token",
  "mesc_mobile_device_id",
  "mesc_mobile_refresh_token",
  "mesc_mobile_refresh_token_expires_at",
  "mesc_mobile_active_community_id",
  "mesc_mobile_communities",
  "mesc_mobile_platform",
  "mesc_mobile_app_version",
  "mesc_biometric_login_enabled",
  "mesc-ui-theme",
  "theme",
  "userId",
  "app_version",
  "mesc-app-version",
  "app-cache-version",
  "minister-tutorial-dismissed",
  "mesc_sound_enabled",
  "mesc_skip_auto_biometric_once",
  "mesc_auto_biometric_last_attempt_at",
];
const SKIP_AUTO_BIOMETRIC_KEY = "mesc_skip_auto_biometric_once";
const AUTO_BIOMETRIC_ATTEMPTED_KEY = "mesc_auto_biometric_attempted";
const AUTO_BIOMETRIC_LAST_ATTEMPT_KEY = "mesc_auto_biometric_last_attempt_at";
const AUTO_BIOMETRIC_COOLDOWN_MS = 5 * 60 * 1000;
const PRESERVED_SESSION_STORAGE_KEYS = [
  AUTO_BIOMETRIC_ATTEMPTED_KEY,
];

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

  const preservedSessionEntries = PRESERVED_SESSION_STORAGE_KEYS
    .map((key) => [key, sessionStorage.getItem(key)] as const)
    .filter((entry): entry is readonly [string, string] => entry[1] !== null);

  localStorage.removeItem("token");
  localStorage.removeItem("auth_token");
  localStorage.removeItem("session_token");
  localStorage.removeItem("user");
  localStorage.removeItem("mesc_mobile_refresh_token");
  localStorage.removeItem("mesc_mobile_refresh_token_expires_at");
  localStorage.removeItem("mesc_mobile_active_community_id");
  localStorage.removeItem("mesc_mobile_communities");
  localStorage.removeItem("mesc_mobile_platform");
  localStorage.removeItem("mesc_mobile_app_version");
  sessionStorage.clear();
  preservedSessionEntries.forEach(([key, value]) => {
    sessionStorage.setItem(key, value);
  });
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

export function markAutoBiometricAttempt(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(AUTO_BIOMETRIC_ATTEMPTED_KEY, "true");
  localStorage.setItem(AUTO_BIOMETRIC_LAST_ATTEMPT_KEY, Date.now().toString());
}

export function hasAutoBiometricAttempted(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(AUTO_BIOMETRIC_ATTEMPTED_KEY) === "true";
}

export function isAutoBiometricCooldownActive(now = Date.now()): boolean {
  if (typeof window === "undefined") return false;

  const stored = Number(localStorage.getItem(AUTO_BIOMETRIC_LAST_ATTEMPT_KEY));
  if (!Number.isFinite(stored) || stored <= 0) {
    localStorage.removeItem(AUTO_BIOMETRIC_LAST_ATTEMPT_KEY);
    return false;
  }

  const elapsed = now - stored;
  if (elapsed < 0) return true;

  const active = elapsed < AUTO_BIOMETRIC_COOLDOWN_MS;
  if (!active) {
    localStorage.removeItem(AUTO_BIOMETRIC_LAST_ATTEMPT_KEY);
  }
  return active;
}

export function clearAutoBiometricAttempt(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(AUTO_BIOMETRIC_ATTEMPTED_KEY);
  localStorage.removeItem(AUTO_BIOMETRIC_LAST_ATTEMPT_KEY);
}
