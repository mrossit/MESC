/**
 * Mass Configuration Service
 *
 * Handles the generation of mass instances from configurations and special events.
 * This replaces the hardcoded rules in scheduleGenerator.ts with database-driven configuration.
 */

import { db } from '../db';
import { massConfigurations, specialEvents, questionMassMappings, learnedPatterns } from '@shared/schema';
import type { MassConfiguration, SpecialEvent, QuestionMassMapping, LearnedPattern } from '@shared/schema';
import { eq, and, gte, lte, or, isNull } from 'drizzle-orm';
import { format, startOfMonth, endOfMonth, getDay, getDate, addDays, isFirstDayOfMonth } from 'date-fns';

export interface MassInstance {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  dayOfWeek: number;
  minMinisters: number;
  maxMinisters: number;
  type: string;
  name?: string;
  location?: string;
  priority: number;
  sourceType: 'configuration' | 'special_event' | 'question_mapping';
  sourceId: string;
}

export class MassConfigService {
  /**
   * Load all active mass configurations from the database
   */
  async loadMassConfigurations(): Promise<MassConfiguration[]> {
    return db.select()
      .from(massConfigurations)
      .where(eq(massConfigurations.isActive, true));
  }

  /**
   * Load special events for a given month/year
   */
  async loadSpecialEvents(year: number, month: number): Promise<SpecialEvent[]> {
    const startDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

    return db.select()
      .from(specialEvents)
      .where(
        and(
          eq(specialEvents.isActive, true),
          gte(specialEvents.eventDate, startDate),
          lte(specialEvents.eventDate, endDate)
        )
      );
  }

  /**
   * Load question-mass mappings for a questionnaire
   */
  async loadQuestionMappings(questionnaireId: string): Promise<QuestionMassMapping[]> {
    return db.select()
      .from(questionMassMappings)
      .where(eq(questionMassMappings.questionnaireId, questionnaireId));
  }

  /**
   * Generate all mass instances for a given month based on configurations and events
   */
  async generateMonthlyMassInstances(year: number, month: number): Promise<MassInstance[]> {
    const instances: MassInstance[] = [];

    // Load configurations and events
    const configs = await this.loadMassConfigurations();
    const events = await this.loadSpecialEvents(year, month);

    console.log(`[MassConfigService] Loaded ${configs.length} configurations, ${events.length} special events`);

    // Generate instances from configurations
    for (const config of configs) {
      const configInstances = this.generateInstancesFromConfig(config, year, month);
      instances.push(...configInstances);
    }

    // Add special events
    for (const event of events) {
      instances.push(this.eventToMassInstance(event));
    }

    // Resolve conflicts by priority
    return this.resolveConflicts(instances, events);
  }

  /**
   * Generate mass instances from a single configuration for a month
   */
  private generateInstancesFromConfig(config: MassConfiguration, year: number, month: number): MassInstance[] {
    const instances: MassInstance[] = [];
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    // Check validity period
    if (config.validFrom && new Date(config.validFrom) > endDate) return instances;
    if (config.validUntil && new Date(config.validUntil) < startDate) return instances;

    let currentDate = startDate;
    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');

      // Check if date is excluded
      const excludedDates = config.excludedDates as string[] || [];
      if (excludedDates.includes(dateStr)) {
        currentDate = addDays(currentDate, 1);
        continue;
      }

      // Check if this date matches the recurrence pattern
      if (this.matchesRecurrence(currentDate, config)) {
        instances.push({
          id: `${config.massType}-${dateStr}-${config.time}`,
          date: dateStr,
          time: config.time,
          dayOfWeek: getDay(currentDate),
          minMinisters: config.minMinisters,
          maxMinisters: config.maxMinisters,
          type: config.massType,
          name: config.name,
          location: config.location || undefined,
          priority: config.priority ?? 0,
          sourceType: 'configuration',
          sourceId: config.id
        });
      }

      currentDate = addDays(currentDate, 1);
    }

