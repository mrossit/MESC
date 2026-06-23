import { Router, type Response } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { and, asc, count, desc, eq, gte, inArray, lte, ne, or, sql } from "drizzle-orm";
import {
  communities,
  notifications,
  questionnaireResponses,
  questionnaires,
  scheduleConfirmations,
  schedules,
  substitutionRequests,
  users,
} from "@shared/schema";
import { DB_MINISTER_AND_COORDINATOR_ROLES, isAdmin, isParishWide } from "@shared/roles";
import { extractMobileNotificationEventKey, mobileNotificationData } from "@shared/mobileNotificationEvents";
import { buildMobileProfileReadiness } from "@shared/mobileDataReadiness";
import { db } from "../db";
import { authenticateToken, type AuthRequest, generateToken, login } from "../auth";
import { authRateLimiter } from "../middleware/rateLimiter";
import { auditLoginAttempt } from "../middleware/auditLogger";
import { logActivity } from "../utils/activityLogger";
import { createSession } from "./session";
import { QuestionnaireService } from "../services/questionnaireService";
import { scheduleCache } from "../services/scheduleCache";
import { trackSubstitutionFulfillment, trackSubstitutionRequest } from "../services/reliabilityScoreService";
import { formatMinisterName } from "../utils/formatters";
import {
  beginMobileIdempotency,
  buildMobileRequestFingerprint,
  completeMobileIdempotency,
  MobileIdempotencyError,
  releaseMobileIdempotency,
} from "../services/mobileIdempotencyService";
import {
  consumeMobileRefreshToken,
  createMobileSession,
  createOrUpdateMobileDevice,
  listMobileDevicesForUser,
  MobileSessionError,
  revokeMobileDeviceForUser,
  sanitizeMobileDevice,
} from "../services/mobileSessionService";
import {
  buildMissionPendingActions,
  calculateScheduleUrgency,
  isLocalScheduleDateTimePast,
  parseMobileIdempotencyKey,
  parseJwtExpirySeconds,
  parseMobileMonth,
  resolveMobileCommunityScope,
  sanitizeMobileUser,
  toDateOnly,
  toIsoDate,
  type MobileCommunitySummary,
  type MobileUserSource,
} from "../services/mobileContractService";

const router = Router();

const loginSchema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  keepSignedIn: z.boolean().optional().default(false),
  deviceId: z.string().min(8).max(128).optional(),
  platform: z.enum(["ios", "android"]).optional(),
  appVersion: z.string().max(64).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(32),
  deviceId: z.string().min(8).max(128).optional(),
});

const logoutSchema = z.object({
  deviceId: z.string().min(8).max(128).optional(),
  deviceDbId: z.string().uuid().optional(),
});

const deviceSchema = z.object({
  deviceId: z.string().min(8).max(128).optional(),
  platform: z.enum(["ios", "android"]).optional(),
  appVersion: z.string().max(64).optional(),
  pushToken: z.string().nullable().optional(),
  pushProvider: z.enum(["apns", "fcm"]).nullable().optional(),
  pushEnabled: z.boolean().optional(),
  biometricCapable: z.boolean().optional(),
  biometricEnabled: z.boolean().optional(),
  notificationPreferences: z.record(z.unknown()).optional(),
});

const questionnaireResponseSchema = z.object({
  responses: z.array(z.object({
    questionId: z.string(),
    answer: z.union([
      z.string(),
      z.array(z.string()),
      z.boolean(),
      z.object({
        answer: z.string(),
        selectedOptions: z.array(z.string()).optional(),
      }),
    ]),
    metadata: z.any().optional(),
  })),
  sharedWithFamilyIds: z.array(z.string()).optional(),
});

const substitutionCreateSchema = z.object({
  scheduleId: z.string().uuid(),
  substituteId: z.string().optional().nullable(),
  reason: z.string().max(1000).optional().nullable(),
});

const substitutionClaimSchema = z.object({
  message: z.string().max(1000).optional().nullable(),
});

const confirmationSchema = z.object({
  status: z.enum(["confirmed", "declined"]).default("confirmed"),
  declineReason: z.string().max(1000).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

const profileUpdateSchema = z.object({
  name: z.string().min(3).max(255).optional(),
  phone: z.string().max(20).nullable().optional(),
  whatsapp: z.string().max(20).nullable().optional(),
  scheduleDisplayName: z.string().max(100).nullable().optional(),
  ministryStartDate: z.string().nullable().optional(),
  maritalStatus: z.string().max(20).nullable().optional(),
  preferredPosition: z.number().int().min(1).max(30).nullable().optional(),
  preferredPositions: z.array(z.number().int().min(1).max(30)).optional(),
  avoidPositions: z.array(z.number().int().min(1).max(30)).optional(),
  preferredTimes: z.array(z.string()).optional(),
  availableForSpecialEvents: z.boolean().optional(),
  extraActivities: z.object({
    sickCommunion: z.boolean().optional(),
    mondayAdoration: z.boolean().optional(),
    helpOtherPastorals: z.boolean().optional(),
    festiveEvents: z.boolean().optional(),
  }).optional(),
});

const mobilePlatformSchema = z.enum(["ios", "android"]).optional();

class MobileHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function getHeader(req: AuthRequest, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return value;
}

function getDeviceId(req: AuthRequest, fallback?: string | null): string | undefined {
  return fallback ?? getHeader(req, "x-device-id") ?? undefined;
}

function dbBoolean(value: boolean) {
  return (process.env.DATABASE_URL ? value : value ? 1 : 0) as any;
}

function dbCurrentTimestamp() {
  return sql`CURRENT_TIMESTAMP` as any;
}

function dbJson(value: unknown) {
  return (process.env.DATABASE_URL ? value : JSON.stringify(value ?? null)) as any;
}

function localUuid() {
  return process.env.DATABASE_URL ? {} : { id: randomUUID() };
}

function requireIdempotencyKey(req: AuthRequest): string {
  const idempotencyKey = parseMobileIdempotencyKey(getHeader(req, "idempotency-key"));

  if (!idempotencyKey) {
    throw new MobileHttpError(400, "Informe Idempotency-Key valido para esta mutacao");
  }

  return idempotencyKey;
}

async function startMobileMutationIdempotency(input: {
  req: AuthRequest;
  userId: string;
  communityId: string;
  body?: unknown;
}) {
  const idempotencyKey = requireIdempotencyKey(input.req);
  const path = (input.req.originalUrl || `${input.req.baseUrl}${input.req.path}`).split("?")[0];
  const requestHash = buildMobileRequestFingerprint({
    method: input.req.method,
    path,
    communityId: input.communityId,
    body: input.body ?? input.req.body ?? null,
  });

  return beginMobileIdempotency({
    userId: input.userId,
    idempotencyKey,
    method: input.req.method,
    path,
    requestHash,
  });
}

async function releaseMobileIdempotencyQuietly(recordId: string | null) {
  if (!recordId) return;

  try {
    await releaseMobileIdempotency(recordId);
  } catch (error) {
    console.error("[Mobile API] Failed to release idempotency record:", error);
  }
}

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

function getRequestedMonth(value: unknown) {
  if (typeof value === "string" && !/^\d{4}-\d{2}$/.test(value)) {
    throw new MobileHttpError(400, "Mes invalido. Use o formato YYYY-MM.");
  }

  try {
    return parseMobileMonth(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mes invalido. Use o formato YYYY-MM.";
    throw new MobileHttpError(400, message);
  }
}

function parseStoredJson(value: unknown) {
  let current = value;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (typeof current !== "string") return current;

    try {
      current = JSON.parse(current);
    } catch {
      return current;
    }
  }

  return current;
}

function normalizeStoredStringArray(value: unknown): string[] {
  const parsed = parseStoredJson(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is string => typeof item === "string");
}

function normalizeStoredNumberArray(value: unknown): number[] {
  const parsed = parseStoredJson(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is number => typeof item === "number" && Number.isFinite(item));
}

function getQuestionnaireTargetUserIds(value: unknown): string[] {
  return normalizeStoredStringArray(value);
}

function getResponseAvailability(value: unknown) {
  const parsed = parseStoredJson(value);

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const sections = [
      (parsed as { masses?: unknown }).masses,
      (parsed as { special_events?: unknown }).special_events,
      (parsed as { weekdays?: unknown }).weekdays,
    ];
    const hasAvailability = sections.some((section) => {
      if (!section || typeof section !== "object") return false;
      return JSON.stringify(section).includes("true");
    });

    return hasAvailability ? "Disponivel" : "Indisponivel";
  }

  if (!Array.isArray(parsed)) return "Nao informado";

  const monthlyAvailability = parsed.find((item) =>
    item && typeof item === "object" && (item as { questionId?: unknown }).questionId === "monthly_availability",
  ) as { answer?: unknown } | undefined;
  const legacyAvailability = parsed.find((item) =>
    item && typeof item === "object" && (item as { questionId?: unknown }).questionId === "availability",
  ) as { answer?: unknown } | undefined;
  const answer = monthlyAvailability?.answer ?? legacyAvailability?.answer;
  const normalizedAnswer =
    answer && typeof answer === "object" && !Array.isArray(answer) && "answer" in answer
      ? (answer as { answer?: unknown }).answer
      : answer;

  const normalizedText = typeof normalizedAnswer === "string"
    ? normalizedAnswer.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    : normalizedAnswer;

  if (normalizedText === "Sim" || normalizedText === "yes" || normalizedText === "Disponivel") {
    return "Disponivel";
  }

  if (normalizedText === "Nao" || normalizedText === "no" || normalizedText === "Indisponivel") {
    return "Indisponivel";
  }

  return typeof normalizedAnswer === "string" && normalizedAnswer.trim() ? normalizedAnswer : "Nao informado";
}

function toMobileDataQuality(user: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  homeCommunityId?: string | null;
  scheduleDisplayName?: string | null;
  preferredPosition?: number | null;
  preferredPositions?: unknown;
  preferredTimes?: unknown;
  ministryStartDate?: string | Date | null;
  birthDate?: string | Date | null;
  address?: string | null;
  city?: string | null;
  maritalStatus?: string | null;
  baptismDate?: string | Date | null;
  baptismParish?: string | null;
  confirmationDate?: string | Date | null;
  confirmationParish?: string | null;
  liturgicalTraining?: boolean | number | null;
  formationCompleted?: boolean | number | null;
  canServeAsCouple?: boolean | number | null;
  spouseMinisterId?: string | null;
}) {
  return buildMobileProfileReadiness({
    ...user,
    preferredPositions: normalizeStoredNumberArray(user.preferredPositions),
    preferredTimes: normalizeStoredStringArray(user.preferredTimes),
  });
}

