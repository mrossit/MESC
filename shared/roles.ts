/**
 * Fonte ÚNICA de verdade para roles e escopo de comunidade (MESC).
 *
 * Antes da multi-comunidade, papéis eram strings inline ('coordenador', 'gestor', ...)
 * espalhadas por ~50 arquivos. A Fase 2 introduz o vocabulário novo:
 *   - coordenador_paroquial  → escopo da paróquia inteira (vê/edita todas as comunidades)
 *   - coordenador_comunidade → escopo de 1 comunidade (edita a sua; outras read-only na Fase 3)
 *
 * 'coordenador' é mantido como ALIAS LEGADO aceito em todos os grupos, para que dados
 * antigos e novos coexistam durante a transição sem reescrever 200+ literais.
 *
 * Sem dependências externas — importável por server e client via "@shared/roles".
 */

export const ROLES = {
  GESTOR: 'gestor',
  REITOR: 'reitor',
  MINISTRO: 'ministro',
  COORDENADOR_PAROQUIAL: 'coordenador_paroquial',
  COORDENADOR_COMUNIDADE: 'coordenador_comunidade',
  /** @deprecated vocabulário pré-multi-comunidade; aceito por compatibilidade. */
  COORDENADOR_LEGACY: 'coordenador',
} as const;

export type Role =
  | 'gestor'
  | 'reitor'
  | 'ministro'
  | 'coordenador_paroquial'
  | 'coordenador_comunidade'
  | 'coordenador';

export type DbRole = Exclude<Role, 'coordenador'>;

// --- Grupos de papéis (usados nas checagens de permissão) ---------------------

/** Qualquer variante de coordenador (inclui o legado). */
export const COORDINATOR_ROLES: readonly string[] = [
  ROLES.COORDENADOR_LEGACY,
  ROLES.COORDENADOR_COMUNIDADE,
  ROLES.COORDENADOR_PAROQUIAL,
];

/** Papéis com alcance da paróquia inteira (veem/editam todas as comunidades). */
export const PARISH_WIDE_ROLES: readonly string[] = [
  ROLES.GESTOR,
  ROLES.REITOR,
  ROLES.COORDENADOR_PAROQUIAL,
];

/**
 * Equivalente ao "coordenador OU gestor" de hoje — usado na maioria das rotas
 * administrativas. Inclui coordenadores (qualquer variante) + gestor + reitor.
 */
export const ADMIN_ROLES: readonly string[] = [
  ...COORDINATOR_ROLES,
  ROLES.GESTOR,
  ROLES.REITOR,
];

/** Papéis restritos à gestão global da paróquia (sem coordenador de comunidade). */
export const MANAGER_ROLES: readonly string[] = [ROLES.GESTOR, ROLES.REITOR];

/** Variantes de coordenador que existem no enum do banco. */
export const DB_COORDINATOR_ROLES = [
  ROLES.COORDENADOR_COMUNIDADE,
  ROLES.COORDENADOR_PAROQUIAL,
] as const satisfies readonly DbRole[];

/** Papéis administrativos válidos para filtros Drizzle sobre users.role. */
export const DB_ADMIN_ROLES = [
  ...DB_COORDINATOR_ROLES,
  ROLES.GESTOR,
  ROLES.REITOR,
] as const satisfies readonly DbRole[];

/** Usuários que podem responder questionários/entrar em escalas, sem alias legado. */
export const DB_MINISTER_AND_COORDINATOR_ROLES = [
  ROLES.MINISTRO,
  ...DB_COORDINATOR_ROLES,
] as const satisfies readonly DbRole[];

const DB_ROLE_SET = new Set<string>([
  ROLES.GESTOR,
  ROLES.REITOR,
  ROLES.MINISTRO,
  ROLES.COORDENADOR_PAROQUIAL,
  ROLES.COORDENADOR_COMUNIDADE,
]);

