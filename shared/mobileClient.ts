import type { MobileNotificationEventKey } from "./mobileNotificationEvents";
import type { MobileProfileReadiness } from "./mobileDataReadiness";

export const MOBILE_API_BASE_PATH = "/api/mobile/v1" as const;
export const MOBILE_IDEMPOTENCY_HEADER = "Idempotency-Key" as const;

export type MobilePlatform = "ios" | "android";
export type MobileHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type MobileJsonPrimitive = string | number | boolean | null;
export type MobileJsonValue =
  | MobileJsonPrimitive
  | MobileJsonValue[]
  | { [key: string]: MobileJsonValue };

export interface MobileApiFailureBody {
  success?: false;
  message?: string;
  error?: string;
  errors?: unknown;
  code?: string;
}

export interface MobileCommunity {
  id: string;
  name: string;
  slug: string;
  colorHex: string;
  parishName: string;
  isMatriz: boolean;
}

export interface MobileUser {
  id: string;
  email: string;
  name: string;
  role: string;
  homeCommunityId: string;
  requiresPasswordChange: boolean;
  photoUrl: string | null;
}

export interface MobileDevice {
  id: string;
  deviceId: string;
  platform: MobilePlatform | "unknown";
  appVersion: string | null;
  pushEnabled: boolean;
  pushProvider: string | null;
  biometricCapable: boolean;
  biometricEnabled: boolean;
  lastSeenAt: string | null;
  revokedAt: string | null;
  createdAt: string | null;
  registered?: boolean;
}

export interface MobileAuthBundle {
  tokenType: "Bearer";
  accessToken: string;
  refreshToken: string | null;
  refreshTokenExpiresAt: string | null;
  sessionToken: string | null;
  expiresInSeconds: number | null;
  keepSignedIn: boolean;
}

export interface MobileAuthResponse {
  success: true;
  auth: MobileAuthBundle;
  user: MobileUser;
  communities: MobileCommunity[];
  activeCommunityId: string;
  device: MobileDevice;
  capabilities?: {
    biometricUnlock?: boolean;
    refreshTokenRotation?: boolean;
    remoteDeviceLogout?: boolean;
  };
}

export interface MobileMeResponse {
  success: true;
  user: MobileUser;
  communities: MobileCommunity[];
  activeCommunityId: string;
}

export interface MobileLoginPayload {
  email: string;
  password: string;
  keepSignedIn?: boolean;
  deviceId?: string;
  platform?: MobilePlatform;
  appVersion?: string;
}

export interface MobileRefreshPayload {
  refreshToken: string;
  deviceId?: string;
}

export interface MobileLogoutPayload {
  deviceId?: string;
  deviceDbId?: string;
}

export interface MobileLogoutResponse {
  success: true;
  revoked: boolean;
}

export interface MobilePendingAction {
  id: string;
  type: "questionnaire" | "substitution" | "notice";
  title: string;
  subtitle?: string;
  priority: "normal" | "high";
  deepLink: string;
  dueAt?: string | null;
}

export interface MobileNotice {
  id: string;
  type: string;
  eventKey: MobileNotificationEventKey | null;
  title: string;
  message: string;
  priority: string | null;
  read: boolean;
  deepLink: string;
  createdAt: string | null;
}

export interface MobileNotification {
  id: string;
  type: string;
  eventKey: MobileNotificationEventKey | null;
  title: string;
  message: string;
  priority: string | null;
  read: boolean;
  readAt: string | null;
  deepLink: string;
  createdAt: string | null;
}

export type { MobileNotificationEventKey } from "./mobileNotificationEvents";

export interface MobileNotificationsResponse {
  success: true;
  notifications: MobileNotification[];
  unreadCount: number;
}

export interface MobileNotificationReadResponse {
  success: true;
  notification: {
    id: string;
    read: boolean;
    readAt: string | null;
  };
}

export interface MobileNotificationReadAllResponse {
  success: true;
}

export interface MobileMissionSchedule {
  id: string;
  date: string | null;
  time: string;
  type: string;
  location: string | null;
  position: number | null;
  status: string;
  notes?: string | null;
  confirmationStatus?: string | null;
  canConfirm?: boolean;
  canRequestSubstitution?: boolean;
  deepLink: string;
}