function summarizeDataQuality(rows: Array<{ dataQuality: ReturnType<typeof toMobileDataQuality> }>) {
  return rows.reduce(
    (summary, row) => {
      if (row.dataQuality.status === "ready") summary.ready += 1;
      else if (row.dataQuality.status === "blocked") summary.blocked += 1;
      else summary.needsAttention += 1;
      return summary;
    },
    { ready: 0, needsAttention: 0, blocked: 0 },
  );
}

async function loadMobileQuestionnaireTargetMinisters(input: {
  communityId: string;
  targetUserIds?: string[];
}) {
  const targetUserIds = input.targetUserIds?.filter(Boolean) ?? [];

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      phone: users.phone,
      whatsapp: users.whatsapp,
      photoUrl: users.photoUrl,
      homeCommunityId: users.homeCommunityId,
      scheduleDisplayName: users.scheduleDisplayName,
      preferredPosition: users.preferredPosition,
      preferredPositions: users.preferredPositions,
      avoidPositions: users.avoidPositions,
      preferredTimes: users.preferredTimes,
      ministryStartDate: users.ministryStartDate,
      birthDate: users.birthDate,
      address: users.address,
      city: users.city,
      maritalStatus: users.maritalStatus,
      baptismDate: users.baptismDate,
      baptismParish: users.baptismParish,
      confirmationDate: users.confirmationDate,
      confirmationParish: users.confirmationParish,
      liturgicalTraining: users.liturgicalTraining,
      formationCompleted: users.formationCompleted,
      canServeAsCouple: users.canServeAsCouple,
      spouseMinisterId: users.spouseMinisterId,
    })
    .from(users)
    .where(
      and(
        eq(users.homeCommunityId, input.communityId),
        eq(users.status, "active"),
        inArray(users.role, DB_MINISTER_AND_COORDINATOR_ROLES),
        targetUserIds.length > 0 ? inArray(users.id, targetUserIds) : undefined,
      ),
    )
    .orderBy(asc(users.name));

  return rows.map((minister) => ({
    ...minister,
    displayName: minister.scheduleDisplayName || minister.name,
    photoUrl: minister.photoUrl ?? null,
    preferredPositions: normalizeStoredNumberArray(minister.preferredPositions),
    avoidPositions: normalizeStoredNumberArray(minister.avoidPositions),
    preferredTimes: normalizeStoredStringArray(minister.preferredTimes),
    dataQuality: toMobileDataQuality(minister),
  }));
}

type MobileSubstitutionUserSummary = {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
};

async function loadMobileSubstitutionUsers(
  rows: Array<{ requesterId: string; substituteId: string | null }>,
) {
  const userIds = Array.from(new Set(
    rows.flatMap((row) => [row.requesterId, row.substituteId]).filter((id): id is string => Boolean(id)),
  ));

  if (userIds.length === 0) {
    return new Map<string, MobileSubstitutionUserSummary>();
  }

  const people = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      photoUrl: users.photoUrl,
    })
    .from(users)
    .where(inArray(users.id, userIds));

  return new Map(people.map((person) => [
    person.id,
    {
      ...person,
      name: formatMinisterName(person.name),
      photoUrl: person.photoUrl ?? null,
    },
  ]));
}

function toMobileSubstitution(row: {
  id: string;
  scheduleId: string;
  requesterId: string;
  substituteId: string | null;
  status: string;
  reason: string | null;
  urgency: string;
  responseMessage: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  scheduleDate: string;
  scheduleTime: string;
  scheduleType: string;
  scheduleLocation: string | null;
  requester?: MobileSubstitutionUserSummary | null;
  substitute?: MobileSubstitutionUserSummary | null;
}) {
  return {
    id: row.id,
    scheduleId: row.scheduleId,
    requesterId: row.requesterId,
    substituteId: row.substituteId,
    status: row.status,
    reason: row.reason,
    urgency: row.urgency,
    responseMessage: row.responseMessage,
    schedule: {
      id: row.scheduleId,
      date: row.scheduleDate,
      time: row.scheduleTime,
      type: row.scheduleType,
      location: row.scheduleLocation,
      deepLink: `/schedules/${row.scheduleId}`,
    },
    requester: row.requester ?? null,
    substitute: row.substitute ?? null,
    deepLink: `/substitutions/${row.id}`,
    createdAt: toIsoDate(row.createdAt),
    updatedAt: toIsoDate(row.updatedAt),
  };
}

function toMobileCommunity(row: {
  id: string;
  name: string;
  slug: string;
  colorHex: string;
  parishName: string;
  isMatriz: boolean;
}): MobileCommunitySummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    colorHex: row.colorHex,
    parishName: row.parishName,
    isMatriz: row.isMatriz,
  };
}

function toMobileProfile(user: {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  role: string;
  status: string;
  photoUrl: string | null;
  profileImageUrl: string | null;
  homeCommunityId: string;
  scheduleDisplayName: string | null;
  ministryStartDate: string | Date | null;
  maritalStatus: string | null;
  preferredPosition: number | null;
  preferredPositions: number[] | null;
  avoidPositions: number[] | null;
  preferredTimes: string[] | null;
  availableForSpecialEvents: boolean | null;
  extraActivities: Record<string, unknown> | null;
  requiresPasswordChange: boolean | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    whatsapp: user.whatsapp,
    role: user.role,
    status: user.status,
    photoUrl: user.photoUrl ?? user.profileImageUrl ?? null,
    homeCommunityId: user.homeCommunityId,
    scheduleDisplayName: user.scheduleDisplayName,
    ministryStartDate: toDateOnly(user.ministryStartDate),
    maritalStatus: user.maritalStatus,
    preferredPosition: user.preferredPosition,
    preferredPositions: normalizeStoredNumberArray(user.preferredPositions),
    avoidPositions: normalizeStoredNumberArray(user.avoidPositions),
    preferredTimes: normalizeStoredStringArray(user.preferredTimes),
    availableForSpecialEvents: Boolean(user.availableForSpecialEvents),
    extraActivities: user.extraActivities ?? {},
    requiresPasswordChange: Boolean(user.requiresPasswordChange),
    createdAt: toIsoDate(user.createdAt),
    updatedAt: toIsoDate(user.updatedAt),
  };
}

async function getAccessibleCommunities(user: MobileUserSource): Promise<MobileCommunitySummary[]> {
  const rows = await db
    .select({
      id: communities.id,
      name: communities.name,
      slug: communities.slug,
      colorHex: communities.colorHex,
      parishName: communities.parishName,
      isMatriz: communities.isMatriz,
    })
    .from(communities)
    .where(
      and(
        eq(communities.active, dbBoolean(true)),
        isParishWide(user.role) ? undefined : eq(communities.id, user.homeCommunityId),
      ),
    )
    .orderBy(desc(communities.isMatriz), asc(communities.name));

  return rows.map(toMobileCommunity);
}

async function resolveActiveCommunity(req: AuthRequest): Promise<MobileCommunitySummary> {
  const user = req.user;
  if (!user) {
    throw new MobileHttpError(401, "Usuario nao autenticado");
  }

  const requestedCommunityId = getHeader(req, "x-community-id");
  const communityScope = resolveMobileCommunityScope(user, requestedCommunityId);

  if (!communityScope.allowed) {
    throw new MobileHttpError(communityScope.status, communityScope.message);
  }

  const [row] = await db
    .select({
      id: communities.id,
      name: communities.name,
      slug: communities.slug,
      colorHex: communities.colorHex,
      parishName: communities.parishName,
      isMatriz: communities.isMatriz,
    })
    .from(communities)
    .where(
      and(
        eq(communities.id, communityScope.activeCommunityId),
        eq(communities.active, dbBoolean(true)),
      ),
    )
    .limit(1);

  if (!row) {
    throw new MobileHttpError(404, "Comunidade nao encontrada ou inativa");
  }

  return toMobileCommunity(row);
}

function handleMobileError(res: Response, error: unknown, fallbackMessage: string) {
  if (error instanceof MobileHttpError) {
    return res.status(error.status).json({ success: false, message: error.message });
  }

  if (error instanceof MobileSessionError) {
    return res.status(error.status).json({ success: false, message: error.message });
  }

  if (error instanceof MobileIdempotencyError) {
    return res.status(error.status).json({ success: false, message: error.message });
  }

  if (error instanceof z.ZodError) {
    return res.status(400).json({
      success: false,
      message: "Dados invalidos",
      errors: error.errors,
    });
  }

  console.error(`[Mobile API] ${fallbackMessage}:`, error);
  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
}

router.get("/app/config", (req, res) => {
  const platform = mobilePlatformSchema.safeParse(
    req.query.platform ?? req.headers["x-platform"],
  );

  res.json({
    apiVersion: "mobile-v1",
    serverTime: new Date().toISOString(),
    platform: platform.success ? platform.data ?? null : null,
    minimumSupported: {
      ios: { version: "1.0.0", build: 1 },
      android: { version: "1.0.0", build: 1 },
    },
    featureFlags: {
      biometrics: true,
      pushRegistration: true,
      refreshTokenRotation: true,
      coordinatorMobile: false,
    },
    links: {
      privacy: "/privacy-policy",
      terms: "/terms-of-use",
      accountDeletion: "/account-deletion",
      support: "mailto:suporte@saojudastadeu.app",
    },
  });
});

