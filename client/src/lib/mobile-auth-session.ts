import { Capacitor } from "@capacitor/core";
import { getApiOrigin, getStoredAuthToken, isNativeRuntime } from "@/lib/api-url";
import {
  MescMobileApiClient,
  MescMobileApiError,
  createMobileIdempotencyKey,
  type MobileAdminCommunityHomeResponse,
  type MobileAdminMinistersResponse,
  type MobileAdminSchedulePreviewResponse,
  type MobileAdminScheduleReadinessResponse,
  type MobileAdminQuestionnaireReminderPayload,
  type MobileAdminQuestionnaireReminderResponse,
  type MobileAdminQuestionnaireResponsesResponse,
  type MobileAccountDeletePayload,
  type MobileAccountDeleteResponse,
  type MobileAuthResponse,
  type MobileClientRequestOptions,
  type MobileDeviceResponse,
  type MobileDeviceUpdatePayload,
  type MobileDevicesResponse,
  type MobileFetch,
  type MobileLoginPayload,
  type MobileMeResponse,
  type MobileMissionHomeResponse,
  type MobileNotificationReadAllResponse,
  type MobileNotificationReadResponse,
  type MobileNotificationsResponse,
  type MobilePlatform,
  type MobileProfileResponse,
  type MobileProfileUpdatePayload,
  type MobileQuestionnaireCurrentResponse,
  type MobileQuestionnaireSubmitPayload,
  type MobileQuestionnaireSubmitResponse,
  type MobileScheduleConfirmPayload,
  type MobileScheduleConfirmResponse,
  type MobileSubstitutionClaimPayload,
  type MobileSubstitutionClaimResponse,
  type MobileScheduleMonthResponse,
  type MobileSubstitutionCreatePayload,
  type MobileSubstitutionCreateResponse,
  type MobileSubstitutionsResponse,
} from "@shared/mobileClient";

export const MOBILE_AUTH_STORAGE_KEYS = {
  deviceId: "mesc_mobile_device_id",
  refreshToken: "mesc_mobile_refresh_token",
  refreshTokenExpiresAt: "mesc_mobile_refresh_token_expires_at",
  activeCommunityId: "mesc_mobile_active_community_id",
  communities: "mesc_mobile_communities",
  platform: "mesc_mobile_platform",
  appVersion: "mesc_mobile_app_version",
} as const;

export interface StoredMobileAuthSession {
  accessToken: string;
  refreshToken: string | null;
  refreshTokenExpiresAt: string | null;
  sessionToken: string | null;
  activeCommunityId: string | null;
  deviceId: string | null;
  platform: MobilePlatform | null;
  appVersion: string | null;
}

function storage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function getMobilePlatform(): MobilePlatform | undefined {
  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android" ? platform : undefined;
}

function getMobileAppVersion() {
  return import.meta.env.VITE_APP_VERSION || import.meta.env.VITE_APP_BUILD || undefined;
}

function createFallbackDeviceId() {
  const random = Math.random().toString(36).slice(2, 10);
  return `mesc-${Date.now().toString(36)}-${random}`;
}

export function shouldUseMobileAuth() {
  return isNativeRuntime();
}

export function getOrCreateMobileDeviceId() {
  const localStorage = storage();
  if (!localStorage) return undefined;

  const existing = localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.deviceId);
  if (existing) return existing;

  const deviceId = globalThis.crypto?.randomUUID?.() ?? createFallbackDeviceId();
  localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.deviceId, deviceId);
  return deviceId;
}

function bindMobileFetch(): MobileFetch {
  return (input, init) => fetch(input, { ...init, credentials: "include" });
}

function createClient(input: {
  accessToken?: string | null;
  communityId?: string | null;
  deviceId?: string | null;
} = {}) {
  const accessToken = input.accessToken === undefined ? getStoredAuthToken() : input.accessToken;
  const communityId = input.communityId === undefined
    ? storage()?.getItem(MOBILE_AUTH_STORAGE_KEYS.activeCommunityId)
    : input.communityId;
  const deviceId = input.deviceId === undefined ? getOrCreateMobileDeviceId() : input.deviceId;

  return new MescMobileApiClient({
    baseUrl: getApiOrigin(),
    accessToken,
    communityId,
    deviceId,
    platform: getMobilePlatform(),
    appVersion: getMobileAppVersion(),
    fetch: bindMobileFetch(),
  });
}

