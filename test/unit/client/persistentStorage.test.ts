import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAutoBiometricAttempt,
  clearLocalStoragePreservingSession,
  clearLocalSession,
  hasAutoBiometricAttempted,
  isAutoBiometricCooldownActive,
  markSkipAutoBiometricOnce,
  markAutoBiometricAttempt,
} from "../../../client/src/lib/persistent-storage";

describe("persistent storage biometric guards", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it("preserves the auto biometric attempt flag when clearing the local session", () => {
    localStorage.setItem("token", "token-1");
    localStorage.setItem("auth_token", "token-1");
    sessionStorage.setItem("transient", "remove-me");

    markAutoBiometricAttempt();
    clearLocalSession();

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(sessionStorage.getItem("transient")).toBeNull();
    expect(hasAutoBiometricAttempted()).toBe(true);
    expect(isAutoBiometricCooldownActive()).toBe(true);
  });

  it("expires auto biometric cooldown and clears the persisted timestamp", () => {
    vi.setSystemTime(new Date("2026-06-23T12:00:00.000Z"));
    markAutoBiometricAttempt();

    expect(isAutoBiometricCooldownActive()).toBe(true);

    vi.setSystemTime(new Date("2026-06-23T12:06:00.000Z"));

    expect(isAutoBiometricCooldownActive()).toBe(false);
    expect(hasAutoBiometricAttempted()).toBe(false);
    expect(localStorage.getItem("mesc_auto_biometric_last_attempt_at")).toBeNull();
  });

  it("clears the biometric attempt guard after a successful unlock or refreshed password login", () => {
    markAutoBiometricAttempt();

    clearAutoBiometricAttempt();

    expect(hasAutoBiometricAttempted()).toBe(false);
    expect(isAutoBiometricCooldownActive()).toBe(false);
  });

  it("preserves biometric cooldown and skip flags during cache-version cleanup", () => {
    localStorage.setItem("obsolete", "remove-me");

    markAutoBiometricAttempt();
    markSkipAutoBiometricOnce();
    clearLocalStoragePreservingSession();

    expect(localStorage.getItem("obsolete")).toBeNull();
    expect(isAutoBiometricCooldownActive()).toBe(true);
    expect(localStorage.getItem("mesc_skip_auto_biometric_once")).toBe("true");
  });
});