router.post("/auth/login", authRateLimiter, async (req, res) => {
  let parsed: z.infer<typeof loginSchema> | undefined;

  try {
    parsed = loginSchema.parse(req.body);
    const result = await login(parsed.email, parsed.password);

    await auditLoginAttempt(parsed.email, true, req, undefined, result.user.id);
    await logActivity(result.user.id, "login", {
      platform: parsed.platform ?? req.get("x-platform") ?? "unknown",
      appVersion: parsed.appVersion ?? req.get("x-app-version") ?? "unknown",
      source: "mobile-v1",
    }, req);

    const sessionToken = await createSession(
      result.user.id,
      req.ip || req.socket.remoteAddress,
      req.get("user-agent"),
    );

    const mobileSession = await createMobileSession({
      userId: result.user.id,
      deviceId: getDeviceId(req as AuthRequest, parsed.deviceId),
      platform: parsed.platform ?? req.get("x-platform"),
      appVersion: parsed.appVersion ?? req.get("x-app-version"),
      keepSignedIn: parsed.keepSignedIn,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get("user-agent"),
    });

    const mobileUser = sanitizeMobileUser(result.user as MobileUserSource);
    const accessibleCommunities = await getAccessibleCommunities(result.user as MobileUserSource);

    res.json({
      success: true,
      auth: {
        tokenType: "Bearer",
        accessToken: result.token,
        refreshToken: mobileSession.refreshToken,
        refreshTokenExpiresAt: mobileSession.refreshTokenExpiresAt?.toISOString() ?? null,
        sessionToken,
        expiresInSeconds: parseJwtExpirySeconds(process.env.JWT_EXPIRES_IN || "24h"),
        keepSignedIn: parsed.keepSignedIn,
      },
      user: mobileUser,
      communities: accessibleCommunities,
      activeCommunityId: mobileUser.homeCommunityId,
      device: {
        ...sanitizeMobileDevice(mobileSession.device),
        registered: true,
      },
      capabilities: {
        biometricUnlock: true,
        refreshTokenRotation: true,
        remoteDeviceLogout: true,
      },
    });
  } catch (error: unknown) {
    if (parsed?.email) {
      const message = error instanceof Error ? error.message : "Credenciais invalidas";
      await auditLoginAttempt(parsed.email, false, req, message);
    }

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Dados invalidos",
        errors: error.errors,
      });
    }

    const message = error instanceof Error ? error.message : "Erro ao fazer login";
    return res.status(401).json({
      success: false,
      message,
    });
  }
});

router.post("/auth/refresh", authRateLimiter, async (req, res) => {
  try {
    const parsed = refreshSchema.parse(req.body);
    const refreshed = await consumeMobileRefreshToken({
      refreshToken: parsed.refreshToken,
      deviceId: getDeviceId(req as AuthRequest, parsed.deviceId),
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get("user-agent"),
    });

    const accessToken = generateToken(refreshed.user);
    const mobileUser = sanitizeMobileUser(refreshed.user);
    const accessibleCommunities = await getAccessibleCommunities(refreshed.user);

    res.json({
      success: true,
      auth: {
        tokenType: "Bearer",
        accessToken,
        refreshToken: refreshed.refreshToken,
        refreshTokenExpiresAt: refreshed.refreshTokenExpiresAt.toISOString(),
        sessionToken: null,
        expiresInSeconds: parseJwtExpirySeconds(process.env.JWT_EXPIRES_IN || "24h"),
        keepSignedIn: true,
      },
      user: mobileUser,
      communities: accessibleCommunities,
      activeCommunityId: mobileUser.homeCommunityId,
      device: {
        ...sanitizeMobileDevice(refreshed.device),
        registered: true,
      },
    });
  } catch (error) {
    return handleMobileError(res, error, "Erro ao renovar sessao mobile");
  }
});

router.post("/auth/logout", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    const parsed = logoutSchema.parse(req.body ?? {});
    const deviceId = getDeviceId(req, parsed.deviceId);

    if (!deviceId && !parsed.deviceDbId) {
      throw new MobileHttpError(400, "Informe X-Device-Id ou deviceDbId para encerrar a sessao mobile");
    }

    const revoked = await revokeMobileDeviceForUser({
      userId: user.id,
      deviceDbId: parsed.deviceDbId,
      deviceId,
    });

    res.json({
      success: true,
      revoked,
    });
  } catch (error) {
    return handleMobileError(res, error, "Erro ao encerrar sessao mobile");
  }
});

router.get("/auth/me", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    const [fullUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!fullUser) {
      throw new MobileHttpError(404, "Usuario nao encontrado");
    }

    const accessibleCommunities = await getAccessibleCommunities(fullUser);

    res.json({
      success: true,
      user: sanitizeMobileUser(fullUser),
      communities: accessibleCommunities,
      activeCommunityId: fullUser.homeCommunityId,
    });
  } catch (error) {
    return handleMobileError(res, error, "Erro ao buscar usuario mobile");
  }
});

router.get("/devices", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    const devices = await listMobileDevicesForUser(user.id);

    res.json({
      success: true,
      devices: devices.map(sanitizeMobileDevice),
    });
  } catch (error) {
    return handleMobileError(res, error, "Erro ao listar dispositivos");
  }
});

router.put("/devices/current", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    const parsed = deviceSchema.parse(req.body ?? {});
    const deviceId = getDeviceId(req, parsed.deviceId);

    if (!deviceId) {
      throw new MobileHttpError(400, "Informe X-Device-Id ou deviceId para registrar o dispositivo");
    }

    const device = await createOrUpdateMobileDevice({
      userId: user.id,
      deviceId,
      platform: parsed.platform ?? getHeader(req, "x-platform"),
      appVersion: parsed.appVersion ?? getHeader(req, "x-app-version"),
      pushToken: parsed.pushToken,
      pushProvider: parsed.pushProvider,
      pushEnabled: parsed.pushEnabled,
      biometricCapable: parsed.biometricCapable,
      biometricEnabled: parsed.biometricEnabled,
      notificationPreferences: parsed.notificationPreferences,
    });

    res.json({
      success: true,
      device: sanitizeMobileDevice(device),
    });
  } catch (error) {
    return handleMobileError(res, error, "Erro ao registrar dispositivo");
  }
});

router.delete("/devices/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    const revoked = await revokeMobileDeviceForUser({
      userId: user.id,
      deviceDbId: req.params.id,
    });

    if (!revoked) {
      throw new MobileHttpError(404, "Dispositivo nao encontrado");
    }

    res.json({
      success: true,
      revoked,
    });
  } catch (error) {
    return handleMobileError(res, error, "Erro ao revogar dispositivo");
  }
});

router.get("/profile", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        whatsapp: users.whatsapp,
        role: users.role,
        status: users.status,
        photoUrl: users.photoUrl,
        profileImageUrl: users.profileImageUrl,
        homeCommunityId: users.homeCommunityId,
        scheduleDisplayName: users.scheduleDisplayName,
        ministryStartDate: users.ministryStartDate,
        maritalStatus: users.maritalStatus,
        preferredPosition: users.preferredPosition,
        preferredPositions: users.preferredPositions,
        avoidPositions: users.avoidPositions,
        preferredTimes: users.preferredTimes,
        availableForSpecialEvents: users.availableForSpecialEvents,
        extraActivities: users.extraActivities,
        requiresPasswordChange: users.requiresPasswordChange,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!user) {
      throw new MobileHttpError(404, "Perfil nao encontrado");
    }

    res.json({
      success: true,
      profile: toMobileProfile(user),
    });
  } catch (error) {
    return handleMobileError(res, error, "Erro ao carregar perfil");
  }
});

router.patch("/profile", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    const parsed = profileUpdateSchema.parse(req.body ?? {});
    const updateData: Partial<typeof users.$inferInsert> = {};

    if (parsed.name !== undefined) updateData.name = parsed.name.trim();
    if (parsed.phone !== undefined) updateData.phone = parsed.phone;
    if (parsed.whatsapp !== undefined) updateData.whatsapp = parsed.whatsapp;
    if (parsed.scheduleDisplayName !== undefined) {
      updateData.scheduleDisplayName = parsed.scheduleDisplayName
        ? formatMinisterName(parsed.scheduleDisplayName)
        : null;
    }
    if (parsed.ministryStartDate !== undefined) updateData.ministryStartDate = parsed.ministryStartDate;
    if (parsed.maritalStatus !== undefined) updateData.maritalStatus = parsed.maritalStatus;
    if (parsed.preferredPosition !== undefined) updateData.preferredPosition = parsed.preferredPosition;
    if (parsed.preferredPositions !== undefined) updateData.preferredPositions = parsed.preferredPositions;
    if (parsed.avoidPositions !== undefined) updateData.avoidPositions = parsed.avoidPositions;
    if (parsed.preferredTimes !== undefined) updateData.preferredTimes = parsed.preferredTimes;
    if (parsed.availableForSpecialEvents !== undefined) {
      updateData.availableForSpecialEvents = parsed.availableForSpecialEvents;
    }
    if (parsed.extraActivities !== undefined) {
      const [currentUser] = await db
        .select({ extraActivities: users.extraActivities })
        .from(users)
        .where(eq(users.id, authUser.id))
        .limit(1);
      const currentExtraActivities = currentUser?.extraActivities ?? {};
      updateData.extraActivities = {
        sickCommunion: false,
        mondayAdoration: false,
        helpOtherPastorals: false,
        festiveEvents: false,
        ...currentExtraActivities,
        ...parsed.extraActivities,
      };
    }

    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, authUser.id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        whatsapp: users.whatsapp,
        role: users.role,
        status: users.status,
        photoUrl: users.photoUrl,
        profileImageUrl: users.profileImageUrl,
        homeCommunityId: users.homeCommunityId,
        scheduleDisplayName: users.scheduleDisplayName,
        ministryStartDate: users.ministryStartDate,
        maritalStatus: users.maritalStatus,
        preferredPosition: users.preferredPosition,
        preferredPositions: users.preferredPositions,
        avoidPositions: users.avoidPositions,
        preferredTimes: users.preferredTimes,
        availableForSpecialEvents: users.availableForSpecialEvents,
        extraActivities: users.extraActivities,
        requiresPasswordChange: users.requiresPasswordChange,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    if (!updated) {
      throw new MobileHttpError(404, "Perfil nao encontrado");
    }

    await logActivity(authUser.id, "update_profile", {
      source: "mobile-v1",
      changedFields: Object.keys(parsed),
    }, req);

    res.json({
      success: true,
      profile: toMobileProfile(updated),
    });
  } catch (error) {
    return handleMobileError(res, error, "Erro ao atualizar perfil");
  }
});

