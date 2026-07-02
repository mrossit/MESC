import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { db } from '../../server/db';
import { generateAutomaticSchedule, type GeneratedSchedule } from '../../server/utils/scheduleGenerator';
import {
  communities,
  massTimesConfig,
  questionnaireResponses,
  questionnaires,
  schedules,
  users,
} from '../../shared/schema';

type MinisterSeed = {
  id: string;
  name: string;
  communityId: string;
  status?: 'active' | 'inactive' | 'pending' | 'deleted';
  reliabilityScore?: number;
  totalServices?: number;
  preferredPositions?: number[];
  avoidPositions?: number[];
};

type FixtureIds = {
  communityIds: string[];
  userIds: string[];
  questionnaireIds: string[];
  responseIds: string[];
  massConfigIds: string[];
};

const YEAR = 2026;
const MONTH = 3;
const ids: FixtureIds = {
  communityIds: [],
  userIds: [],
  questionnaireIds: [],
  responseIds: [],
  massConfigIds: [],
};

const originalEnv = process.env.USE_DATABASE_MASS_CONFIG;
const FIXTURE_TS = '2026-01-15T12:00:00.000Z';
const sqlite = new Database('local.db');

function makeId(label: string): string {
  return `char-${label}-${uuidv4()}`;
}

function v2Response(
  masses: Record<string, Record<string, boolean>>,
  options: {
    weekdays?: unknown;
    specialEvents?: Record<string, unknown>;
    alternativeTimes?: string[];
    canSubstitute?: boolean;
  } = {},
) {
  return {
    format_version: '2.0',
    masses,
    weekdays: options.weekdays ?? [],
    special_events: options.specialEvents ?? {},
    alternative_times: options.alternativeTimes ?? [],
    can_substitute: options.canSubstitute ?? false,
  };
}

async function cleanupFixtures() {
  if (ids.responseIds.length > 0) {
    await db.delete(questionnaireResponses).where(inArray(questionnaireResponses.id, ids.responseIds));
  }
  if (ids.questionnaireIds.length > 0) {
    await db.delete(questionnaires).where(inArray(questionnaires.id, ids.questionnaireIds));
  }
  if (ids.massConfigIds.length > 0) {
    await db.delete(massTimesConfig).where(inArray(massTimesConfig.id, ids.massConfigIds));
  }
  if (ids.userIds.length > 0) {
    await db.delete(schedules).where(inArray(schedules.ministerId, ids.userIds));
    await db.delete(users).where(inArray(users.id, ids.userIds));
  }
  if (ids.communityIds.length > 0) {
    await db.delete(communities).where(inArray(communities.id, ids.communityIds));
  }

  ids.communityIds = [];
  ids.userIds = [];
  ids.questionnaireIds = [];
  ids.responseIds = [];
  ids.massConfigIds = [];
}

