import { Capacitor } from "@capacitor/core";
import {
  AccessControl,
  BiometryType,
  NativeBiometric,
  type AvailableResult,
} from "@capgo/capacitor-native-biometric";
import { isNativeRuntime } from "@/lib/api-url";
import {
  readStoredMobileAuthSession,
  restoreMobileAuthSession,
  type StoredMobileAuthSession,
} from "@/lib/mobile-auth-session";

const BIOMETRIC_SERVER = "app.saojudastadeu.mesc";
const BIOMETRIC_ENABLED_KEY = "mesc_biometric_login_enabled";

export interface NativeBiometricStatus {
  native: boolean;
  available: boolean;
  enabled: boolean;
  label: string;
  detail: string;
  biometryType?: BiometryType;
  strongBiometryAvailable?: boolean;
}

interface StoredSession {
  token: string;
  sessionToken?: string | null;
  mobile?: StoredMobileAuthSession | null;
  savedAt: string;
}

let unlockPromise: Promise<{ email: string; token: string }> | null = null;

function isEnabledFlagSet(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === "true";
}

function setEnabledFlag(enabled: boolean) {
  if (typeof window === "undefined") return;
  if (enabled) {
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
  } else {
    localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
  }
}

function biometricLabel(type?: BiometryType): string {
  switch (type) {
    case BiometryType.FACE_ID:
    case BiometryType.FACE_AUTHENTICATION:
      return "Face ID";
    case BiometryType.TOUCH_ID:
      return "Touch ID";
    case BiometryType.FINGERPRINT:
      return Capacitor.getPlatform() === "android" ? "impressao digital" : "Touch ID";
    case BiometryType.IRIS_AUTHENTICATION:
      return "biometria ocular";
    case BiometryType.DEVICE_CREDENTIAL:
      return "codigo do aparelho";
    case BiometryType.MULTIPLE:
      return "biometria";
    default:
      return "biometria";
  }
}

function unavailableDetail(result?: AvailableResult): string {
  if (!isNativeRuntime()) return "Disponivel somente no app instalado.";
  if (!result?.deviceIsSecure) return "Configure Face ID, Touch ID ou codigo no aparelho.";
  return "Biometria indisponivel neste aparelho.";
}

function readStoredSession(password: string): StoredSession {
  try {
    const parsed = JSON.parse(password) as StoredSession;
    if (parsed?.token) {
      return {
        token: parsed.token,
        sessionToken: parsed.sessionToken ?? null,
        mobile: parsed.mobile ?? null,
        savedAt: parsed.savedAt ?? new Date().toISOString(),
      };
    }
  } catch {
    // Backward-compatible fallback if an older build stored only the token.
  }

  return {
    token: password,
    sessionToken: null,
    savedAt: new Date().toISOString(),
  };
}

export async function getNativeBiometricStatus(): Promise<NativeBiometricStatus> {
  if (!isNativeRuntime()) {
    return {
      native: false,
      available: false,
      enabled: false,
      label: "biometria",
      detail: unavailableDetail(),
    };
  }

  try {
    const availability = await NativeBiometric.isAvailable({ useFallback: true });
    const saved = availability.isAvailable
      ? await NativeBiometric.isCredentialsSaved({ server: BIOMETRIC_SERVER }).catch(() => ({ isSaved: false }))
      : { isSaved: false };
    const label = biometricLabel(availability.biometryType);

    return {
      native: true,
      available: availability.isAvailable,
      enabled: isEnabledFlagSet() && saved.isSaved,
      label,
      detail: availability.isAvailable
        ? `Entrada rapida com ${label} neste aparelho.`
        : unavailableDetail(availability),
      biometryType: availability.biometryType,
      strongBiometryAvailable: availability.strongBiometryIsAvailable,
    };
  } catch {
    return {
      native: true,
      available: false,
      enabled: false,
      label: "biometria",
      detail: "Nao foi possivel consultar a biometria deste aparelho.",
    };
  }
}

export async function enableNativeBiometricLogin(email: string): Promise<NativeBiometricStatus> {
  const status = await getNativeBiometricStatus();
  if (!status.native) {
    throw new Error("Biometria disponivel somente no app instalado.");
  }
  if (!status.available) {
    throw new Error(status.detail);
  }

  const token = localStorage.getItem("token") || localStorage.getItem("auth_token");
  if (!token) {
    throw new Error("Entre com email e senha antes de ativar a biometria.");
  }

  const storedSession: StoredSession = {
    token,
    sessionToken: localStorage.getItem("session_token"),
    mobile: readStoredMobileAuthSession(),
    savedAt: new Date().toISOString(),
  };

  await NativeBiometric.setCredentials({
    username: email,
    password: JSON.stringify(storedSession),
    server: BIOMETRIC_SERVER,
    accessControl: AccessControl.BIOMETRY_ANY,
  });

  setEnabledFlag(true);
  return {
    ...status,
    enabled: true,
    detail: `Entrada rapida com ${status.label} neste aparelho.`,
  };
}

async function performNativeBiometricUnlock(): Promise<{ email: string; token: string }> {
  const status = await getNativeBiometricStatus();
  if (!status.native || !status.available || !status.enabled) {
    throw new Error(status.detail || "Entrada por biometria nao esta ativa.");
  }

  const credentials = await NativeBiometric.getSecureCredentials({
    server: BIOMETRIC_SERVER,
    reason: "Entrar no MESC Sao Judas Tadeu",
    title: `Entrar com ${status.label}`,
    subtitle: "Desbloqueie sua sessao salva",
    description: "Sua senha nao fica salva no app.",
    negativeButtonText: "Usar senha",
  });
  const storedSession = readStoredSession(credentials.password);

  if (storedSession.mobile) {
    restoreMobileAuthSession(storedSession.mobile);
  } else {
    localStorage.setItem("token", storedSession.token);
    localStorage.setItem("auth_token", storedSession.token);
    if (storedSession.sessionToken) {
      localStorage.setItem("session_token", storedSession.sessionToken);
    }
  }

  return {
    email: credentials.username,
    token: storedSession.token,
  };
}

export async function unlockNativeBiometricLogin(): Promise<{ email: string; token: string }> {
  if (unlockPromise) return unlockPromise;

  unlockPromise = performNativeBiometricUnlock().finally(() => {
    unlockPromise = null;
  });
  return unlockPromise;
}

export async function disableNativeBiometricLogin(): Promise<NativeBiometricStatus> {
  if (isNativeRuntime()) {
    await NativeBiometric.deleteCredentials({ server: BIOMETRIC_SERVER }).catch(() => undefined);
  }
  setEnabledFlag(false);
  return getNativeBiometricStatus();
}