router.get("/notifications", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const rows = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        priority: notifications.priority,
        read: notifications.read,
        readAt: notifications.readAt,
        data: notifications.data,
        actionUrl: notifications.actionUrl,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    const [unread] = await db
      .select({ total: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), eq(notifications.read, dbBoolean(false))));

    res.json({
      success: true,
      notifications: rows.map((notification) => ({
        id: notification.id,
        type: notification.type,
        eventKey: extractMobileNotificationEventKey(notification.data),
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        read: Boolean(notification.read),
        readAt: toIsoDate(notification.readAt),
        deepLink: notification.actionUrl ?? "/notifications",
        createdAt: toIsoDate(notification.createdAt),
      })),
      unreadCount: Number(unread?.total ?? 0),
    });
  } catch (error) {
    return handleMobileError(res, error, "Erro ao carregar notificacoes");
  }
});

router.patch("/notifications/read-all", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    await db
      .update(notifications)
      .set({ read: dbBoolean(true), readAt: dbCurrentTimestamp() })
      .where(and(eq(notifications.userId, user.id), eq(notifications.read, dbBoolean(false))));

    res.json({ success: true });
  } catch (error) {
    return handleMobileError(res, error, "Erro ao marcar notificacoes como lidas");
  }
});

router.patch("/notifications/:id/read", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    const [notification] = await db
      .update(notifications)
      .set({ read: dbBoolean(true), readAt: dbCurrentTimestamp() })
      .where(and(eq(notifications.id, req.params.id), eq(notifications.userId, user.id)))
      .returning({
        id: notifications.id,
        read: notifications.read,
        readAt: notifications.readAt,
      });

    if (!notification) {
      throw new MobileHttpError(404, "Notificacao nao encontrada");
    }

    res.json({
      success: true,
      notification: {
        id: notification.id,
        read: Boolean(notification.read),
        readAt: toIsoDate(notification.readAt),
      },
    });
  } catch (error) {
    return handleMobileError(res, error, "Erro ao marcar notificacao como lida");
  }
});

router.get("/privacy/account-deletion-info", authenticateToken, (_req: AuthRequest, res) => {
  res.json({
    success: true,
    confirmationText: "EXCLUIR MINHA CONTA",
    retainedOperationalData:
      "Escalas e registros operacionais podem ser preservados sem dados pessoais identificaveis para continuidade pastoral, auditoria e seguranca.",
    deletedData: [
      "nome, email, telefone, foto e dados sacramentais",
      "notificacoes e inscricoes de push",
      "sessoes ativas e dispositivos moveis",
      "vinculos familiares",
      "respostas de questionarios e observacoes pessoais",
      "progresso de formacao, gamificacao e certificados vinculados a conta",
    ],
  });
});

router.get("/questionnaires/current", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    const activeCommunity = await resolveActiveCommunity(req);
    const monthRange = getRequestedMonth(req.query.month);

    const [questionnaire] = await db
      .select({
        id: questionnaires.id,
        title: questionnaires.title,
        description: questionnaires.description,
        month: questionnaires.month,
        year: questionnaires.year,
        status: questionnaires.status,
        questions: questionnaires.questions,
        deadline: questionnaires.deadline,
        updatedAt: questionnaires.updatedAt,
      })
      .from(questionnaires)
      .where(
        and(
          eq(questionnaires.communityId, activeCommunity.id),
          eq(questionnaires.status, "published"),
          eq(questionnaires.month, monthRange.month),
          eq(questionnaires.year, monthRange.year),
        ),
      )
      .orderBy(desc(questionnaires.updatedAt))
      .limit(1);

    if (!questionnaire) {
      return res.json({
        success: true,
        community: activeCommunity,
        month: monthRange.isoMonth,
        questionnaire: null,
      });
    }

    const [response] = await db
      .select({
        id: questionnaireResponses.id,
        responses: questionnaireResponses.responses,
        submittedAt: questionnaireResponses.submittedAt,
        updatedAt: questionnaireResponses.updatedAt,
      })
      .from(questionnaireResponses)
      .where(
        and(
          eq(questionnaireResponses.questionnaireId, questionnaire.id),
          eq(questionnaireResponses.userId, user.id),
          eq(questionnaireResponses.isDeleted, dbBoolean(false)),
        ),
      )
      .limit(1);

    res.json({
      success: true,
      community: activeCommunity,
      month: monthRange.isoMonth,
      questionnaire: {
        id: questionnaire.id,
        title: questionnaire.title,
        description: questionnaire.description,
        month: questionnaire.month,
        year: questionnaire.year,
        status: questionnaire.status,
        questions: questionnaire.questions,
        deadline: toIsoDate(questionnaire.deadline),
        responseStatus: response ? "answered" : "pending",
        response: response
          ? {
              id: response.id,
              responses: parseStoredJson(response.responses),
              submittedAt: toIsoDate(response.submittedAt),
              updatedAt: toIsoDate(response.updatedAt),
            }
          : null,
      },
    });
  } catch (error) {
    return handleMobileError(res, error, "Erro ao carregar questionario atual");
  }
});