export function readStoredMobileAuthSession(): StoredMobileAuthSession | null {
  const localStorage = storage();
  const accessToken = getStoredAuthToken();
  if (!localStorage || !accessToken) return null;

  const platform = localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.platform);

  return {
    accessToken,
    refreshToken: localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.refreshToken),
    refreshTokenExpiresAt: localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.refreshTokenExpiresAt),
    sessionToken: localStorage.getItem("session_token"),
    activeCommunityId: localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.activeCommunityId),
    deviceId: localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.deviceId),
    platform: platform === "ios" || platform === "android" ? platform : null,
    appVersion: localStorage.getItem(MOBILE_AUTH_STORAGE_KEYS.appVersion),
  };
}

export function hasStoredMobileRefreshToken() {
  return Boolean(storage()?.getItem(MOBILE_AUTH_STORAGE_KEYS.refreshToken));
}

export function restoreMobileAuthSession(session: StoredMobileAuthSession) {
  const localStorage = storage();
  if (!localStorage) return;

  localStorage.setItem("token", session.accessToken);
  localStorage.setItem("auth_token", session.accessToken);

  if (session.sessionToken) {
    localStorage.setItem("session_token", session.sessionToken);
  } else {
    localStorage.removeItem("session_token");
  }
  if (session.refreshToken) {
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.refreshToken, session.refreshToken);
  } else {
    localStorage.removeItem(MOBILE_AUTH_STORAGE_KEYS.refreshToken);
  }
  if (session.refreshTokenExpiresAt) {
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.refreshTokenExpiresAt, session.refreshTokenExpiresAt);
  } else {
    localStorage.removeItem(MOBILE_AUTH_STORAGE_KEYS.refreshTokenExpiresAt);
  }
  if (session.activeCommunityId) {
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.activeCommunityId, session.activeCommunityId);
  } else {
    localStorage.removeItem(MOBILE_AUTH_STORAGE_KEYS.activeCommunityId);
  }
  if (session.deviceId) {
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.deviceId, session.deviceId);
  }
  if (session.platform) {
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.platform, session.platform);
  } else {
    localStorage.removeItem(MOBILE_AUTH_STORAGE_KEYS.platform);
  }
  if (session.appVersion) {
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.appVersion, session.appVersion);
  } else {
    localStorage.removeItem(MOBILE_AUTH_STORAGE_KEYS.appVersion);
  }
}

export function clearStoredMobileAuthSession() {
  const localStorage = storage();
  if (!localStorage) return;

  localStorage.removeItem(MOBILE_AUTH_STORAGE_KEYS.refreshToken);
  localStorage.removeItem(MOBILE_AUTH_STORAGE_KEYS.refreshTokenExpiresAt);
  localStorage.removeItem(MOBILE_AUTH_STORAGE_KEYS.activeCommunityId);
  localStorage.removeItem(MOBILE_AUTH_STORAGE_KEYS.communities);
  localStorage.removeItem(MOBILE_AUTH_STORAGE_KEYS.platform);
  localStorage.removeItem(MOBILE_AUTH_STORAGE_KEYS.appVersion);
}

export function clearExpiredMobileAuthSession() {
  const localStorage = storage();
  if (!localStorage) return;

  localStorage.removeItem("token");
  localStorage.removeItem("auth_token");
  localStorage.removeItem("session_token");
  clearStoredMobileAuthSession();
}

export function storeMobileAuthResponse(response: MobileAuthResponse) {
  const localStorage = storage();
  if (!localStorage) return;

  const platform = getMobilePlatform();
  const appVersion = getMobileAppVersion() ?? null;

  localStorage.setItem("token", response.auth.accessToken);
  localStorage.setItem("auth_token", response.auth.accessToken);
  if (response.auth.sessionToken) {
    localStorage.setItem("session_token", response.auth.sessionToken);
  } else {
    localStorage.removeItem("session_token");
  }

  if (response.auth.refreshToken) {
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.refreshToken, response.auth.refreshToken);
  } else {
    localStorage.removeItem(MOBILE_AUTH_STORAGE_KEYS.refreshToken);
  }

  if (response.auth.refreshTokenExpiresAt) {
    localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.refreshTokenExpiresAt, response.auth.refreshTokenExpiresAt);
  } else {
    localStorage.removeItem(MOBILE_AUTH_STORAGE_KEYS.refreshTokenExpiresAt);
  }

  localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.activeCommunityId, response.activeCommunityId);
  localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.deviceId, response.device.deviceId);
  localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.communities, JSON.stringify(response.communities));
  if (platform) localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.platform, platform);
  if (appVersion) localStorage.setItem(MOBILE_AUTH_STORAGE_KEYS.appVersion, appVersion);
}