    return instances;
  }

  /**
   * Check if a date matches the recurrence pattern of a configuration
   */
  private matchesRecurrence(date: Date, config: MassConfiguration): boolean {
    const dayOfWeek = getDay(date);
    const dayOfMonth = getDate(date);
    const month = date.getMonth() + 1;

    switch (config.recurrenceType) {
      case 'weekly':
        return dayOfWeek === config.dayOfWeek;

      case 'monthly':
        // Monthly by day of month (e.g., 28th of every month)
        if (config.dayOfMonth !== null && config.dayOfMonth !== undefined) {
          return dayOfMonth === config.dayOfMonth;
        }
        // Monthly by occurrence (e.g., first Thursday)
        if (config.occurrenceInMonth !== null && config.occurrenceInMonth !== undefined &&
            config.dayOfWeek !== null && config.dayOfWeek !== undefined) {
          if (dayOfWeek !== config.dayOfWeek) return false;
          return this.isNthOccurrenceInMonth(date, config.occurrenceInMonth);
        }
        return false;

      case 'yearly':
        if (config.month !== null && config.month !== undefined) {
          if (month !== config.month) return false;
          if (config.dayOfMonth !== null && config.dayOfMonth !== undefined) {
            return dayOfMonth === config.dayOfMonth;
          }
        }
        return false;

      case 'one_time':
        // One-time events should use special_events table instead
        return false;

      default:
        return false;
    }
  }

  /**
   * Check if a date is the Nth occurrence of its day of week in the month
   * occurrenceInMonth: 1 = first, 2 = second, -1 = last
   */
  private isNthOccurrenceInMonth(date: Date, occurrence: number): boolean {
    const dayOfMonth = getDate(date);
    const dayOfWeek = getDay(date);

    if (occurrence > 0) {
      // Positive occurrence: count from beginning
      // First occurrence: day 1-7, Second: 8-14, Third: 15-21, Fourth: 22-28
      const week = Math.ceil(dayOfMonth / 7);
      return week === occurrence;
    } else if (occurrence === -1) {
      // Last occurrence: check if there's no same weekday in next 7 days within same month
      const nextSameDay = addDays(date, 7);
      return nextSameDay.getMonth() !== date.getMonth();
    }

    return false;
  }

  /**
   * Convert a special event to a mass instance
   */
  private eventToMassInstance(event: SpecialEvent): MassInstance {
    const eventDate = new Date(event.eventDate);
    return {
      id: `event-${event.id}`,
      date: event.eventDate,
      time: event.eventTime,
      dayOfWeek: getDay(eventDate),
      minMinisters: event.minMinisters,
      maxMinisters: event.maxMinisters,
      type: event.massType,
      name: event.name,
      location: event.location || undefined,
      priority: event.priority ?? 100,
      sourceType: 'special_event',
      sourceId: event.id
    };
  }

  /**
   * Resolve conflicts between mass instances
   * Higher priority wins. Special events can suppress regular masses.
   */
  private resolveConflicts(instances: MassInstance[], events: SpecialEvent[]): MassInstance[] {
    // Group by date+time
    const byDateTime = new Map<string, MassInstance[]>();

    for (const instance of instances) {
      const key = `${instance.date}-${instance.time}`;
      if (!byDateTime.has(key)) {
        byDateTime.set(key, []);
      }
      byDateTime.get(key)!.push(instance);
    }

    // Build suppression map from special events
    const suppressionsByDate = new Map<string, Set<string>>();
    for (const event of events) {
      const suppressTypes = event.suppressesMassTypes as string[] || [];
      if (suppressTypes.length > 0) {
        if (!suppressionsByDate.has(event.eventDate)) {
          suppressionsByDate.set(event.eventDate, new Set());
        }
        suppressTypes.forEach(t => suppressionsByDate.get(event.eventDate)!.add(t));
      }
    }

    const result: MassInstance[] = [];

    for (const [, group] of byDateTime) {
      // Sort by priority (descending) and take the highest
      group.sort((a, b) => b.priority - a.priority);
      const winner = group[0];

      // Check if this mass type is suppressed on this date
      const suppressedTypes = suppressionsByDate.get(winner.date);
      if (suppressedTypes && suppressedTypes.has(winner.type) && winner.sourceType !== 'special_event') {
        console.log(`[MassConfigService] Suppressing ${winner.type} on ${winner.date} due to special event`);
        continue;
      }

      result.push(winner);
    }

    return result.sort((a, b) =>
      a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
    );
  }

  /**
   * Load learned patterns for a minister
   */
  async loadLearnedPatterns(ministerId: string): Promise<LearnedPattern[]> {
    return db.select()
      .from(learnedPatterns)
      .where(
        and(
          eq(learnedPatterns.ministerId, ministerId),
          eq(learnedPatterns.isActive, true)
        )
      );
  }

  /**
   * Load learned patterns for a mass context (for all ministers)
   */
  async loadLearnedPatternsForMass(
    massType: string,
    dayOfWeek: number,
    timeSlot: string
  ): Promise<LearnedPattern[]> {
    return db.select()
      .from(learnedPatterns)
      .where(
        and(
          eq(learnedPatterns.isActive, true),
          or(
            eq(learnedPatterns.massType, massType as typeof learnedPatterns.massType.enumValues[number]),
            isNull(learnedPatterns.massType)
          )
        )
      );
  }
}

export const massConfigService = new MassConfigService();