router.post("/questionnaires/:id/response", authenticateToken, async (req: AuthRequest, res) => {
  let idempotencyRecordId: string | null = null;

  try {
    const user = req.user;
    if (!user) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    const parsed = questionnaireResponseSchema.parse(req.body);
    const activeCommunity = await resolveActiveCommunity(req);
    const idempotency = await startMobileMutationIdempotency({
      req,
      userId: user.id,
      communityId: activeCommunity.id,
      body: parsed,
    });

    if (idempotency.kind === "replay") {
      return res.status(idempotency.responseStatus).json(idempotency.responseBody);
    }

    idempotencyRecordId = idempotency.recordId;
    const idempotencyKey = idempotency.idempotencyKey;

    const [questionnaire] = await db
      .select()
      .from(questionnaires)
      .where(and(eq(questionnaires.id, req.params.id), eq(questionnaires.communityId, activeCommunity.id)))
      .limit(1);

    if (!questionnaire) {
      throw new MobileHttpError(404, "Questionario nao encontrado");
    }

    if (questionnaire.status === "closed") {
      throw new MobileHttpError(400, "Este questionario foi encerrado e nao aceita respostas");
    }

    if (questionnaire.status !== "published") {
      throw new MobileHttpError(400, "Questionario ainda nao esta publicado");
    }

    const processingResult = QuestionnaireService.standardizeResponseWithTracking(
      parsed.responses,
      questionnaire.month,
      questionnaire.year,
    );
    const standardizedResponse = processingResult.standardized;
    const extractedData = QuestionnaireService.extractStructuredData(standardizedResponse);

    if (extractedData.alternativeTimes && Array.isArray(extractedData.alternativeTimes)) {
      (standardizedResponse as any).alternative_times = extractedData.alternativeTimes;
    }

    delete (standardizedResponse as any)._alternativeTimes;
    delete (standardizedResponse as any)._preferredTime;

    const [saved] = await db
      .insert(questionnaireResponses)
      .values({
        ...localUuid(),
        userId: user.id,
        questionnaireId: questionnaire.id,
        communityId: questionnaire.communityId,
        responses: JSON.stringify(standardizedResponse) as any,
        availableSundays: dbJson(extractedData.availableSundays),
        preferredMassTimes: dbJson(extractedData.preferredMassTimes),
        alternativeTimes: dbJson(extractedData.alternativeTimes),
        dailyMassAvailability: dbJson(extractedData.dailyMassAvailability),
        specialEvents: dbJson(extractedData.specialEvents),
        canSubstitute: dbBoolean(Boolean(extractedData.canSubstitute)),
        notes: extractedData.notes,
        unmappedResponses: dbJson(processingResult.unmappedResponses),
        processingWarnings: dbJson(processingResult.warnings),
        sharedWithFamilyIds: dbJson(parsed.sharedWithFamilyIds || []),
        isSharedResponse: dbBoolean(false),
        isDeleted: dbBoolean(false),
        deletedAt: null,
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [questionnaireResponses.userId, questionnaireResponses.questionnaireId],
        set: {
          responses: JSON.stringify(standardizedResponse) as any,
          availableSundays: dbJson(extractedData.availableSundays),
          preferredMassTimes: dbJson(extractedData.preferredMassTimes),
          alternativeTimes: dbJson(extractedData.alternativeTimes),
          dailyMassAvailability: dbJson(extractedData.dailyMassAvailability),
          specialEvents: dbJson(extractedData.specialEvents),
          canSubstitute: dbBoolean(Boolean(extractedData.canSubstitute)),
          notes: extractedData.notes,
          unmappedResponses: dbJson(processingResult.unmappedResponses),
          processingWarnings: dbJson(processingResult.warnings),
          sharedWithFamilyIds: dbJson(parsed.sharedWithFamilyIds || []),
          isSharedResponse: dbBoolean(false),
          isDeleted: dbBoolean(false),
          deletedAt: null,
          submittedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    await logActivity(user.id, "respond_questionnaire", {
      source: "mobile-v1",
      questionnaireId: questionnaire.id,
      communityId: activeCommunity.id,
      idempotencyKey,
    }, req);

    const responseBody = {
      success: true,
      response: {
        id: saved.id,
        questionnaireId: questionnaire.id,
        submittedAt: toIsoDate(saved.submittedAt),
        updatedAt: toIsoDate(saved.updatedAt),
        processingWarnings: processingResult.warnings,
        unmappedResponses: processingResult.unmappedResponses,
      },
    };

    await completeMobileIdempotency({
      recordId: idempotencyRecordId,
      responseStatus: 200,
      responseBody,
    });
    idempotencyRecordId = null;

    res.json(responseBody);
  } catch (error) {
    await releaseMobileIdempotencyQuietly(idempotencyRecordId);
    return handleMobileError(res, error, "Erro ao salvar resposta do questionario");
  }
});

router.get("/substitutions", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    const activeCommunity = await resolveActiveCommunity(req);
    const admin = isAdmin(user.role);

    const rows = await db
      .select({
        id: substitutionRequests.id,
        scheduleId: substitutionRequests.scheduleId,
        requesterId: substitutionRequests.requesterId,
        substituteId: substitutionRequests.substituteId,
        status: substitutionRequests.status,
        reason: substitutionRequests.reason,
        urgency: substitutionRequests.urgency,
        responseMessage: substitutionRequests.responseMessage,
        createdAt: substitutionRequests.createdAt,
        updatedAt: substitutionRequests.updatedAt,
        scheduleDate: schedules.date,
        scheduleTime: schedules.time,
        scheduleType: schedules.type,
        scheduleLocation: schedules.location,
      })
      .from(substitutionRequests)
      .innerJoin(schedules, eq(substitutionRequests.scheduleId, schedules.id))
      .where(
        and(
          eq(substitutionRequests.communityId, activeCommunity.id),
          admin
            ? undefined
            : or(
                eq(substitutionRequests.requesterId, user.id),
                eq(substitutionRequests.substituteId, user.id),
                eq(substitutionRequests.status, "available"),
              ),
        ),
      )
      .orderBy(desc(substitutionRequests.createdAt))
      .limit(50);

    const usersById = await loadMobileSubstitutionUsers(rows);

    res.json({
      success: true,
      community: activeCommunity,
      substitutions: rows.map((row) => toMobileSubstitution({
        ...row,
        requester: usersById.get(row.requesterId) ?? null,
        substitute: row.substituteId ? usersById.get(row.substituteId) ?? null : null,
      })),
    });
  } catch (error) {
    return handleMobileError(res, error, "Erro ao carregar substituicoes");
  }
});

router.post("/substitutions", authenticateToken, async (req: AuthRequest, res) => {
  let idempotencyRecordId: string | null = null;

  try {
    const user = req.user;
    if (!user) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    const parsed = substitutionCreateSchema.parse(req.body);
    const activeCommunity = await resolveActiveCommunity(req);
    const idempotency = await startMobileMutationIdempotency({
      req,
      userId: user.id,
      communityId: activeCommunity.id,
      body: parsed,
    });

    if (idempotency.kind === "replay") {
      return res.status(idempotency.responseStatus).json(idempotency.responseBody);
    }

    idempotencyRecordId = idempotency.recordId;
    const idempotencyKey = idempotency.idempotencyKey;

    const [schedule] = await db
      .select()
      .from(schedules)
      .where(and(eq(schedules.id, parsed.scheduleId), eq(schedules.communityId, activeCommunity.id)))
      .limit(1);

    if (!schedule) {
      throw new MobileHttpError(404, "Escala nao encontrada");
    }

    if (schedule.ministerId !== user.id) {
      throw new MobileHttpError(403, "Voce nao esta escalado para esta missa");
    }

    if (isLocalScheduleDateTimePast(schedule.date, schedule.time)) {
      throw new MobileHttpError(400, "Nao e possivel solicitar substituicao para missa que ja passou");
    }

    const [existingRequest] = await db
      .select()
      .from(substitutionRequests)
      .where(
        and(
          eq(substitutionRequests.scheduleId, schedule.id),
          eq(substitutionRequests.requesterId, user.id),
          inArray(substitutionRequests.status, ["available", "pending"]),
        ),
      )
      .limit(1);

    if (existingRequest) {
      throw new MobileHttpError(400, "Ja existe uma solicitacao pendente para esta escala");
    }

    const finalSubstituteId = parsed.substituteId || null;
    const [created] = await db
      .insert(substitutionRequests)
      .values({
        ...localUuid(),
        scheduleId: schedule.id,
        requesterId: user.id,
        substituteId: finalSubstituteId,
        communityId: activeCommunity.id,
        reason: parsed.reason || null,
        status: finalSubstituteId ? "pending" : "available",
        urgency: calculateScheduleUrgency(schedule.date, schedule.time),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await trackSubstitutionRequest(user.id, schedule.id);
    scheduleCache.invalidateByDate(schedule.date);
    await logActivity(user.id, "request_substitution", {
      source: "mobile-v1",
      scheduleId: schedule.id,
      substitutionId: created.id,
      communityId: activeCommunity.id,
      idempotencyKey,
    }, req);

    const usersById = await loadMobileSubstitutionUsers([created]);

    const responseBody = {
      success: true,
      substitution: toMobileSubstitution({
        ...created,
        scheduleDate: schedule.date,
        scheduleTime: schedule.time,
        scheduleType: schedule.type,
        scheduleLocation: schedule.location,
        requester: usersById.get(created.requesterId) ?? null,
        substitute: created.substituteId ? usersById.get(created.substituteId) ?? null : null,
      }),
    };

    await completeMobileIdempotency({
      recordId: idempotencyRecordId,
      responseStatus: 201,
      responseBody,
    });
    idempotencyRecordId = null;

    res.status(201).json(responseBody);
  } catch (error) {
    await releaseMobileIdempotencyQuietly(idempotencyRecordId);
    return handleMobileError(res, error, "Erro ao pedir substituicao");
  }
});

router.get("/substitutions/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    const activeCommunity = await resolveActiveCommunity(req);
    const [row] = await db
      .select({
        id: substitutionRequests.id,
        scheduleId: substitutionRequests.scheduleId,
        requesterId: substitutionRequests.requesterId,
        substituteId: substitutionRequests.substituteId,
        status: substitutionRequests.status,
        reason: substitutionRequests.reason,
        urgency: substitutionRequests.urgency,
        responseMessage: substitutionRequests.responseMessage,
        createdAt: substitutionRequests.createdAt,
        updatedAt: substitutionRequests.updatedAt,
        scheduleDate: schedules.date,
        scheduleTime: schedules.time,
        scheduleType: schedules.type,
        scheduleLocation: schedules.location,
      })
      .from(substitutionRequests)
      .innerJoin(schedules, eq(substitutionRequests.scheduleId, schedules.id))
      .where(and(eq(substitutionRequests.id, req.params.id), eq(substitutionRequests.communityId, activeCommunity.id)))
      .limit(1);

    if (!row) {
      throw new MobileHttpError(404, "Substituicao nao encontrada");
    }

    if (!isAdmin(user.role) && row.requesterId !== user.id && row.substituteId !== user.id && row.status !== "available") {
      throw new MobileHttpError(403, "Sem permissao para ver esta substituicao");
    }

    const usersById = await loadMobileSubstitutionUsers([row]);

    res.json({
      success: true,
      substitution: toMobileSubstitution({
        ...row,
        requester: usersById.get(row.requesterId) ?? null,
        substitute: row.substituteId ? usersById.get(row.substituteId) ?? null : null,
      }),
    });
  } catch (error) {
    return handleMobileError(res, error, "Erro ao carregar substituicao");
  }
});

router.post("/substitutions/:id/claim", authenticateToken, async (req: AuthRequest, res) => {
  let idempotencyRecordId: string | null = null;

  try {
    const user = req.user;
    if (!user) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    const parsed = substitutionClaimSchema.parse(req.body ?? {});
    const activeCommunity = await resolveActiveCommunity(req);
    const idempotency = await startMobileMutationIdempotency({
      req,
      userId: user.id,
      communityId: activeCommunity.id,
      body: parsed,
    });

    if (idempotency.kind === "replay") {
      return res.status(idempotency.responseStatus).json(idempotency.responseBody);
    }

    idempotencyRecordId = idempotency.recordId;
    const idempotencyKey = idempotency.idempotencyKey;

    const [row] = await db
      .select({
        id: substitutionRequests.id,
        scheduleId: substitutionRequests.scheduleId,
        requesterId: substitutionRequests.requesterId,
        substituteId: substitutionRequests.substituteId,
        status: substitutionRequests.status,
        reason: substitutionRequests.reason,
        urgency: substitutionRequests.urgency,
        responseMessage: substitutionRequests.responseMessage,
        createdAt: substitutionRequests.createdAt,
        updatedAt: substitutionRequests.updatedAt,
        scheduleDate: schedules.date,
        scheduleTime: schedules.time,
        scheduleType: schedules.type,
        scheduleLocation: schedules.location,
      })
      .from(substitutionRequests)
      .innerJoin(schedules, eq(substitutionRequests.scheduleId, schedules.id))
      .where(and(eq(substitutionRequests.id, req.params.id), eq(substitutionRequests.communityId, activeCommunity.id)))
      .limit(1);

    if (!row) {
      throw new MobileHttpError(404, "Substituicao nao encontrada");
    }

    const isAvailable = row.status === "available" || (row.status === "pending" && !row.substituteId);
    if (!isAvailable) {
      throw new MobileHttpError(400, "Esta substituicao nao esta mais disponivel");
    }

    if (row.requesterId === user.id) {
      throw new MobileHttpError(400, "Voce nao pode aceitar sua propria substituicao");
    }

    if (isLocalScheduleDateTimePast(row.scheduleDate, row.scheduleTime)) {
      throw new MobileHttpError(400, "Nao e possivel aceitar substituicao para missa que ja passou");
    }

    const conflictingSchedule = await db
      .select({ id: schedules.id })
      .from(schedules)
      .where(
        and(
          eq(schedules.communityId, activeCommunity.id),
          eq(schedules.ministerId, user.id),
          eq(schedules.date, row.scheduleDate),
          eq(schedules.time, row.scheduleTime),
          inArray(schedules.status, ["scheduled", "published"]),
          ne(schedules.id, row.scheduleId),
        ),
      )
      .limit(1);

    if (conflictingSchedule.length > 0) {
      throw new MobileHttpError(400, "Voce ja esta escalado neste horario");
    }

    let claimed = row;

    const claimWithClient = async (tx: typeof db) => {
      const [currentRequest] = await tx
        .select()
        .from(substitutionRequests)
        .where(and(eq(substitutionRequests.id, row.id), eq(substitutionRequests.communityId, activeCommunity.id)))
        .limit(1);

      const stillAvailable = currentRequest
        && (currentRequest.status === "available" || (currentRequest.status === "pending" && !currentRequest.substituteId));

      if (!stillAvailable) {
        throw new MobileHttpError(409, "Esta substituicao ja foi aceita por outro ministro");
      }

      const [updated] = await tx
        .update(substitutionRequests)
        .set({
          status: "approved",
          substituteId: user.id,
          approvedBy: user.id,
          approvedAt: new Date(),
          responseMessage: parsed.message || null,
          updatedAt: new Date(),
        })
        .where(and(eq(substitutionRequests.id, row.id), eq(substitutionRequests.communityId, activeCommunity.id)))
        .returning();

      await tx
        .update(schedules)
        .set({
          ministerId: user.id,
          substituteId: row.requesterId,
        })
        .where(and(eq(schedules.id, row.scheduleId), eq(schedules.communityId, activeCommunity.id)));

      claimed = {
        ...row,
        substituteId: updated.substituteId,
        status: updated.status,
        responseMessage: updated.responseMessage,
        updatedAt: updated.updatedAt,
      };
    };

    if (process.env.DATABASE_URL) {
      await db.transaction(async (tx) => {
        await claimWithClient(tx as typeof db);
      });
    } else {
      await claimWithClient(db);
    }

    scheduleCache.invalidateByDate(row.scheduleDate);
    await trackSubstitutionFulfillment(user.id, row.scheduleId);

    const substituteName = formatMinisterName(user.name);
    await db.insert(notifications).values({
      ...localUuid(),
      userId: row.requesterId,
      type: "substitution",
      title: "Substituto aceitou",
      message: `${substituteName} aceitou substituir voce na missa de ${row.scheduleDate} as ${row.scheduleTime}.`,
      data: dbJson(mobileNotificationData("substitute_accepted", {
        substitutionId: row.id,
        scheduleId: row.scheduleId,
        substituteId: user.id,
        communityId: activeCommunity.id,
      })),
      read: dbBoolean(false),
      readAt: null,
      actionUrl: "/substitutions",
      priority: "high",
      expiresAt: null,
      createdAt: new Date(),
    });

    await logActivity(user.id, "approve_substitution", {
      source: "mobile-v1",
      scheduleId: row.scheduleId,
      substitutionId: row.id,
      requesterId: row.requesterId,
      communityId: activeCommunity.id,
      idempotencyKey,
    }, req);

    const usersById = await loadMobileSubstitutionUsers([{
      requesterId: row.requesterId,
      substituteId: user.id,
    }]);

    const responseBody = {
      success: true,
      substitution: toMobileSubstitution({
        ...claimed,
        scheduleDate: row.scheduleDate,
        scheduleTime: row.scheduleTime,
        scheduleType: row.scheduleType,
        scheduleLocation: row.scheduleLocation,
        requester: usersById.get(row.requesterId) ?? null,
        substitute: usersById.get(user.id) ?? null,
      }),
    };

    await completeMobileIdempotency({
      recordId: idempotencyRecordId,
      responseStatus: 200,
      responseBody,
    });
    idempotencyRecordId = null;

    res.json(responseBody);
  } catch (error) {
    await releaseMobileIdempotencyQuietly(idempotencyRecordId);
    return handleMobileError(res, error, "Erro ao aceitar substituicao");
  }
});

router.get("/admin/community/home", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    if (!isAdmin(user.role)) {
      throw new MobileHttpError(403, "Acesso restrito a coordenadores");
    }

    const activeCommunity = await resolveActiveCommunity(req);
    const monthRange = getRequestedMonth(req.query.month);

    const activeMinisterRows = await loadMobileQuestionnaireTargetMinisters({
      communityId: activeCommunity.id,
    });
    const profileSummary = summarizeDataQuality(activeMinisterRows);

    const publishedSchedules = await db
      .select({
        id: schedules.id,
        date: schedules.date,
        time: schedules.time,
        type: schedules.type,
        location: schedules.location,
        ministerId: schedules.ministerId,
        position: schedules.position,
        status: schedules.status,
      })
      .from(schedules)
      .where(
        and(
          eq(schedules.communityId, activeCommunity.id),
          eq(schedules.status, "published"),
          gte(schedules.date, monthRange.startDate),
          lte(schedules.date, monthRange.endDate),
        ),
      )
      .orderBy(asc(schedules.date), asc(schedules.time), asc(schedules.position));

    const [currentQuestionnaire] = await db
      .select({
        id: questionnaires.id,
        title: questionnaires.title,
        targetUserIds: questionnaires.targetUserIds,
      })
      .from(questionnaires)
      .where(
        and(
          eq(questionnaires.communityId, activeCommunity.id),
          eq(questionnaires.status, "published"),
          eq(questionnaires.month, monthRange.month),
          eq(questionnaires.year, monthRange.year),
        ),
      )
      .orderBy(desc(questionnaires.updatedAt))
      .limit(1);

    let responseCount = 0;
    let questionnaireTargetCount: number | null = null;
    if (currentQuestionnaire) {
      const targetUserIds = getQuestionnaireTargetUserIds(currentQuestionnaire.targetUserIds);
      const targetMinisters = await loadMobileQuestionnaireTargetMinisters({
        communityId: activeCommunity.id,
        targetUserIds,
      });
      const targetIds = targetMinisters.map((minister) => minister.id);
      const hasExplicitTarget = targetUserIds.length > 0;
      const targetFilter = targetIds.length > 0
        ? inArray(questionnaireResponses.userId, targetIds)
        : hasExplicitTarget
          ? sql`1 = 0`
          : undefined;
      questionnaireTargetCount = targetMinisters.length;

      const responseRows = await db
        .select({ userId: questionnaireResponses.userId })
        .from(questionnaireResponses)
        .where(
          and(
            eq(questionnaireResponses.questionnaireId, currentQuestionnaire.id),
            eq(questionnaireResponses.communityId, activeCommunity.id),
            eq(questionnaireResponses.isDeleted, dbBoolean(false)),
            targetFilter,
          ),
        );
      responseCount = new Set(responseRows.map((row) => row.userId)).size;
    }

    const pendingSubstitutions = await db
      .select({
        id: substitutionRequests.id,
        scheduleId: substitutionRequests.scheduleId,
        requesterId: substitutionRequests.requesterId,
        substituteId: substitutionRequests.substituteId,
        status: substitutionRequests.status,
        reason: substitutionRequests.reason,
        urgency: substitutionRequests.urgency,
        responseMessage: substitutionRequests.responseMessage,
        createdAt: substitutionRequests.createdAt,
        updatedAt: substitutionRequests.updatedAt,
        scheduleDate: schedules.date,
        scheduleTime: schedules.time,
        scheduleType: schedules.type,
        scheduleLocation: schedules.location,
      })
      .from(substitutionRequests)
      .innerJoin(schedules, eq(substitutionRequests.scheduleId, schedules.id))
      .where(
        and(
          eq(substitutionRequests.communityId, activeCommunity.id),
          inArray(substitutionRequests.status, ["available", "pending"]),
        ),
      )
      .orderBy(desc(substitutionRequests.createdAt))
      .limit(10);

    const coverageMap = new Map<string, {
      date: string;
      time: string;
      type: string;
      location: string | null;
      assigned: number;
      vacancies: number;
      scheduleIds: string[];
    }>();

    for (const schedule of publishedSchedules) {
      const key = `${schedule.date}|${schedule.time}|${schedule.type}|${schedule.location ?? ""}`;
      const current = coverageMap.get(key) ?? {
        date: schedule.date,
        time: schedule.time,
        type: schedule.type,
        location: schedule.location,
        assigned: 0,
        vacancies: 0,
        scheduleIds: [],
      };

      if (schedule.ministerId) current.assigned += 1;
      else current.vacancies += 1;
      current.scheduleIds.push(schedule.id);
      coverageMap.set(key, current);
    }

    res.json({
      success: true,
      community: activeCommunity,
      month: monthRange.isoMonth,
      metrics: {
        activeMinisters: activeMinisterRows.length,
        publishedAssignments: publishedSchedules.length,
        pendingSubstitutions: pendingSubstitutions.length,
        questionnaireResponses: responseCount,
        questionnairePending: currentQuestionnaire
          ? Math.max((questionnaireTargetCount ?? 0) - responseCount, 0)
          : null,
        questionnaireTarget: questionnaireTargetCount,
        profileReady: profileSummary.ready,
        profileNeedsAttention: profileSummary.needsAttention,
        profileBlocked: profileSummary.blocked,
      },
      questionnaire: currentQuestionnaire
        ? {
            id: currentQuestionnaire.id,
            title: currentQuestionnaire.title,
            responses: responseCount,
            pending: Math.max((questionnaireTargetCount ?? 0) - responseCount, 0),
            target: questionnaireTargetCount ?? 0,
            responseRate: questionnaireTargetCount && questionnaireTargetCount > 0
              ? Math.round((responseCount / questionnaireTargetCount) * 100)
              : 0,
            deepLink: `/admin/questionnaires/${currentQuestionnaire.id}/responses`,
          }
        : null,
      coverage: Array.from(coverageMap.values()).map((item) => ({
        ...item,
        status: item.vacancies > 0 ? "needs_attention" : "covered",
      })),
      substitutions: pendingSubstitutions.map(toMobileSubstitution),
    });
  } catch (error) {
    return handleMobileError(res, error, "Erro ao carregar painel da comunidade");
  }
});

