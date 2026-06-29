export const MOBILE_NOTIFICATION_EVENT_KEYS = [
  "questionnaire_published",
  "coordinator_announcement",
  "questionnaire_closed",
  "schedule_published",
  "substitution_requested",
  "sanctuary_event_published",
  "substitute_accepted",
  "formation_available",
  "schedule_reminder",
] as const;

export type MobileNotificationEventKey = typeof MOBILE_NOTIFICATION_EVENT_KEYS[number];

export type MobileNotificationType =
  | "schedule"
  | "substitution"
  | "formation"
  | "announcement"
  | "reminder";

export interface MobileNotificationEventDefinition {
  eventKey: MobileNotificationEventKey;
  type: MobileNotificationType;
  title: string;
  defaultPriority: "normal" | "medium" | "high";
  defaultDeepLink: string;
  description: string;
}

export const MOBILE_NOTIFICATION_EVENT_DEFINITIONS: Record<
  MobileNotificationEventKey,
  MobileNotificationEventDefinition
> = {
  questionnaire_published: {
    eventKey: "questionnaire_published",
    type: "reminder",
    title: "Novo Questionário Disponível",
    defaultPriority: "medium",
    defaultDeepLink: "/questionnaires",
    description: "A new availability questionnaire was published.",
  },
  coordinator_announcement: {
    eventKey: "coordinator_announcement",
    type: "announcement",
    title: "Comunicado da Coordenação",
    defaultPriority: "normal",
    defaultDeepLink: "/communication",
    description: "A coordinator sent an announcement.",
  },
  questionnaire_closed: {
    eventKey: "questionnaire_closed",
    type: "announcement",
    title: "Questionário Encerrado",
    defaultPriority: "normal",
    defaultDeepLink: "/questionnaires",
    description: "An availability questionnaire was closed.",
  },
  schedule_published: {
    eventKey: "schedule_published",
    type: "schedule",
    title: "Nova Escala Publicada",
    defaultPriority: "medium",
    defaultDeepLink: "/schedules",
    description: "A schedule was published.",
  },
  substitution_requested: {
    eventKey: "substitution_requested",
    type: "substitution",
    title: "Pedido de Substituição",
    defaultPriority: "high",
    defaultDeepLink: "/substitutions",
    description: "A substitution request was created or assigned.",
  },
  sanctuary_event_published: {
    eventKey: "sanctuary_event_published",
    type: "announcement",
    title: "Evento do Santuário Publicado",
    defaultPriority: "medium",
    defaultDeepLink: "/schedules",
    description: "A sanctuary calendar event was published for ministers.",
  },
  substitute_accepted: {
    eventKey: "substitute_accepted",
    type: "substitution",
    title: "Substituto Confirmado",
    defaultPriority: "high",
    defaultDeepLink: "/substitutions",
    description: "A substitute accepted or claimed a request.",
  },
  formation_available: {
    eventKey: "formation_available",
    type: "formation",
    title: "Formação Disponível",
    defaultPriority: "normal",
    defaultDeepLink: "/formation",
    description: "A new formation lesson or track became available.",
  },
  schedule_reminder: {
    eventKey: "schedule_reminder",
    type: "reminder",
    title: "Lembrete de Escala",
    defaultPriority: "high",
    defaultDeepLink: "/confirmations",
    description: "A minister received a schedule or confirmation reminder.",
  },
};

export function isMobileNotificationEventKey(value: unknown): value is MobileNotificationEventKey {
  return typeof value === "string"
    && MOBILE_NOTIFICATION_EVENT_KEYS.includes(value as MobileNotificationEventKey);
}

export function mobileNotificationData(
  eventKey: MobileNotificationEventKey,
  data: Record<string, unknown> = {},
) {
  return {
    ...data,
    eventKey,
  };
}

export function extractMobileNotificationEventKey(data: unknown): MobileNotificationEventKey | null {
  const parsed = typeof data === "string" ? safeJsonParse(data) : data;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const eventKey = (parsed as { eventKey?: unknown }).eventKey;
  return isMobileNotificationEventKey(eventKey) ? eventKey : null;
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