export interface MobileMissionHomeResponse {
  success: true;
  user: MobileUser;
  community: MobileCommunity;
  nextMission: MobileMissionSchedule | null;
  pendingActions: MobilePendingAction[];
  monthlySummary: {
    month: string;
    publishedAssignments: number;
    nextScheduleId: string | null;
  };
  notices: MobileNotice[];
  sync: {
    serverTime: string;
    cacheMaxAgeSeconds: number;
  };
}

export interface MobileQuestionnaireAnswer {
  questionId: string;
  answer:
    | string
    | string[]
    | boolean
    | {
        answer: string;
        selectedOptions?: string[];
      };
  metadata?: unknown;
}

export interface MobileQuestionnaire {
  id: string;
  title: string;
  description: string | null;
  month: number;
  year: number;
  status: string;
  questions: unknown;
  deadline: string | null;
  responseStatus: "pending" | "answered";
  response: {
    id: string;
    responses: unknown;
    submittedAt: string | null;
    updatedAt: string | null;
  } | null;
}

export interface MobileQuestionnaireCurrentResponse {
  success: true;
  community: MobileCommunity;
  month: string;
  questionnaire: MobileQuestionnaire | null;
}

export interface MobileQuestionnaireSubmitPayload {
  responses: MobileQuestionnaireAnswer[];
  sharedWithFamilyIds?: string[];
}

export interface MobileQuestionnaireSubmitResponse {
  success: true;
  response: {
    id: string;
    questionnaireId: string;
    submittedAt: string | null;
    updatedAt: string | null;
    processingWarnings: unknown[];
    unmappedResponses: unknown[];
  };
}

export interface MobileScheduleMonthResponse {
  success: true;
  community: MobileCommunity;
  month: string;
  schedules: MobileMissionSchedule[];
}

export interface MobileScheduleConfirmPayload {
  status?: "confirmed" | "declined";
  declineReason?: string | null;
  notes?: string | null;
}

export interface MobileScheduleConfirmResponse {
  success: true;
  confirmation: {
    id: string;
    scheduleId: string;
    ministerId: string;
    status: string;
    respondedAt: string | null;
    updatedAt: string | null;
  };
  schedule: {
    id: string;
    date: string;
    time: string;
    deepLink: string;
  };
}