router.get("/admin/questionnaires/:id/responses", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    if (!isAdmin(user.role)) {
      throw new MobileHttpError(403, "Acesso restrito a coordenadores");
    }

    const activeCommunity = await resolveActiveCommunity(req);
    const [questionnaire] = await db
      .select({
        id: questionnaires.id,
        title: questionnaires.title,
        month: questionnaires.month,
        year: questionnaires.year,
        status: questionnaires.status,
        deadline: questionnaires.deadline,
        questions: questionnaires.questions,
        targetUserIds: questionnaires.targetUserIds,
      })
      .from(questionnaires)
      .where(and(eq(questionnaires.id, req.params.id), eq(questionnaires.communityId, activeCommunity.id)))
      .limit(1);

    if (!questionnaire) {
      throw new MobileHttpError(404, "Questionario nao encontrado");
    }

    const targetUserIds = getQuestionnaireTargetUserIds(questionnaire.targetUserIds);
    const targetMinisters = await loadMobileQuestionnaireTargetMinisters({
      communityId: activeCommunity.id,
      targetUserIds,
    });
    const targetIds = targetMinisters.map((minister) => minister.id);
    const hasExplicitTarget = targetUserIds.length > 0;
    const targetFilter = targetIds.length > 0
      ? inArray(questionnaireResponses.userId, targetIds)
      : hasExplicitTarget
        ? sql`1 = 0`
        : undefined;

    const rows = await db
      .select({
        responseId: questionnaireResponses.id,
        userId: questionnaireResponses.userId,
        responses: questionnaireResponses.responses,
        canSubstitute: questionnaireResponses.canSubstitute,
        availableSundays: questionnaireResponses.availableSundays,
        preferredMassTimes: questionnaireResponses.preferredMassTimes,
        alternativeTimes: questionnaireResponses.alternativeTimes,
        dailyMassAvailability: questionnaireResponses.dailyMassAvailability,
        notes: questionnaireResponses.notes,
        processingWarnings: questionnaireResponses.processingWarnings,
        submittedAt: questionnaireResponses.submittedAt,
        updatedAt: questionnaireResponses.updatedAt,
        ministerName: users.name,
        ministerPhotoUrl: users.photoUrl,
      })
      .from(questionnaireResponses)
      .innerJoin(users, eq(questionnaireResponses.userId, users.id))
      .where(
        and(
          eq(questionnaireResponses.questionnaireId, questionnaire.id),
          eq(questionnaireResponses.communityId, activeCommunity.id),
          eq(questionnaireResponses.isDeleted, dbBoolean(false)),
          targetFilter,
        ),
      )
      .orderBy(asc(users.name));

    const responseByUserId = new Map(rows.map((row) => [row.userId, row]));
    const targetMinisterById = new Map(targetMinisters.map((minister) => [minister.id, minister]));
    const ministers = targetMinisters.map((minister) => {
      const response = responseByUserId.get(minister.id);

      return {
        id: minister.id,
        name: minister.name,
        email: minister.email,
        phone: minister.phone,
        whatsapp: minister.whatsapp,
        displayName: minister.displayName,
        responded: Boolean(response),
        responseId: response?.responseId ?? null,
        respondedAt: response ? toIsoDate(response.submittedAt) : null,
        availability: response ? getResponseAvailability(response.responses) : null,
        dataQuality: minister.dataQuality,
      };
    });
    const dataQualitySummary = summarizeDataQuality(targetMinisters);
    const respondedCount = new Set(rows.map((row) => row.userId)).size;
    const responseRate = targetMinisters.length > 0
      ? Math.round((respondedCount / targetMinisters.length) * 100)
      : 0;

    res.json({
      success: true,
      community: activeCommunity,
      questionnaire: {
        id: questionnaire.id,
        title: questionnaire.title,
        month: questionnaire.month,
        year: questionnaire.year,
        status: questionnaire.status,
        deadline: toIsoDate(questionnaire.deadline),
        questions: parseStoredJson(questionnaire.questions),
      },
      summary: {
        targetCount: targetMinisters.length,
        respondedCount,
        pendingCount: Math.max(targetMinisters.length - respondedCount, 0),
        responseRate,
        dataQuality: {
          ready: dataQualitySummary.ready,
          needsAttention: dataQualitySummary.needsAttention,
          blocked: dataQualitySummary.blocked,
        },
      },
      ministers,
      responses: rows.map((row) => ({
        id: row.responseId,
        userId: row.userId,
        ministerName: row.ministerName,
        ministerPhotoUrl: row.ministerPhotoUrl,
        canSubstitute: Boolean(row.canSubstitute),
        availableSundays: normalizeStoredStringArray(row.availableSundays),
        preferredMassTimes: normalizeStoredStringArray(row.preferredMassTimes),
        alternativeTimes: normalizeStoredStringArray(row.alternativeTimes),
        dailyMassAvailability: normalizeStoredStringArray(row.dailyMassAvailability),
        notes: row.notes,
        processingWarnings: parseStoredJson(row.processingWarnings) ?? [],
        responses: parseStoredJson(row.responses),
        submittedAt: toIsoDate(row.submittedAt),
        updatedAt: toIsoDate(row.updatedAt),
        dataQuality: targetMinisterById.get(row.userId)?.dataQuality ?? buildMobileProfileReadiness({}),
      })),
    });
  } catch (error) {
    return handleMobileError(res, error, "Erro ao carregar respostas do questionario");
  }
});

