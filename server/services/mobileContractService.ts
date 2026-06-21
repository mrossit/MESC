import { isParishWide, type Role } from "@shared/roles";

export interface MobileUserSource {
  id: string;
  email: string;
  name: string;
  role: string;
  homeCommunityId: string;
  requiresPasswordChange?: boolean | null;
  photoUrl?: string | null;
  profileImageUrl?: string | null;
}

export interface MobileCommunitySummary {
  id: string;
  name: string;
  slug: string;
  colorHex: string;
  parishName: string;
  isMatriz: boolean;
}

export interface MobileMonthRange {
  year: number;
  month: number;
  isoMonth: string;
  startDate: string;
  endDate: string;
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

export type MobileCommunityScopeResolution =
  | {
      allowed: true;
      activeCommunityId: string;
      scope: "home" | "parish";
    }
  | {
      allowed: false;
      status: 400 | 403;
      message: string;
      scope: "home" | "parish";
    };

const UUID_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sanitizeMobileUser(user: MobileUserSource) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    homeCommunityId: user.homeCommunityId,
    requiresPasswordChange: Boolean(user.requiresPasswordChange),
    photoUrl: user.photoUrl ?? user.profileImageUrl ?? null,
  };
}

export function parseMobileIdempotencyKey(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return null;

  const key = raw.trim().toLowerCase();
  if (!key || !UUID_FORMAT.test(key)) return null;

  return key;
}

export function resolveMobileCommunityScope(
  user: Pick<MobileUserSource, "role" | "homeCommunityId">,
  requestedCommunityId?: string | null,
): MobileCommunityScopeResolution {
  const requested = requestedCommunityId?.trim() || null;
  const homeCommunityId = user.homeCommunityId?.trim() || null;
  const scope = isParishWide(user.role) ? "parish" : "home";

  if (scope === "parish") {
    const activeCommunityId = requested ?? homeCommunityId;

    if (!activeCommunityId) {
      return {
        allowed: false,
        status: 400,
        message: "Informe X-Community-Id para selecionar a comunidade ativa",
        scope,
      };
    }

    return {
      allowed: true,
      activeCommunityId,
      scope,
    };
  }

  if (!homeCommunityId) {
    return {
      allowed: false,
      status: 403,
      message: "Usuario sem comunidade principal configurada",
      scope,
    };
  }

  if (requested && requested !== homeCommunityId) {
    return {
      allowed: false,
      status: 403,
      message: "Comunidade fora do escopo do usuario",
      scope,
    };
  }

  return {
    allowed: true,
    activeCommunityId: homeCommunityId,
    scope,
  };
}

export function toIsoDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return value;
}

export function toDateOnly(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  return value.includes("T") ? value.slice(0, 10) : value;
}

export function parseJwtExpirySeconds(expiresIn: string | undefined): number | null {
  if (!expiresIn) return null;

  const match = expiresIn.trim().match(/^(\d+)([smhd])?$/i);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = (match[2] ?? "s").toLowerCase();

  switch (unit) {
    case "s":
      return amount;
    case "m":
      return amount * 60;
    case "h":
      return amount * 60 * 60;
    case "d":
      return amount * 24 * 60 * 60;
    default:
      return null;
  }
}

export function parseMobileMonth(value: unknown, now = new Date()): MobileMonthRange {
  const fallbackYear = now.getUTCFullYear();
  const fallbackMonth = now.getUTCMonth() + 1;
  const raw = typeof value === "string" ? value : undefined;
  const parsed = raw?.match(/^(\d{4})-(\d{2})$/);

  const year = parsed ? Number(parsed[1]) : fallbackYear;
  const month = parsed ? Number(parsed[2]) : fallbackMonth;

  if (month < 1 || month > 12) {
    throw new Error("Mes invalido. Use o formato YYYY-MM.");
  }

  const isoMonth = `${year}-${String(month).padStart(2, "0")}`;
  const startDate = `${isoMonth}-01`;
  const endDate = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

  return {
    year,
    month,
    isoMonth,
    startDate,
    endDate,
  };
}

export function isLocalScheduleDateTimePast(date: string, time: string, now = new Date()): boolean {
  const dateParts = date.split("-").map(Number);
  const timeParts = time.split(":").map(Number);
  const year = dateParts[0] || 0;
  const month = dateParts[1] || 1;
  const day = dateParts[2] || 1;
  const hours = timeParts[0] || 0;
  const minutes = timeParts[1] || 0;

  return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime() < now.getTime();
}

export function calculateScheduleUrgency(
  date: string,
  time: string,
  now = new Date(),
): "low" | "medium" | "high" | "critical" {
  const dateParts = date.split("-").map(Number);
  const timeParts = time.split(":").map(Number);
  const massDateTime = new Date(
    dateParts[0] || 0,
    (dateParts[1] || 1) - 1,
    dateParts[2] || 1,
    timeParts[0] || 0,
    timeParts[1] || 0,
    0,
    0,
  );
  const hoursUntilMass = (massDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilMass < 12) return "critical";
  if (hoursUntilMass < 24) return "high";
  if (hoursUntilMass < 72) return "medium";
  return "low";
}

export function buildMissionPendingActions(input: {
  questionnaire?: {
    id: string;
    title: string;
    deadline?: string | Date | null;
  } | null;
  substitution?: {
    id: string;
    status: string;
    scheduleId: string;
  } | null;
  unreadNoticesCount?: number;
}): MobilePendingAction[] {
  const actions: MobilePendingAction[] = [];

  if (input.questionnaire) {
    actions.push({
      id: input.questionnaire.id,
      type: "questionnaire",
      title: "Responder questionario",
      subtitle: input.questionnaire.title,
      priority: "high",
      deepLink: `/questionnaires/${input.questionnaire.id}`,
      dueAt: toIsoDate(input.questionnaire.deadline),
    });
  }

  if (input.substitution) {
    actions.push({
      id: input.substitution.id,
      type: "substitution",
      title: "Acompanhar substituicao",
      subtitle: `Status: ${input.substitution.status}`,
      priority: input.substitution.status === "pending" ? "high" : "normal",
      deepLink: `/substitutions/${input.substitution.id}`,
    });
  }

  if ((input.unreadNoticesCount ?? 0) > 0) {
    actions.push({
      id: "notices-unread",
      type: "notice",
      title: "Avisos nao lidos",
      subtitle: `${input.unreadNoticesCount} aviso(s) aguardando leitura`,
      priority: "normal",
      deepLink: "/notices",
    });
  }

  return actions;
}