export interface MobileSubstitution {
  id: string;
  scheduleId: string;
  requesterId: string;
  substituteId: string | null;
  status: string;
  reason: string | null;
  urgency: "low" | "medium" | "high" | "critical";
  responseMessage: string | null;
  schedule: Record<string, unknown>;
  requester: MobileSubstitutionUser | null;
  substitute: MobileSubstitutionUser | null;
  deepLink: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MobileSubstitutionUser {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
}

export interface MobileSubstitutionsResponse {
  success: true;
  community: MobileCommunity;
  substitutions: MobileSubstitution[];
}

export interface MobileSubstitutionCreatePayload {
  scheduleId: string;
  substituteId?: string | null;
  reason?: string | null;
}

export interface MobileSubstitutionCreateResponse {
  success: true;
  substitution: MobileSubstitution;
}

export interface MobileSubstitutionClaimPayload {
  message?: string | null;
}

export interface MobileSubstitutionClaimResponse {
  success: true;
  substitution: MobileSubstitution;
}

export interface MobileAdminCommunityHomeResponse {
  success: true;
  community: MobileCommunity;
  month: string;
  metrics: {
    activeMinisters: number;
    publishedAssignments: number;
    pendingSubstitutions: number;
    questionnaireResponses: number;
    questionnairePending: number | null;
    questionnaireTarget: number | null;
    profileReady: number;
    profileNeedsAttention: number;
    profileBlocked: number;
  };
  questionnaire: {
    id: string;
    title: string;
    month: number;
    year: number;
    responses: number;
    pending: number;
    target: number;
    responseRate: number;
    deepLink: string;
  } | null;
  coverage: Array<{
    date: string;
    time: string;
    type: string;
    location: string | null;
    assigned: number;
    vacancies: number;
    scheduleIds: string[];
    status: "covered" | "needs_attention";
  }>;
  substitutions: MobileSubstitution[];
}

export interface MobileAdminQuestionnaireTargetMinister {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  displayName: string;
  responded: boolean;
  responseId: string | null;
  respondedAt: string | null;
  availability: string | null;
  dataQuality: MobileProfileReadiness;
}

export interface MobileAdminQuestionnaireResponseItem {
  id: string;
  userId: string;
  ministerName: string;
  ministerPhotoUrl: string | null;
  canSubstitute: boolean;
  availableSundays: string[];
  preferredMassTimes: string[];
  alternativeTimes: string[];
  dailyMassAvailability: string[];
  notes: string | null;
  processingWarnings: unknown[];
  responses: unknown;
  submittedAt: string | null;
  updatedAt: string | null;
  dataQuality: MobileProfileReadiness;
}

export interface MobileAdminQuestionnaireResponsesResponse {
  success: true;
  community: MobileCommunity;
  questionnaire: {
    id: string;
    title: string;
    month: number;
    year: number;
    status: string;
    deadline: string | null;
    questions: unknown;
  };
  summary: {
    targetCount: number;
    respondedCount: number;
    pendingCount: number;
    responseRate: number;
    dataQuality: {
      ready: number;
      needsAttention: number;
      blocked: number;
    };
  };
  ministers: MobileAdminQuestionnaireTargetMinister[];
  responses: MobileAdminQuestionnaireResponseItem[];
}

export interface MobileAdminMinister {
  id: string;
  name: string;
  displayName: string;
  role: string;
  status: string;
  phone: string | null;
  whatsapp: string | null;
  photoUrl: string | null;
  preferredPosition: number | null;
  preferredPositions: number[];
  avoidPositions: number[];
  preferredTimes: string[];
  ministryStartDate: string | null;
  dataQuality: MobileProfileReadiness;
  deepLink: string;
}

export interface MobileAdminMinistersResponse {
  success: true;
  community: MobileCommunity;
  summary: {
    total: number;
    ready: number;
    needsAttention: number;
    blocked: number;
  };
  ministers: MobileAdminMinister[];
}

export interface MobileProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  role: string;
  status: string;
  photoUrl: string | null;
  homeCommunityId: string;
  scheduleDisplayName: string | null;
  ministryStartDate: string | null;
  maritalStatus: string | null;
  preferredPosition: number | null;
  preferredPositions: number[];
  avoidPositions: number[];
  preferredTimes: string[];
  availableForSpecialEvents: boolean;
  extraActivities: Record<string, unknown>;
  requiresPasswordChange: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MobileProfileUpdatePayload {
  name?: string;
  phone?: string | null;
  whatsapp?: string | null;
  scheduleDisplayName?: string | null;
  ministryStartDate?: string | null;
  maritalStatus?: string | null;
  preferredPosition?: number | null;
  preferredPositions?: number[];
  avoidPositions?: number[];
  preferredTimes?: string[];
  availableForSpecialEvents?: boolean;
  extraActivities?: {
    sickCommunion?: boolean;
    mondayAdoration?: boolean;
    helpOtherPastorals?: boolean;
    festiveEvents?: boolean;
  };
}

export interface MobileProfileResponse {
  success: true;
  profile: MobileProfile;
}

export interface MobileDeviceUpdatePayload {
  deviceId?: string;
  platform?: MobilePlatform;
  appVersion?: string;
  pushToken?: string | null;
  pushProvider?: "apns" | "fcm" | null;
  pushEnabled?: boolean;
  biometricCapable?: boolean;
  biometricEnabled?: boolean;
  notificationPreferences?: Record<string, unknown>;
}

export interface MobileDevicesResponse {
  success: true;
  devices: MobileDevice[];
}

export interface MobileDeviceResponse {
  success: true;
  device: MobileDevice;
}

export interface MobileDeviceRevokeResponse {
  success: true;
  revoked: boolean;
}

export interface MobileClientRequestOptions {
  accessToken?: string | null;
  communityId?: string | null;
  deviceId?: string | null;
  idempotencyKey?: string | null;
  headers?: Record<string, string>;
}

export interface MescMobileApiErrorDetails {
  status: number;
  message: string;
  code?: string;
  body?: unknown;
  retryable: boolean;
}

export class MescMobileApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly body?: unknown;
  readonly retryable: boolean;

  constructor(details: MescMobileApiErrorDetails) {
    super(details.message);
    this.name = "MescMobileApiError";
    this.status = details.status;
    this.code = details.code;
    this.body = details.body;
    this.retryable = details.retryable;
  }
}

export type MobileFetch = (
  input: string,
  init: RequestInit,
) => Promise<Pick<Response, "ok" | "status" | "headers" | "text">>;

