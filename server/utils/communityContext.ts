/**
 * Helpers de contexto de comunidade para os caminhos de ESCRITA (Fase 2).
 *
 * As colunas community_id têm DEFAULT no banco (comunidade matriz), então escritas
 * que omitem a coluna não quebram. Estes helpers permitem que o código sete a
 * comunidade CORRETA explicitamente (a do coordenador que está agindo), em vez de
 * sempre cair no default — base para o read-scoping da Fase 3.
 */
import { db } from '../db';
import { communities, schedules, questionnaires } from '@shared/schema';
import { eq } from 'drizzle-orm';

let matrizIdCache: string | null = null;

/** Id da comunidade matriz (São Judas). Cacheado — muda raríssimo. */
export async function getMatrizCommunityId(): Promise<string> {
  if (matrizIdCache) return matrizIdCache;
  const [matriz] = await db
    .select({ id: communities.id })
    .from(communities)
    .where(eq(communities.isMatriz, true))
    .limit(1);
  if (!matriz) {
    throw new Error('Comunidade matriz não encontrada (rode a migração 0005).');
  }
  matrizIdCache = matriz.id;
  return matriz.id;
}

/**
 * Resolve a comunidade para uma escrita a partir do usuário que age.
 * Usa o homeCommunityId do ator; cai na matriz se ausente (defensivo).
 */
export async function resolveWriteCommunityId(
  user?: { homeCommunityId?: string | null } | null,
): Promise<string> {
  if (user?.homeCommunityId) return user.homeCommunityId;
  return getMatrizCommunityId();
}

/** community_id herdado do schedule pai (para substitution_requests). */
export async function communityIdFromSchedule(scheduleId: string): Promise<string> {
  const [row] = await db
    .select({ communityId: schedules.communityId })
    .from(schedules)
    .where(eq(schedules.id, scheduleId))
    .limit(1);
  if (row?.communityId) return row.communityId;
  return getMatrizCommunityId();
}

/** community_id herdado do questionnaire pai (para questionnaire_responses). */
export async function communityIdFromQuestionnaire(questionnaireId: string): Promise<string> {
  const [row] = await db
    .select({ communityId: questionnaires.communityId })
    .from(questionnaires)
    .where(eq(questionnaires.id, questionnaireId))
    .limit(1);
  if (row?.communityId) return row.communityId;
  return getMatrizCommunityId();
}
