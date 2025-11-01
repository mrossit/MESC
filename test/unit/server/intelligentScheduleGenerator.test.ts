import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IntelligentScheduleGenerator } from '../../../server/services/scheduleGenerator';

describe('IntelligentScheduleGenerator - generative learning', () => {
  const baseWeekdays = {
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false
  };

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prioritizes ministers that historically occupied a position when preferences are tied', () => {
    const ministers = [
      { id: 'minister-a', name: 'Alice', status: 'active', preferredPositions: [], avoidPositions: [] },
      { id: 'minister-b', name: 'Bruno', status: 'active', preferredPositions: [], avoidPositions: [] }
    ];

    const responses = [
      {
        userId: 'minister-a',
        responses: {
          format_version: '2.0',
          masses: {
            '2025-10-05': { '08:00': true }
          },
          weekdays: { ...baseWeekdays },
          special_events: {},
          can_substitute: false
        }
      },
      {
        userId: 'minister-b',
        responses: {
          format_version: '2.0',
          masses: {
            '2025-10-05': { '08:00': true }
          },
          weekdays: { ...baseWeekdays },
          special_events: {},
          can_substitute: false
        }
      }
    ];

    const history = [
      {
        publishedAt: '2025-09-29T00:00:00Z',
        assignments: [
          { date: '2025-09-07', time: '08:00', position: 1, ministerId: 'minister-a' },
          { date: '2025-09-07', time: '08:00', position: 2, ministerId: 'minister-b' },
          { date: '2025-09-14', time: '08:00', position: 1, ministerId: 'minister-a' }
        ]
      }
    ];

    const generator = new IntelligentScheduleGenerator(10, 2025, ministers, responses, history);

    const assignments = (generator as any).assignMinistersToMass({
      date: '2025-10-05',
      time: '08:00',
      dayOfWeek: 0,
      isSpecial: false
    });

    const positionOne = assignments.find((assignment: any) => assignment.position === 1);
    expect(positionOne?.ministerId).toBe('minister-a');
  });

  it('stores comparison metrics after generating a schedule when history is provided', () => {
    const ministers = [
      { id: 'minister-a', name: 'Alice', status: 'active', preferredPositions: [], avoidPositions: [] },
      { id: 'minister-b', name: 'Bruno', status: 'active', preferredPositions: [], avoidPositions: [] }
    ];

    const responses = [
      {
        userId: 'minister-a',
        responses: {
          format_version: '2.0',
          masses: {
            '2025-10-05': { '08:00': true }
          },
          weekdays: { ...baseWeekdays },
          special_events: {},
          can_substitute: false
        }
      },
      {
        userId: 'minister-b',
        responses: {
          format_version: '2.0',
          masses: {
            '2025-10-05': { '08:00': true }
          },
          weekdays: { ...baseWeekdays },
          special_events: {},
          can_substitute: false
        }
      }
    ];

    const history = [
      {
        publishedAt: '2025-09-29T00:00:00Z',
        assignments: [
          { date: '2025-09-07', time: '08:00', position: 1, ministerId: 'minister-a' },
          { date: '2025-09-14', time: '08:00', position: 1, ministerId: 'minister-a' }
        ]
      }
    ];

    const generator = new IntelligentScheduleGenerator(10, 2025, ministers, responses, history);
    generator.generateSchedule();

    const alignment = generator.getLastHistoricalAlignment();
    expect(alignment).toBeDefined();
    expect(alignment?.total).toBeTypeOf('number');
    expect(alignment?.matches).toBeTypeOf('number');
    expect(alignment?.matchRate).toBeTypeOf('number');
  });
});