export interface MescMobileClientOptions {
  baseUrl: string;
  accessToken?: string | null;
  communityId?: string | null;
  deviceId?: string | null;
  platform?: MobilePlatform;
  appVersion?: string;
  fetch?: MobileFetch;
}

interface RequestInput extends MobileClientRequestOptions {
  method: MobileHttpMethod;
  path: string;
  body?: unknown;
  auth?: boolean;
}

function cleanBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function encodePathSegment(value: string) {
  return encodeURIComponent(value);
}

function withQuery(path: string, query: Record<string, string | number | boolean | null | undefined> = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }

  const serialized = params.toString();
  return serialized ? `${path}?${serialized}` : path;
}

function joinMobileUrl(baseUrl: string, path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBaseUrl(baseUrl)}${MOBILE_API_BASE_PATH}${normalizedPath}`;
}

function normalizeErrorBody(body: unknown): MobileApiFailureBody {
  return body && typeof body === "object" ? body as MobileApiFailureBody : {};
}

function isRetryableMobileError(status: number, message: string) {
  if (status === 0 || status === 408 || status === 429 || status >= 500) return true;
  return status === 409 && /processamento|processing|try again/i.test(message);
}

export function toMescMobileApiError(status: number, body: unknown, fallbackMessage = "Erro na API mobile") {
  const failure = normalizeErrorBody(body);
  const message = failure.message || failure.error || fallbackMessage;

  return new MescMobileApiError({
    status,
    message,
    code: failure.code,
    body,
    retryable: isRetryableMobileError(status, message),
  });
}

export function createMobileIdempotencyKey(
  randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto),
) {
  if (!randomUUID) {
    throw new Error("Nenhum gerador de UUID disponivel para Idempotency-Key");
  }

  return randomUUID();
}

export const mobileEndpoints = {
  appConfig: (input: { platform?: MobilePlatform } = {}) =>
    withQuery("/app/config", { platform: input.platform }),
  login: () => "/auth/login",
  refresh: () => "/auth/refresh",
  logout: () => "/auth/logout",
  me: () => "/auth/me",
  devices: () => "/devices",
  currentDevice: () => "/devices/current",
  revokeDevice: (id: string) => `/devices/${encodePathSegment(id)}`,
  profile: () => "/profile",
  notifications: (input: { limit?: number } = {}) =>
    withQuery("/notifications", { limit: input.limit }),
  readAllNotifications: () => "/notifications/read-all",
  readNotification: (id: string) => `/notifications/${encodePathSegment(id)}/read`,
  currentQuestionnaire: (input: { month?: string } = {}) =>
    withQuery("/questionnaires/current", { month: input.month }),
  submitQuestionnaire: (id: string) => `/questionnaires/${encodePathSegment(id)}/response`,
  substitutions: () => "/substitutions",
  substitution: (id: string) => `/substitutions/${encodePathSegment(id)}`,
  claimSubstitution: (id: string) => `/substitutions/${encodePathSegment(id)}/claim`,
  missionHome: (input: { month?: string } = {}) =>
    withQuery("/mission/home", { month: input.month }),
  schedulesMonth: (input: { month?: string } = {}) =>
    withQuery("/schedules/month", { month: input.month }),
  confirmSchedule: (id: string) => `/schedules/${encodePathSegment(id)}/confirm`,
  schedule: (id: string) => `/schedules/${encodePathSegment(id)}`,
  adminCommunityHome: (input: { month?: string } = {}) =>
    withQuery("/admin/community/home", { month: input.month }),
  adminQuestionnaireResponses: (id: string) =>
    `/admin/questionnaires/${encodePathSegment(id)}/responses`,
  adminMinisters: () => "/admin/ministers",
} as const;

export class MescMobileApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: MobileFetch;
  private accessToken: string | null;
  private communityId: string | null;
  private deviceId: string | null;
  private readonly platform?: MobilePlatform;
  private readonly appVersion?: string;

  constructor(options: MescMobileClientOptions) {
    this.baseUrl = options.baseUrl;
    this.fetcher = options.fetch ?? fetch;
    this.accessToken = options.accessToken ?? null;
    this.communityId = options.communityId ?? null;
    this.deviceId = options.deviceId ?? null;
    this.platform = options.platform;
    this.appVersion = options.appVersion;
  }

  setAccessToken(accessToken: string | null) {
    this.accessToken = accessToken;
  }

  setCommunityId(communityId: string | null) {
    this.communityId = communityId;
  }

  setDeviceId(deviceId: string | null) {
    this.deviceId = deviceId;
  }

  private async request<T>(input: RequestInput): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...input.headers,
    };
    const accessToken = input.accessToken ?? this.accessToken;
    const communityId = input.communityId ?? this.communityId;
    const deviceId = input.deviceId ?? this.deviceId;

    if (input.auth !== false && accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    if (communityId) headers["X-Community-Id"] = communityId;
    if (deviceId) headers["X-Device-Id"] = deviceId;
    if (this.platform) headers["X-Platform"] = this.platform;
    if (this.appVersion) headers["X-App-Version"] = this.appVersion;
    if (input.idempotencyKey) headers[MOBILE_IDEMPOTENCY_HEADER] = input.idempotencyKey;
    if (input.body !== undefined) headers["Content-Type"] = "application/json";

    let response: Awaited<ReturnType<MobileFetch>>;
    try {
      response = await this.fetcher(joinMobileUrl(this.baseUrl, input.path), {
        method: input.method,
        headers,
        body: input.body === undefined ? undefined : JSON.stringify(input.body),
      });
    } catch (error) {
      throw new MescMobileApiError({
        status: 0,
        message: error instanceof Error ? error.message : "Falha de rede na API mobile",
        body: error,
        retryable: true,
      });
    }

    const text = await response.text();
    const body = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw toMescMobileApiError(response.status, body);
    }

    return body as T;
  }

  async getAppConfig(input: { platform?: MobilePlatform } = {}) {
    return this.request<Record<string, unknown>>({
      method: "GET",
      path: mobileEndpoints.appConfig({ platform: input.platform ?? this.platform }),
      auth: false,
    });
  }

  async login(payload: MobileLoginPayload) {
    const response = await this.request<MobileAuthResponse>({
      method: "POST",
      path: mobileEndpoints.login(),
      body: {
        ...payload,
        deviceId: payload.deviceId ?? this.deviceId ?? undefined,
        platform: payload.platform ?? this.platform,
        appVersion: payload.appVersion ?? this.appVersion,
      },
      auth: false,
    });

    this.setAccessToken(response.auth.accessToken);
    this.setCommunityId(response.activeCommunityId);
    this.setDeviceId(response.device.deviceId);
    return response;
  }

  async refresh(payload: MobileRefreshPayload) {
    const response = await this.request<MobileAuthResponse>({
      method: "POST",
      path: mobileEndpoints.refresh(),
      body: {
        ...payload,
        deviceId: payload.deviceId ?? this.deviceId ?? undefined,
      },
      auth: false,
    });

    this.setAccessToken(response.auth.accessToken);
    this.setCommunityId(response.activeCommunityId);
    this.setDeviceId(response.device.deviceId);
    return response;
  }

  async logout(payload: MobileLogoutPayload = {}, options: MobileClientRequestOptions = {}) {
    return this.request<MobileLogoutResponse>({
      method: "POST",
      path: mobileEndpoints.logout(),
      body: {
        ...payload,
        deviceId: payload.deviceId ?? this.deviceId ?? undefined,
      },
      ...options,
    });
  }

  async getMe(options: MobileClientRequestOptions = {}) {
    return this.request<MobileMeResponse>({
      method: "GET",
      path: mobileEndpoints.me(),
      ...options,
    });
  }

  async listDevices(options: MobileClientRequestOptions = {}) {
    return this.request<MobileDevicesResponse>({
      method: "GET",
      path: mobileEndpoints.devices(),
      ...options,
    });
  }

  async revokeDevice(deviceDbId: string, options: MobileClientRequestOptions = {}) {
    return this.request<MobileDeviceRevokeResponse>({
      method: "DELETE",
      path: mobileEndpoints.revokeDevice(deviceDbId),
      ...options,
    });
  }

  async listNotifications(input: { limit?: number } = {}, options: MobileClientRequestOptions = {}) {
    return this.request<MobileNotificationsResponse>({
      method: "GET",
      path: mobileEndpoints.notifications(input),
      ...options,
    });
  }

  async markNotificationRead(id: string, options: MobileClientRequestOptions = {}) {
    return this.request<MobileNotificationReadResponse>({
      method: "PATCH",
      path: mobileEndpoints.readNotification(id),
      ...options,
    });
  }

  async markAllNotificationsRead(options: MobileClientRequestOptions = {}) {
    return this.request<MobileNotificationReadAllResponse>({
      method: "PATCH",
      path: mobileEndpoints.readAllNotifications(),
      ...options,
    });
  }

  async getMissionHome(input: { month?: string } = {}, options: MobileClientRequestOptions = {}) {
    return this.request<MobileMissionHomeResponse>({
      method: "GET",
      path: mobileEndpoints.missionHome(input),
      ...options,
    });
  }

  async getCurrentQuestionnaire(input: { month?: string } = {}, options: MobileClientRequestOptions = {}) {
    return this.request<MobileQuestionnaireCurrentResponse>({
      method: "GET",
      path: mobileEndpoints.currentQuestionnaire(input),
      ...options,
    });
  }

  async submitQuestionnaireResponse(
    questionnaireId: string,
    payload: MobileQuestionnaireSubmitPayload,
    options: MobileClientRequestOptions,
  ) {
    return this.request<MobileQuestionnaireSubmitResponse>({
      method: "POST",
      path: mobileEndpoints.submitQuestionnaire(questionnaireId),
      body: payload,
      ...options,
    });
  }

  async getSchedulesMonth(input: { month?: string } = {}, options: MobileClientRequestOptions = {}) {
    return this.request<MobileScheduleMonthResponse>({
      method: "GET",
      path: mobileEndpoints.schedulesMonth(input),
      ...options,
    });
  }

  async confirmSchedule(
    scheduleId: string,
    payload: MobileScheduleConfirmPayload,
    options: MobileClientRequestOptions,
  ) {
    return this.request<MobileScheduleConfirmResponse>({
      method: "POST",
      path: mobileEndpoints.confirmSchedule(scheduleId),
      body: payload,
      ...options,
    });
  }

  async listSubstitutions(options: MobileClientRequestOptions = {}) {
    return this.request<MobileSubstitutionsResponse>({
      method: "GET",
      path: mobileEndpoints.substitutions(),
      ...options,
    });
  }

  async requestSubstitution(
    payload: MobileSubstitutionCreatePayload,
    options: MobileClientRequestOptions,
  ) {
    return this.request<MobileSubstitutionCreateResponse>({
      method: "POST",
      path: mobileEndpoints.substitutions(),
      body: payload,
      ...options,
    });
  }

  async claimSubstitution(
    substitutionId: string,
    payload: MobileSubstitutionClaimPayload,
    options: MobileClientRequestOptions,
  ) {
    return this.request<MobileSubstitutionClaimResponse>({
      method: "POST",
      path: mobileEndpoints.claimSubstitution(substitutionId),
      body: payload,
      ...options,
    });
  }

  async getProfile(options: MobileClientRequestOptions = {}) {
    return this.request<MobileProfileResponse>({
      method: "GET",
      path: mobileEndpoints.profile(),
      ...options,
    });
  }

  async updateProfile(payload: MobileProfileUpdatePayload, options: MobileClientRequestOptions = {}) {
    return this.request<MobileProfileResponse>({
      method: "PATCH",
      path: mobileEndpoints.profile(),
      body: payload,
      ...options,
    });
  }

  async updateCurrentDevice(payload: MobileDeviceUpdatePayload, options: MobileClientRequestOptions = {}) {
    return this.request<MobileDeviceResponse>({
      method: "PUT",
      path: mobileEndpoints.currentDevice(),
      body: payload,
      ...options,
    });
  }

  async getAdminCommunityHome(input: { month?: string } = {}, options: MobileClientRequestOptions = {}) {
    return this.request<MobileAdminCommunityHomeResponse>({
      method: "GET",
      path: mobileEndpoints.adminCommunityHome(input),
      ...options,
    });
  }

  async getAdminQuestionnaireResponses(questionnaireId: string, options: MobileClientRequestOptions = {}) {
    return this.request<MobileAdminQuestionnaireResponsesResponse>({
      method: "GET",
      path: mobileEndpoints.adminQuestionnaireResponses(questionnaireId),
      ...options,
    });
  }

  async listAdminMinisters(options: MobileClientRequestOptions = {}) {
    return this.request<MobileAdminMinistersResponse>({
      method: "GET",
      path: mobileEndpoints.adminMinisters(),
      ...options,
    });
  }
}