async function createCommunity(label: string) {
  const id = uuidv4();
  ids.communityIds.push(id);
  const configId = uuidv4();
  sqlite.prepare(`
    insert into communities (
      id, parish_name, name, slug, color_hex, is_matriz, active, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    'Santuário São Judas Tadeu de Sorocaba',
    `Caracterizacao ${label}`,
    `char-${label}-${uuidv4()}`,
    '#335577',
    0,
    1,
    FIXTURE_TS,
    FIXTURE_TS,
  );
  sqlite.prepare(`
    insert into mass_times_config (
      id, community_id, day_of_week, time, min_ministers, max_ministers,
      is_active, special_event, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(configId, id, 0, '08:00', 3, 6, 1, 0, FIXTURE_TS, FIXTURE_TS);
  ids.massConfigIds.push(configId);
  return id;
}

async function createMinister(seed: MinisterSeed) {
  ids.userIds.push(seed.id);
  sqlite.prepare(`
    insert into users (
      id, email, first_name, last_name, password_hash, name, role, status,
      home_community_id, preferred_positions, avoid_positions, preferred_times,
      available_for_special_events, can_serve_as_couple, extra_activities,
      liturgical_training, total_services, formation_completed, reliability_score,
      substitution_request_count, substitution_fulfilled_count, manual_removal_count,
      no_show_count, requires_password_change, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    seed.id,
    `${seed.id}@example.test`,
    seed.name.split(' ')[0],
    seed.name.split(' ').slice(1).join(' ') || 'Teste',
    'test-hash',
    seed.name,
    'ministro',
    seed.status ?? 'active',
    seed.communityId,
    JSON.stringify(seed.preferredPositions ?? []),
    JSON.stringify(seed.avoidPositions ?? []),
    JSON.stringify([]),
    1,
    0,
    JSON.stringify({
      sickCommunion: false,
      mondayAdoration: false,
      helpOtherPastorals: false,
      festiveEvents: false,
    }),
    0,
    seed.totalServices ?? 0,
    0,
    seed.reliabilityScore ?? 80,
    0,
    0,
    0,
    0,
    0,
    FIXTURE_TS,
    FIXTURE_TS,
  );
}

async function createQuestionnaire(communityId: string, status: string, questions: unknown[] = []) {
  const id = uuidv4();
  ids.questionnaireIds.push(id);
  sqlite.prepare(`
    insert into questionnaires (
      id, community_id, title, month, year, status, questions, deadline,
      version, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    communityId,
    `Questionario caracterizacao ${communityId}`,
    MONTH,
    YEAR,
    status,
    JSON.stringify(questions),
    '2026-02-20T12:00:00.000Z',
    1,
    FIXTURE_TS,
    FIXTURE_TS,
  );
  return id;
}

async function createResponse(communityId: string, questionnaireId: string, userId: string, responses: unknown) {
  const id = uuidv4();
  ids.responseIds.push(id);
  sqlite.prepare(`
    insert into questionnaire_responses (
      id, community_id, questionnaire_id, user_id, responses, available_sundays,
      preferred_mass_times, alternative_times, daily_mass_availability,
      can_substitute, unmapped_responses, processing_warnings, is_shared_response,
      submitted_at, updated_at, is_deleted
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    communityId,
    questionnaireId,
    userId,
    JSON.stringify(responses),
    JSON.stringify([]),
    JSON.stringify([]),
    JSON.stringify([]),
    JSON.stringify([]),
    0,
    JSON.stringify([]),
    JSON.stringify([]),
    0,
    FIXTURE_TS,
    FIXTURE_TS,
    0,
  );
}

function findMass(result: GeneratedSchedule[], date: string, time: string, type: string) {
  const mass = result.find((schedule) =>
    schedule.massTime.date === date &&
    schedule.massTime.time === time &&
    schedule.massTime.type === type
  );
  expect(mass).toBeDefined();
  return mass!;
}

function digest(result: GeneratedSchedule[]) {
  return result.map((schedule) => ({
    date: schedule.massTime.date,
    time: schedule.massTime.time,
    type: schedule.massTime.type,
    ministers: schedule.ministers.map((minister) => minister.id),
    backups: schedule.backupMinisters.map((minister) => minister.id),
    confidence: Number(schedule.confidence.toFixed(4)),
  }));
}

beforeAll(() => {
  process.env.USE_DATABASE_MASS_CONFIG = 'false';
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'time').mockImplementation(() => undefined);
  vi.spyOn(console, 'timeEnd').mockImplementation(() => undefined);
});

beforeEach(async () => {
  await cleanupFixtures();
});

afterAll(async () => {
  await cleanupFixtures();
  if (originalEnv === undefined) {
    delete process.env.USE_DATABASE_MASS_CONFIG;
  } else {
    process.env.USE_DATABASE_MASS_CONFIG = originalEnv;
  }
  vi.restoreAllMocks();
  sqlite.close();
});

describe('scheduleGenerator real characterization', () => {
  it('pins basic generation from v2 questionnaire responses and availability invariants', async () => {
    const communityId = await createCommunity('basic');
    const questionnaireId = await createQuestionnaire(communityId, 'closed');
    const ministers = [
      { id: makeId('ana'), name: 'Ana Caracterizacao', masses: { '2026-03-01': { '08:00': true } } },
      { id: makeId('bruno'), name: 'Bruno Caracterizacao', masses: { '2026-03-01': { '08:00': true } } },
      { id: makeId('carla'), name: 'Carla Caracterizacao', masses: { '2026-03-01': { '08:00': true } } },
      { id: makeId('daniel'), name: 'Daniel Caracterizacao', masses: { '2026-03-01': { '10:00': true } } },
      { id: makeId('elisa'), name: 'Elisa Caracterizacao', masses: { '2026-03-01': { '10:00': true } } },
    ];

    for (const [index, minister] of ministers.entries()) {
      await createMinister({
        id: minister.id,
        name: minister.name,
        communityId,
        reliabilityScore: 80 - index,
        totalServices: index,
      });
      await createResponse(
        communityId,
        questionnaireId,
        minister.id,
        v2Response(minister.masses, { weekdays: ['monday'] }),
      );
    }

    const result = await generateAutomaticSchedule(YEAR, MONTH, false, { communityId });
    const sunday8 = findMass(result, '2026-03-01', '08:00', 'missa_dominical');
    const sunday10 = findMass(result, '2026-03-01', '10:00', 'missa_dominical');
    const mondayDaily = findMass(result, '2026-03-02', '06:30', 'missa_diaria');

    expect(result).toHaveLength(42);
    expect(sunday8.massTime.minMinisters).toBe(15);
    expect(sunday8.ministers.map((minister) => minister.id).sort()).toEqual(
      ministers.slice(0, 3).map((minister) => minister.id).sort(),
    );
    expect(sunday8.backupMinisters).toHaveLength(0);
    expect(sunday8.ministers).toHaveLength(3);
    expect(sunday8.confidence).toBeLessThanOrEqual(0.5);

    expect(sunday10.ministers.map((minister) => minister.id).sort()).toEqual(
      ministers.slice(3, 5).map((minister) => minister.id).sort(),
    );
    expect(mondayDaily.ministers).toHaveLength(5);
    expect(mondayDaily.ministers.map((minister) => minister.id).sort()).toEqual(
      ministers.map((minister) => minister.id).sort(),
    );

    for (const schedule of result) {
      expect(schedule.ministers.length).toBeLessThanOrEqual(schedule.massTime.maxMinisters);
      expect(new Set(schedule.ministers.map((minister) => minister.id)).size)
        .toBe(schedule.ministers.length);
    }
  });

  it('keeps generation scoped to the requested community', async () => {
    const communityA = await createCommunity('scope-a');
    const communityB = await createCommunity('scope-b');
    const questionnaireA = await createQuestionnaire(communityA, 'closed');
    const questionnaireB = await createQuestionnaire(communityB, 'closed');
    const ministerA = makeId('scope-a-minister');
    const ministerB = makeId('scope-b-minister');

    await createMinister({ id: ministerA, name: 'Ministro Comunidade A', communityId: communityA });
    await createMinister({ id: ministerB, name: 'Ministro Comunidade B', communityId: communityB });
    await createResponse(communityA, questionnaireA, ministerA, v2Response({ '2026-03-01': { '08:00': true } }));
    await createResponse(communityB, questionnaireB, ministerB, v2Response({ '2026-03-01': { '08:00': true } }));

    const result = await generateAutomaticSchedule(YEAR, MONTH, false, { communityId: communityA });
    const sunday8 = findMass(result, '2026-03-01', '08:00', 'missa_dominical');

    expect(sunday8.ministers.map((minister) => minister.id)).toEqual([ministerA]);
    expect(sunday8.backupMinisters.map((minister) => minister.id)).not.toContain(ministerB);
  });

  it('pins edge cases: inactive ministers are ignored and preview with no responses includes active ministers by default', async () => {
    const communityId = await createCommunity('edge');
    const questionnaireId = await createQuestionnaire(communityId, 'closed');
    const activeMinister = makeId('active');
    const inactiveMinister = makeId('inactive');

    await createMinister({ id: activeMinister, name: 'Ativo Caracterizacao', communityId });
    await createMinister({ id: inactiveMinister, name: 'Inativo Caracterizacao', communityId, status: 'inactive' });
    await createResponse(communityId, questionnaireId, activeMinister, v2Response({ '2026-03-01': { '08:00': true } }));
    await createResponse(communityId, questionnaireId, inactiveMinister, v2Response({ '2026-03-01': { '08:00': true } }));

    const result = await generateAutomaticSchedule(YEAR, MONTH, false, { communityId });
    const sunday8 = findMass(result, '2026-03-01', '08:00', 'missa_dominical');

    expect(sunday8.ministers.map((minister) => minister.id)).toEqual([activeMinister]);
    expect(sunday8.ministers.map((minister) => minister.id)).not.toContain(inactiveMinister);

    const previewCommunity = await createCommunity('no-response-preview');
    await createQuestionnaire(previewCommunity, 'open');
    const previewMinisters = [makeId('preview-1'), makeId('preview-2'), makeId('preview-3')];
    for (const ministerId of previewMinisters) {
      await createMinister({ id: ministerId, name: `Preview ${ministerId}`, communityId: previewCommunity });
    }

    const preview = await generateAutomaticSchedule(YEAR, MONTH, true, { communityId: previewCommunity });
    const previewSunday8 = findMass(preview, '2026-03-01', '08:00', 'missa_dominical');

    // CARACTERIZAÇÃO: comportamento atual, possivelmente indesejado.
    // Em preview sem nenhuma resposta, o gerador trata todos os ministros ativos como disponíveis.
    expect(previewSunday8.ministers.map((minister) => minister.id).sort()).toEqual(previewMinisters.sort());
  });

  it('characterizes custom special mass questions and deterministic output', async () => {
    const communityId = await createCommunity('special');
    const specialQuestionId = 'custom_retiro_quaresmal';
    const questionnaireId = await createQuestionnaire(communityId, 'closed', [
      {
        id: specialQuestionId,
        category: 'custom',
        question: 'Voce pode servir no Retiro Quaresmal dia 14/03/2026 as 09h30?',
        metadata: {
          eventDate: '2026-03-14',
          eventTime: '09:30',
          eventName: 'Retiro Quaresmal',
        },
      },
    ]);
    const available = [makeId('special-1'), makeId('special-2'), makeId('special-3')];
    const unavailable = makeId('special-no');

    for (const ministerId of [...available, unavailable]) {
      await createMinister({ id: ministerId, name: `Especial ${ministerId}`, communityId });
      await createResponse(
        communityId,
        questionnaireId,
        ministerId,
        v2Response({}, { specialEvents: { [specialQuestionId]: available.includes(ministerId) } }),
      );
    }

    const first = await generateAutomaticSchedule(YEAR, MONTH, false, { communityId });
    const second = await generateAutomaticSchedule(YEAR, MONTH, false, { communityId });
    const specialMass = findMass(first, '2026-03-14', '09:30', specialQuestionId);

    expect(specialMass.massTime.minMinisters).toBe(7);
    expect(specialMass.ministers.map((minister) => minister.id).sort()).toEqual(available.sort());
    expect(specialMass.ministers.map((minister) => minister.id)).not.toContain(unavailable);
    expect(digest(second)).toEqual(digest(first));
  });

  it('throws for final generation when a closed questionnaire has no responses', async () => {
    const communityId = await createCommunity('no-final-responses');
    await createQuestionnaire(communityId, 'closed');
    await createMinister({ id: makeId('no-final-response'), name: 'Sem Resposta', communityId });

    await expect(generateAutomaticSchedule(YEAR, MONTH, false, { communityId }))
      .rejects
      .toThrow('No questionnaire responses');
  });
});