export async function mobileLogin(payload: Omit<MobileLoginPayload, "deviceId" | "platform" | "appVersion">) {
  const client = createClient({ accessToken: null, communityId: null });
  const response = await client.login({
    ...payload,
    deviceId: getOrCreateMobileDeviceId(),
    platform: getMobilePlatform(),
    appVersion: getMobileAppVersion(),
  });
  storeMobileAuthResponse(response);
  return response;
}

export async function refreshMobileAuthSession() {
  const refreshToken = storage()?.getItem(MOBILE_AUTH_STORAGE_KEYS.refreshToken);
  if (!refreshToken) {
    throw new MescMobileApiError({
      status: 401,
      message: "Sessao mobile expirada. Entre novamente.",
      retryable: false,
    });
  }

  const client = createClient({ accessToken: null, communityId: null });
  let response: MobileAuthResponse;
  try {
    response = await client.refresh({
      refreshToken,
      deviceId: getOrCreateMobileDeviceId(),
    });
  } catch (error) {
    if (error instanceof MescMobileApiError && error.status === 401) {
      clearExpiredMobileAuthSession();
    }
    throw error;
  }

  storeMobileAuthResponse(response);
  return response;
}

export async function ensureMobileBiometricSession(): Promise<StoredMobileAuthSession> {
  const existing = readStoredMobileAuthSession();
  if (existing?.refreshToken) return existing;

  if (!getStoredAuthToken()) {
    throw new MescMobileApiError({
      status: 401,
      message: "Entre com email e senha antes de ativar a biometria.",
      retryable: false,
    });
  }

  const client = createClient();
  const response = await client.createBiometricSession({
    deviceId: getOrCreateMobileDeviceId(),
    platform: getMobilePlatform(),
    appVersion: getMobileAppVersion(),
  });

  storeMobileAuthResponse(response);
  const session = readStoredMobileAuthSession();
  if (!session?.refreshToken) {
    throw new MescMobileApiError({
      status: 401,
      message: "Nao foi possivel preparar a sessao biometrica.",
      retryable: false,
    });
  }

  return session;
}

async function runWithMobileAuthRetry<T>(
  operation: (client: MescMobileApiClient) => Promise<T>,
): Promise<T> {
  if (!getStoredAuthToken() && hasStoredMobileRefreshToken()) {
    await refreshMobileAuthSession();
  }

  const client = createClient();

  try {
    return await operation(client);
  } catch (error) {
    if (error instanceof MescMobileApiError && error.status === 401 && hasStoredMobileRefreshToken()) {
      const refreshed = await refreshMobileAuthSession();
      return operation(createClient({
        accessToken: refreshed.auth.accessToken,
        communityId: refreshed.activeCommunityId,
        deviceId: refreshed.device.deviceId,
      }));
    }

    throw error;
  }
}

export async function mobileGetMe(): Promise<MobileMeResponse> {
  return runWithMobileAuthRetry((client) => client.getMe());
}

export async function mobileListDevices(): Promise<MobileDevicesResponse> {
  return runWithMobileAuthRetry((client) => client.listDevices());
}

export async function mobileGetCurrentDevice(): Promise<MobileDeviceResponse> {
  return runWithMobileAuthRetry((client) => client.getCurrentDevice());
}

export async function mobileUpdateCurrentDevice(payload: MobileDeviceUpdatePayload): Promise<MobileDeviceResponse> {
  return runWithMobileAuthRetry((client) => client.updateCurrentDevice(payload));
}

export async function mobileRevokeDevice(deviceDbId: string) {
  return runWithMobileAuthRetry((client) => client.revokeDevice(deviceDbId));
}

export async function mobileDeleteAccount(payload: MobileAccountDeletePayload): Promise<MobileAccountDeleteResponse> {
  return runWithMobileAuthRetry((client) => client.deleteAccount(payload));
}

export async function mobileListNotifications(input: { limit?: number } = {}): Promise<MobileNotificationsResponse> {
  return runWithMobileAuthRetry((client) => client.listNotifications(input));
}

export async function mobileMarkNotificationRead(id: string): Promise<MobileNotificationReadResponse> {
  return runWithMobileAuthRetry((client) => client.markNotificationRead(id));
}

export async function mobileMarkAllNotificationsRead(): Promise<MobileNotificationReadAllResponse> {
  return runWithMobileAuthRetry((client) => client.markAllNotificationsRead());
}