router.get("/admin/ministers", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    if (!isAdmin(user.role)) {
      throw new MobileHttpError(403, "Acesso restrito a coordenadores");
    }

    const activeCommunity = await resolveActiveCommunity(req);
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        phone: users.phone,
        whatsapp: users.whatsapp,
        photoUrl: users.photoUrl,
        homeCommunityId: users.homeCommunityId,
        scheduleDisplayName: users.scheduleDisplayName,
        preferredPosition: users.preferredPosition,
        preferredPositions: users.preferredPositions,
        avoidPositions: users.avoidPositions,
        preferredTimes: users.preferredTimes,
        ministryStartDate: users.ministryStartDate,
        birthDate: users.birthDate,
        address: users.address,
        city: users.city,
        maritalStatus: users.maritalStatus,
        baptismDate: users.baptismDate,
        baptismParish: users.baptismParish,
        confirmationDate: users.confirmationDate,
        confirmationParish: users.confirmationParish,
        liturgicalTraining: users.liturgicalTraining,
        formationCompleted: users.formationCompleted,
        canServeAsCouple: users.canServeAsCouple,
        spouseMinisterId: users.spouseMinisterId,
      })
      .from(users)
      .where(
        and(
          eq(users.homeCommunityId, activeCommunity.id),
          inArray(users.status, ["active", "pending"]),
          inArray(users.role, DB_MINISTER_AND_COORDINATOR_ROLES),
        ),
      )
      .orderBy(asc(users.name))
      .limit(200);

    const ministers = rows.map((minister) => ({
      id: minister.id,
      name: minister.name,
      displayName: minister.scheduleDisplayName || minister.name,
      role: minister.role,
      status: minister.status,
      phone: minister.phone,
      whatsapp: minister.whatsapp,
      photoUrl: minister.photoUrl,
      preferredPosition: minister.preferredPosition,
      preferredPositions: normalizeStoredNumberArray(minister.preferredPositions),
      avoidPositions: normalizeStoredNumberArray(minister.avoidPositions),
      preferredTimes: normalizeStoredStringArray(minister.preferredTimes),
      ministryStartDate: toDateOnly(minister.ministryStartDate),
      dataQuality: toMobileDataQuality(minister),
      deepLink: `/admin/ministers/${minister.id}`,
    }));
    const qualitySummary = summarizeDataQuality(ministers);

    res.json({
      success: true,
      community: activeCommunity,
      summary: {
        total: ministers.length,
        ready: qualitySummary.ready,
        needsAttention: qualitySummary.needsAttention,
        blocked: qualitySummary.blocked,
      },
      ministers,
    });
  } catch (error) {
    return handleMobileError(res, error, "Erro ao carregar diretorio de ministros");
  }
});

