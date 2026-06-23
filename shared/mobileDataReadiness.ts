export type MobileProfileReadinessSeverity = "critical" | "recommended" | "future";
export type MobileProfileReadinessStatus = "ready" | "needs_attention" | "blocked";

export interface MobileProfileReadinessIssue {
  field: string;
  label: string;
  severity: MobileProfileReadinessSeverity;
  message: string;
}

export interface MobileProfileReadiness {
  status: MobileProfileReadinessStatus;
  score: number;
  missing: MobileProfileReadinessIssue[];
  completedFields: string[];
}

export interface MobileProfileReadinessInput {
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
}

type ReadinessRule = {
  field: string;
  label: string;
  severity: MobileProfileReadinessSeverity;
  message: string;
  isComplete: (input: MobileProfileReadinessInput) => boolean;
};

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasBooleanFlag(value: unknown) {
  return value === true || value === 1;
}

const weightBySeverity: Record<MobileProfileReadinessSeverity, number> = {
  critical: 3,
  recommended: 2,
  future: 1,
};

const readinessRules: ReadinessRule[] = [
  {
    field: "name",
    label: "Nome completo",
    severity: "critical",
    message: "Sem nome confiavel nao conseguimos identificar a pessoa na escala.",
    isComplete: (input) => hasText(input.name),
  },
  {
    field: "email",
    label: "Email",
    severity: "critical",
    message: "O email e necessario para login, recuperacao de acesso e comunicacoes.",
    isComplete: (input) => hasText(input.email),
  },
  {
    field: "contact",
    label: "Telefone ou WhatsApp",
    severity: "critical",
    message: "A coordenacao precisa de pelo menos um contato direto.",
    isComplete: (input) => hasText(input.phone) || hasText(input.whatsapp),
  },
  {
    field: "homeCommunityId",
    label: "Comunidade",
    severity: "critical",
    message: "Sem comunidade principal o app nao consegue aplicar o escopo correto.",
    isComplete: (input) => hasText(input.homeCommunityId),
  },
  {
    field: "scheduleDisplayName",
    label: "Nome na escala",
    severity: "recommended",
    message: "Ajuda a escala a ficar legivel quando o nome completo e longo.",
    isComplete: (input) => hasText(input.scheduleDisplayName) || hasText(input.name),
  },
  {
    field: "positionPreference",
    label: "Preferencia de posicao",
    severity: "recommended",
    message: "Melhora a sugestao automatica e reduz ajustes manuais.",
    isComplete: (input) =>
      typeof input.preferredPosition === "number" || parseArray(input.preferredPositions).length > 0,
  },
  {
    field: "preferredTimes",
    label: "Horarios preferenciais",
    severity: "recommended",
    message: "Ajuda a coordenacao a respeitar preferencias recorrentes.",
    isComplete: (input) => parseArray(input.preferredTimes).length > 0,
  },
  {
    field: "ministryStartDate",
    label: "Inicio no ministerio",
    severity: "recommended",
    message: "Importante para experiencia, historico e futuras regras de formacao.",
    isComplete: (input) => Boolean(input.ministryStartDate),
  },
  {
    field: "formation",
    label: "Formacao liturgica",
    severity: "recommended",
    message: "Permite cruzar escalas com trilhas e treinamentos obrigatorios.",
    isComplete: (input) =>
      hasBooleanFlag(input.liturgicalTraining) || hasBooleanFlag(input.formationCompleted),
  },
  {
    field: "birthDate",
    label: "Data de nascimento",
    severity: "future",
    message: "Dado util para cadastro pastoral completo e politicas futuras.",
    isComplete: (input) => Boolean(input.birthDate),
  },
  {
    field: "address",
    label: "Endereco e cidade",
    severity: "future",
    message: "Dado geral do cadastro de pessoas para equalizacao com o MESC atual.",
    isComplete: (input) => hasText(input.address) && hasText(input.city),
  },
  {
    field: "maritalStatus",
    label: "Estado civil",
    severity: "future",
    message: "Ajuda a qualificar cadastro e regras familiares no futuro.",
    isComplete: (input) => hasText(input.maritalStatus),
  },
  {
    field: "sacramentalData",
    label: "Dados sacramentais",
    severity: "future",
    message: "Nao bloqueia o MVP, mas sera importante para o cadastro pastoral completo.",
    isComplete: (input) =>
      Boolean(input.baptismDate || input.confirmationDate) ||
      hasText(input.baptismParish) ||
      hasText(input.confirmationParish),
  },
  {
    field: "spouseMinisterId",
    label: "Vinculo de casal",
    severity: "recommended",
    message: "Se serve como casal, precisamos do vinculo para escalar corretamente.",
    isComplete: (input) => !hasBooleanFlag(input.canServeAsCouple) || hasText(input.spouseMinisterId),
  },
];

export function buildMobileProfileReadiness(
  input: MobileProfileReadinessInput,
): MobileProfileReadiness {
  const missing: MobileProfileReadinessIssue[] = [];
  const completedFields: string[] = [];
  let totalWeight = 0;
  let completedWeight = 0;

  for (const rule of readinessRules) {
    const weight = weightBySeverity[rule.severity];
    totalWeight += weight;

    if (rule.isComplete(input)) {
      completedFields.push(rule.field);
      completedWeight += weight;
      continue;
    }

    missing.push({
      field: rule.field,
      label: rule.label,
      severity: rule.severity,
      message: rule.message,
    });
  }

  const score = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 100;
  const hasCriticalMissing = missing.some((issue) => issue.severity === "critical");
  const hasRecommendedMissing = missing.some((issue) => issue.severity === "recommended");

  return {
    status: hasCriticalMissing ? "blocked" : hasRecommendedMissing || score < 80 ? "needs_attention" : "ready",
    score,
    missing,
    completedFields,
  };
}