export async function mobileGetMissionHome(input: { month?: string } = {}): Promise<MobileMissionHomeResponse> {
  return runWithMobileAuthRetry((client) => client.getMissionHome(input));
}

export async function mobileGetCurrentQuestionnaire(
  input: { month?: string } = {},
): Promise<MobileQuestionnaireCurrentResponse> {
  return runWithMobileAuthRetry((client) => client.getCurrentQuestionnaire(input));
}

export async function mobileSubmitQuestionnaireResponse(
  questionnaireId: string,
  payload: MobileQuestionnaireSubmitPayload,
  options: MobileClientRequestOptions,
): Promise<MobileQuestionnaireSubmitResponse> {
  return runWithMobileAuthRetry((client) => client.submitQuestionnaireResponse(questionnaireId, payload, options));
}

export async function mobileGetSchedulesMonth(input: { month?: string } = {}): Promise<MobileScheduleMonthResponse> {
  return runWithMobileAuthRetry((client) => client.getSchedulesMonth(input));
}

export async function mobileConfirmSchedule(
  scheduleId: string,
  payload: MobileScheduleConfirmPayload,
  options: MobileClientRequestOptions,
): Promise<MobileScheduleConfirmResponse> {
  return runWithMobileAuthRetry((client) => client.confirmSchedule(scheduleId, payload, options));
}

export async function mobileRequestSubstitution(
  payload: MobileSubstitutionCreatePayload,
  options: MobileClientRequestOptions,
): Promise<MobileSubstitutionCreateResponse> {
  return runWithMobileAuthRetry((client) => client.requestSubstitution(payload, options));
}

export async function mobileClaimSubstitution(
  substitutionId: string,
  payload: MobileSubstitutionClaimPayload,
  options: MobileClientRequestOptions,
): Promise<MobileSubstitutionClaimResponse> {
  return runWithMobileAuthRetry((client) => client.claimSubstitution(substitutionId, payload, options));
}

export async function mobileListSubstitutions(): Promise<MobileSubstitutionsResponse> {
  return runWithMobileAuthRetry((client) => client.listSubstitutions());
}

export async function mobileGetProfile(): Promise<MobileProfileResponse> {
  return runWithMobileAuthRetry((client) => client.getProfile());
}

export async function mobileUpdateProfile(payload: MobileProfileUpdatePayload): Promise<MobileProfileResponse> {
  return runWithMobileAuthRetry((client) => client.updateProfile(payload));
}

export async function mobileGetAdminCommunityHome(
  input: { month?: string } = {},
): Promise<MobileAdminCommunityHomeResponse> {
  return runWithMobileAuthRetry((client) => client.getAdminCommunityHome(input));
}

export async function mobileGetAdminScheduleReadiness(
  input: { month?: string } = {},
): Promise<MobileAdminScheduleReadinessResponse> {
  return runWithMobileAuthRetry((client) => client.getAdminScheduleReadiness(input));
}

export async function mobileGenerateAdminSchedulePreview(
  input: { month?: string } = {},
): Promise<MobileAdminSchedulePreviewResponse> {
  return runWithMobileAuthRetry((client) => client.generateAdminSchedulePreview(input));
}

export async function mobileGetAdminQuestionnaireResponses(
  questionnaireId: string,
): Promise<MobileAdminQuestionnaireResponsesResponse> {
  return runWithMobileAuthRetry((client) => client.getAdminQuestionnaireResponses(questionnaireId));
}

export async function mobileSendAdminQuestionnaireReminders(
  questionnaireId: string,
  payload: MobileAdminQuestionnaireReminderPayload,
  options: MobileClientRequestOptions = {},
): Promise<MobileAdminQuestionnaireReminderResponse> {
  return runWithMobileAuthRetry((client) => client.sendAdminQuestionnaireReminders(
    questionnaireId,
    payload,
    {
      ...options,
      idempotencyKey: options.idempotencyKey ?? createMobileIdempotencyKey(),
    },
  ));
}

export async function mobileListAdminMinisters(): Promise<MobileAdminMinistersResponse> {
  return runWithMobileAuthRetry((client) => client.listAdminMinisters());
}

export async function mobileLogout() {
  const client = createClient();
  const deviceId = storage()?.getItem(MOBILE_AUTH_STORAGE_KEYS.deviceId) ?? undefined;

  try {
    if (getStoredAuthToken() && deviceId) {
      await client.logout({ deviceId });
    }
  } finally {
    clearStoredMobileAuthSession();
  }
}