router.get("/mission/home", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    const activeCommunity = await resolveActiveCommunity(req);
    const monthRange = getRequestedMonth(req.query.month);
    const today = todayDateOnly();

    const [nextMission] = await db
      .select({
        id: schedules.id,
        communityId: schedules.communityId,
        date: schedules.date,
        time: schedules.time,
        type: schedules.type,
        location: schedules.location,
        position: schedules.position,
        status: schedules.status,
        notes: schedules.notes,
        confirmationStatus: scheduleConfirmations.status,
      })
      .from(schedules)
      .leftJoin(
        scheduleConfirmations,
        and(
          eq(scheduleConfirmations.scheduleId, schedules.id),
          eq(scheduleConfirmations.ministerId, user.id),
        ),
      )
      .where(
        and(
          eq(schedules.communityId, activeCommunity.id),
          eq(schedules.ministerId, user.id),
          eq(schedules.status, "published"),
          gte(schedules.date, today),
        ),
      )
      .orderBy(asc(schedules.date), asc(schedules.time), asc(schedules.position))
      .limit(1);

    const monthlySchedules = await db
      .select({
        id: schedules.id,
        date: schedules.date,
        time: schedules.time,
        type: schedules.type,
        location: schedules.location,
        position: schedules.position,
        status: schedules.status,
      })
      .from(schedules)
      .where(
        and(
          eq(schedules.communityId, activeCommunity.id),
          eq(schedules.ministerId, user.id),
          eq(schedules.status, "published"),
          gte(schedules.date, monthRange.startDate),
          lte(schedules.date, monthRange.endDate),
        ),
      )
      .orderBy(asc(schedules.date), asc(schedules.time), asc(schedules.position));

    const questionnaireCandidates = await db
      .select({
        id: questionnaires.id,
        title: questionnaires.title,
        description: questionnaires.description,
        month: questionnaires.month,
        year: questionnaires.year,
        deadline: questionnaires.deadline,
        updatedAt: questionnaires.updatedAt,
      })
      .from(questionnaires)
      .where(
        and(
          eq(questionnaires.communityId, activeCommunity.id),
          eq(questionnaires.status, "published"),
          eq(questionnaires.month, monthRange.month),
          eq(questionnaires.year, monthRange.year),
        ),
      )
      .orderBy(desc(questionnaires.updatedAt))
      .limit(5);

    let pendingQuestionnaire: (typeof questionnaireCandidates)[number] | null = null;
    for (const questionnaire of questionnaireCandidates) {
      const [response] = await db
        .select({ id: questionnaireResponses.id })
        .from(questionnaireResponses)
        .where(
          and(
            eq(questionnaireResponses.questionnaireId, questionnaire.id),
            eq(questionnaireResponses.userId, user.id),
            eq(questionnaireResponses.isDeleted, dbBoolean(false)),
          ),
        )
        .limit(1);

      if (!response) {
        pendingQuestionnaire = questionnaire;
        break;
      }
    }

    const [activeSubstitution] = await db
      .select({
        id: substitutionRequests.id,
        scheduleId: substitutionRequests.scheduleId,
        status: substitutionRequests.status,
        updatedAt: substitutionRequests.updatedAt,
      })
      .from(substitutionRequests)
      .where(
        and(
          eq(substitutionRequests.communityId, activeCommunity.id),
          eq(substitutionRequests.requesterId, user.id),
          inArray(substitutionRequests.status, ["available", "pending", "approved"]),
        ),
      )
      .orderBy(desc(substitutionRequests.updatedAt))
      .limit(1);

    const notices = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        priority: notifications.priority,
        read: notifications.read,
        data: notifications.data,
        actionUrl: notifications.actionUrl,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(5);

    const unreadNoticesCount = notices.filter((notice) => !notice.read).length;
    const pendingActions = buildMissionPendingActions({
      questionnaire: pendingQuestionnaire,
      substitution: activeSubstitution,
      unreadNoticesCount,
    });

    res.json({
      success: true,
      user: sanitizeMobileUser(user),
      community: activeCommunity,
      nextMission: nextMission
        ? {
            id: nextMission.id,
            date: toDateOnly(nextMission.date),
            time: nextMission.time,
            type: nextMission.type,
            location: nextMission.location,
            position: nextMission.position,
            status: nextMission.status,
            notes: nextMission.notes,
            confirmationStatus: nextMission.confirmationStatus ?? null,
            canConfirm: !nextMission.confirmationStatus || nextMission.confirmationStatus === "pending",
            canRequestSubstitution: true,
            deepLink: `/schedules/${nextMission.id}`,
          }
        : null,
      pendingActions,
      monthlySummary: {
        month: monthRange.isoMonth,
        publishedAssignments: monthlySchedules.length,
        nextScheduleId: nextMission?.id ?? null,
      },
      notices: notices.map((notice) => ({
        id: notice.id,
        type: notice.type,
        eventKey: extractMobileNotificationEventKey(notice.data),
        title: notice.title,
        message: notice.message,
        priority: notice.priority,
        read: Boolean(notice.read),
        deepLink: notice.actionUrl ?? "/notices",
        createdAt: toIsoDate(notice.createdAt),
      })),
      sync: {
        serverTime: new Date().toISOString(),
        cacheMaxAgeSeconds: 300,
      },
    });
  } catch (error) {
    return handleMobileError(res, error, "Erro ao carregar Minha Missao");
  }
});

router.get("/schedules/month", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    const activeCommunity = await resolveActiveCommunity(req);
    const monthRange = getRequestedMonth(req.query.month);

    const rows = await db
      .select({
        id: schedules.id,
        date: schedules.date,
        time: schedules.time,
        type: schedules.type,
        location: schedules.location,
        position: schedules.position,
        status: schedules.status,
        notes: schedules.notes,
      })
      .from(schedules)
      .where(
        and(
          eq(schedules.communityId, activeCommunity.id),
          eq(schedules.ministerId, user.id),
          eq(schedules.status, "published"),
          gte(schedules.date, monthRange.startDate),
          lte(schedules.date, monthRange.endDate),
        ),
      )
      .orderBy(asc(schedules.date), asc(schedules.time), asc(schedules.position));

    res.json({
      success: true,
      community: activeCommunity,
      month: monthRange.isoMonth,
      schedules: rows.map((schedule) => ({
        id: schedule.id,
        date: toDateOnly(schedule.date),
        time: schedule.time,
        type: schedule.type,
        location: schedule.location,
        position: schedule.position,
        status: schedule.status,
        notes: schedule.notes,
        deepLink: `/schedules/${schedule.id}`,
      })),
    });
  } catch (error) {
    return handleMobileError(res, error, "Erro ao carregar escalas do mes");
  }
});

router.post("/schedules/:id/confirm", authenticateToken, async (req: AuthRequest, res) => {
  let idempotencyRecordId: string | null = null;

  try {
    const user = req.user;
    if (!user) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    const parsed = confirmationSchema.parse(req.body ?? {});
    const activeCommunity = await resolveActiveCommunity(req);
    const idempotency = await startMobileMutationIdempotency({
      req,
      userId: user.id,
      communityId: activeCommunity.id,
      body: parsed,
    });

    if (idempotency.kind === "replay") {
      return res.status(idempotency.responseStatus).json(idempotency.responseBody);
    }

    idempotencyRecordId = idempotency.recordId;
    const idempotencyKey = idempotency.idempotencyKey;

    const [schedule] = await db
      .select()
      .from(schedules)
      .where(and(eq(schedules.id, req.params.id), eq(schedules.communityId, activeCommunity.id)))
      .limit(1);

    if (!schedule) {
      throw new MobileHttpError(404, "Escala nao encontrada");
    }

    if (schedule.ministerId !== user.id) {
      throw new MobileHttpError(403, "Voce nao esta escalado para esta missa");
    }

    if (schedule.status !== "published") {
      throw new MobileHttpError(400, "Esta escala ainda nao esta publicada para confirmacao");
    }

    if (isLocalScheduleDateTimePast(schedule.date, schedule.time)) {
      throw new MobileHttpError(400, "Nao e possivel confirmar missa que ja passou");
    }

    const now = new Date();
    const [confirmation] = await db
      .insert(scheduleConfirmations)
      .values({
        ...localUuid(),
        communityId: activeCommunity.id,
        scheduleId: schedule.id,
        ministerId: user.id,
        status: parsed.status,
        requestedAt: now,
        respondedAt: now,
        declineReason: parsed.status === "declined" ? parsed.declineReason ?? null : null,
        notes: parsed.notes ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [scheduleConfirmations.scheduleId, scheduleConfirmations.ministerId],
        set: {
          status: parsed.status,
          respondedAt: now,
          declineReason: parsed.status === "declined" ? parsed.declineReason ?? null : null,
          notes: parsed.notes ?? null,
          updatedAt: now,
        },
      })
      .returning();

    await logActivity(user.id, "view_schedule", {
      source: "mobile-v1",
      action: "confirm_schedule",
      scheduleId: schedule.id,
      confirmationId: confirmation.id,
      status: parsed.status,
      communityId: activeCommunity.id,
      idempotencyKey,
    }, req);

    const responseBody = {
      success: true,
      confirmation: {
        id: confirmation.id,
        scheduleId: confirmation.scheduleId,
        ministerId: confirmation.ministerId,
        status: confirmation.status,
        respondedAt: toIsoDate(confirmation.respondedAt),
        updatedAt: toIsoDate(confirmation.updatedAt),
      },
      schedule: {
        id: schedule.id,
        date: schedule.date,
        time: schedule.time,
        deepLink: `/schedules/${schedule.id}`,
      },
    };

    await completeMobileIdempotency({
      recordId: idempotencyRecordId,
      responseStatus: 200,
      responseBody,
    });
    idempotencyRecordId = null;

    res.json(responseBody);
  } catch (error) {
    await releaseMobileIdempotencyQuietly(idempotencyRecordId);
    return handleMobileError(res, error, "Erro ao confirmar presenca");
  }
});

router.get("/schedules/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      throw new MobileHttpError(401, "Usuario nao autenticado");
    }

    const activeCommunity = await resolveActiveCommunity(req);
    const [row] = await db
      .select({
        id: schedules.id,
        communityId: schedules.communityId,
        date: schedules.date,
        time: schedules.time,
        type: schedules.type,
        location: schedules.location,
        ministerId: schedules.ministerId,
        position: schedules.position,
        status: schedules.status,
        notes: schedules.notes,
        confirmationStatus: scheduleConfirmations.status,
      })
      .from(schedules)
      .leftJoin(
        scheduleConfirmations,
        and(
          eq(scheduleConfirmations.scheduleId, schedules.id),
          eq(scheduleConfirmations.ministerId, user.id),
        ),
      )
      .where(and(eq(schedules.id, req.params.id), eq(schedules.communityId, activeCommunity.id)))
      .limit(1);

    if (!row) {
      throw new MobileHttpError(404, "Escala nao encontrada");
    }

    if (row.ministerId !== user.id && !isAdmin(user.role)) {
      throw new MobileHttpError(403, "Sem permissao para ver esta escala");
    }

    const [substitution] = await db
      .select({
        id: substitutionRequests.id,
        status: substitutionRequests.status,
        substituteId: substitutionRequests.substituteId,
        updatedAt: substitutionRequests.updatedAt,
      })
      .from(substitutionRequests)
      .where(
        and(
          eq(substitutionRequests.scheduleId, row.id),
          eq(substitutionRequests.requesterId, user.id),
          inArray(substitutionRequests.status, ["available", "pending", "approved"]),
        ),
      )
      .orderBy(desc(substitutionRequests.updatedAt))
      .limit(1);

    res.json({
      success: true,
      schedule: {
        id: row.id,
        date: toDateOnly(row.date),
        time: row.time,
        type: row.type,
        location: row.location,
        position: row.position,
        status: row.status,
        notes: row.notes,
        deepLink: `/schedules/${row.id}`,
        confirmationStatus: row.confirmationStatus ?? null,
        substitution: substitution
          ? {
              id: substitution.id,
              status: substitution.status,
              substituteId: substitution.substituteId,
              updatedAt: toIsoDate(substitution.updatedAt),
            }
          : null,
        canConfirm: row.ministerId === user.id && (!row.confirmationStatus || row.confirmationStatus === "pending"),
        canRequestSubstitution: row.ministerId === user.id && !substitution,
      },
    });
  } catch (error) {
    return handleMobileError(res, error, "Erro ao carregar escala");
  }
});

export default router;