// --- Predicados ---------------------------------------------------------------

const norm = (role: string | null | undefined): string => (role ?? '').trim();

/** É algum tipo de coordenador (paroquial, comunidade ou legado)? */
export function isCoordinator(role: string | null | undefined): boolean {
  return COORDINATOR_ROLES.includes(norm(role));
}

/** É gestor/reitor (gestão global)? */
export function isManager(role: string | null | undefined): boolean {
  return MANAGER_ROLES.includes(norm(role));
}

/** Tem alcance da paróquia inteira (paroquial/gestor/reitor)? */
export function isParishWide(role: string | null | undefined): boolean {
  return PARISH_WIDE_ROLES.includes(norm(role));
}

/** Está limitado a uma única comunidade (comunidade/legado/ministro)? */
export function isCommunityScoped(role: string | null | undefined): boolean {
  return !isParishWide(role);
}

/** Tem permissões administrativas (coordenador OU gestor) — equivalente ao gate de hoje. */
export function isAdmin(role: string | null | undefined): boolean {
  return ADMIN_ROLES.includes(norm(role));
}

export function isDbRole(role: string | null | undefined): role is DbRole {
  return DB_ROLE_SET.has(norm(role));
}

export function normalizeRoleForPersistence(
  role: string | null | undefined,
  fallback: DbRole = ROLES.MINISTRO,
): DbRole {
  const value = norm(role);
  if (value === ROLES.COORDENADOR_LEGACY) return ROLES.COORDENADOR_COMUNIDADE;
  if (isDbRole(value)) return value;
  return fallback;
}

/**
 * Expande uma lista de papéis permitidos para reconhecer o vocabulário novo:
 * se a lista cita 'coordenador' (legado), passa a aceitar TODAS as variantes de
 * coordenador (comunidade/paroquial). Mantém os demais papéis intactos.
 *
 * Permite que ~95 chamadas existentes de requireRole(['coordenador', ...]) aceitem
 * coordenadores promovidos sem reescrever cada call site. (Fase 2: sem read-scoping,
 * todas as variantes têm o mesmo alcance; a distinção real entra na Fase 3.)
 */
export function expandRoles(roles: string[]): string[] {
  const set = new Set<string>(roles.map(norm));
  if (roles.some((r) => COORDINATOR_ROLES.includes(norm(r)))) {
    for (const r of COORDINATOR_ROLES) set.add(r);
  }
  return [...set];
}

export function expandRolesForDb(roles: string[]): DbRole[] {
  const set = new Set<DbRole>();
  for (const role of expandRoles(roles)) {
    const value = norm(role);
    if (value === ROLES.COORDENADOR_LEGACY) {
      for (const coordinatorRole of DB_COORDINATOR_ROLES) set.add(coordinatorRole);
      continue;
    }
    if (isDbRole(value)) set.add(value);
  }
  return [...set];
}

// --- Escopo de comunidade -----------------------------------------------------
// Reaproveitado já nas ESCRITAS (Fase 2) e no read-scoping (Fase 3).

export interface CommunityScopedUser {
  role: string;
  homeCommunityId?: string | null;
}

export type CommunityScope = { all: true } | { all: false; communityId: string };

/**
 * Escopo de dados do usuário:
 *  - paroquial/gestor/reitor → { all: true } (todas as comunidades)
 *  - demais                  → { all: false, communityId: home }
 */
export function getUserScope(user: CommunityScopedUser): CommunityScope {
  if (isParishWide(user.role)) return { all: true };
  return { all: false, communityId: user.homeCommunityId ?? '' };
}

/** Pode editar dados da comunidade alvo? (paroquial: qualquer; comunidade: só a sua) */
export function canEditCommunity(
  user: CommunityScopedUser,
  communityId: string | null | undefined,
): boolean {
  if (isParishWide(user.role)) return true;
  if (!communityId) return false;
  return user.homeCommunityId === communityId;
}
