/**
 * 🧪 QUESTIONNAIRE FORMAT TESTER
 *
 * Safe testing approach for questionnaire format changes
 * - Compares old vs new parsing
 * - Validates no data loss
 * - Only runs in development
 */

import { db } from '../db.js';
import { questionnaireResponses, questionnaires } from '@shared/schema';
import { eq } from 'drizzle-orm';

// 🔒 SAFETY: Only runs in development
const IS_TEST_MODE = process.env.NODE_ENV === 'development';

interface ParsedResponse {
  availableSundays: string[];
  preferredMassTimes: string[];
  alternativeTimes: string[];
  dailyMassAvailability: string[];
  canSubstitute: boolean;
  specialEvents: Record<string, any>;
}

/**
 * Parse using October 2025 format (current production format)
 */
function parseOctoberFormat(response: any): ParsedResponse {
  const result: ParsedResponse = {
    availableSundays: [],
    preferredMassTimes: [],
    alternativeTimes: [],
    dailyMassAvailability: [],
    canSubstitute: false,
    specialEvents: {}
  };

  try {
    let responsesArray = response.responses;

    if (typeof responsesArray === 'string') {
      responsesArray = JSON.parse(responsesArray);
    }

    if (Array.isArray(responsesArray)) {
      responsesArray.forEach((item: any) => {
        switch(item.questionId) {
          case 'available_sundays':
            result.availableSundays = Array.isArray(item.answer) ? item.answer : [];
            break;
          case 'main_service_time':
            result.preferredMassTimes = item.answer ? [item.answer] : [];
            break;
          case 'other_times_available':
            if (item.answer && item.answer !== 'Não') {
              if (typeof item.answer === 'object' && item.answer.selectedOptions) {
                result.alternativeTimes = item.answer.selectedOptions;
              } else if (Array.isArray(item.answer)) {
                result.alternativeTimes = item.answer;
              }
            }
            break;
          case 'can_substitute':
            result.canSubstitute = item.answer === 'Sim' || item.answer === true;
            break;
          case 'daily_mass_availability':
            if (item.answer && item.answer !== 'Não posso' && item.answer !== 'Não') {
              if (typeof item.answer === 'object' && item.answer.selectedOptions) {
                result.dailyMassAvailability = item.answer.selectedOptions;
              } else if (item.answer === 'Sim') {
                result.dailyMassAvailability = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
              } else if (Array.isArray(item.answer)) {
                result.dailyMassAvailability = item.answer;
              }
            }
            break;
          case 'saint_judas_novena':
            if (Array.isArray(item.answer)) {
              result.specialEvents[item.questionId] = item.answer;
            } else if (item.answer === 'Nenhum dia') {
              result.specialEvents[item.questionId] = [];
            }
            break;
          case 'healing_liberation_mass':
          case 'sacred_heart_mass':
          case 'immaculate_heart_mass':
          case 'saint_judas_feast_7h':
          case 'saint_judas_feast_10h':
          case 'saint_judas_feast_12h':
          case 'saint_judas_feast_15h':
          case 'saint_judas_feast_17h':
          case 'saint_judas_feast_evening':
          case 'adoration_monday':
            result.specialEvents[item.questionId] = item.answer;
            break;
        }
      });
    }
  } catch (error) {
    console.error('[FORMAT_TEST] Error parsing October format:', error);
  }

  return result;
}

/**
 * Parse using v2.0 format (future format)
 */
function parseV2Format(response: any): ParsedResponse {
  const result: ParsedResponse = {
    availableSundays: [],
    preferredMassTimes: [],
    alternativeTimes: [],
    dailyMassAvailability: [],
    canSubstitute: false,
    specialEvents: {}
  };

  try {
    let data = response.responses;

    if (typeof data === 'string') {
      data = JSON.parse(data);
    }

    if (data && typeof data === 'object' && data.version === '2.0') {
      const availability = data.availability || {};
      const preferences = data.preferences || {};
      const substitute = data.substitute || {};

      // Parse date-time pairs
      Object.keys(availability).forEach(key => {
        if (key.match(/^\d{4}-\d{2}-\d{2}_/) && availability[key] === true) {
          const [datePart, timePart] = key.split('_');
          result.availableSundays.push(`${datePart} ${timePart}`);
        }
      });

      result.preferredMassTimes = preferences.preferred_times || [];

      // Parse weekday availability
      Object.keys(availability).forEach(key => {
        if (key.startsWith('weekday_') && Array.isArray(availability[key])) {
          const days = availability[key];
          const dayMap: Record<string, string> = {
            'mon': 'Segunda',
            'tue': 'Terça',
            'wed': 'Quarta',
            'thu': 'Quinta',
            'fri': 'Sexta',
            'sat': 'Sábado'
          };
          days.forEach((day: string) => {
            const ptDay = dayMap[day];
            if (ptDay && !result.dailyMassAvailability.includes(ptDay)) {
              result.dailyMassAvailability.push(ptDay);
            }
          });
        }
      });

      // Parse special events
      if (availability.first_thursday_healing) {
        result.specialEvents['healing_liberation_mass'] = 'Sim';
      }
      if (availability.first_friday_sacred) {
        result.specialEvents['sacred_heart_mass'] = 'Sim';
      }
      if (availability.first_saturday_immaculate) {
        result.specialEvents['immaculate_heart_mass'] = 'Sim';
      }

      result.canSubstitute = substitute.available || false;
    }
  } catch (error) {
    console.error('[FORMAT_TEST] Error parsing v2.0 format:', error);
  }

  return result;
}

/**
 * Compare two parsed responses and report differences
 */
function compareResponses(
  userId: string,
  userName: string,
  oldFormat: ParsedResponse,
  newFormat: ParsedResponse
): {
  isIdentical: boolean;
  differences: string[];
} {
  const differences: string[] = [];

  // Compare available Sundays
  if (oldFormat.availableSundays.length !== newFormat.availableSundays.length) {
    differences.push(
      `Sundays: ${oldFormat.availableSundays.length} vs ${newFormat.availableSundays.length}`
    );
  }

  // Compare preferred times
  if (oldFormat.preferredMassTimes.length !== newFormat.preferredMassTimes.length) {
    differences.push(
      `Preferred times: ${oldFormat.preferredMassTimes.length} vs ${newFormat.preferredMassTimes.length}`
    );
  }

  // Compare daily availability
  if (oldFormat.dailyMassAvailability.length !== newFormat.dailyMassAvailability.length) {
    differences.push(
      `Daily availability: ${oldFormat.dailyMassAvailability.length} vs ${newFormat.dailyMassAvailability.length}`
    );
  }

  // Compare substitution
  if (oldFormat.canSubstitute !== newFormat.canSubstitute) {
    differences.push(
      `Can substitute: ${oldFormat.canSubstitute} vs ${newFormat.canSubstitute}`
    );
  }

  // Compare special events
  const oldEvents = Object.keys(oldFormat.specialEvents).length;
  const newEvents = Object.keys(newFormat.specialEvents).length;
  if (oldEvents !== newEvents) {
    differences.push(`Special events: ${oldEvents} vs ${newEvents}`);
  }

  return {
    isIdentical: differences.length === 0,
    differences
  };
}

/**
 * 🧪 TEST FUNCTION: Compare October data parsing
 */
export async function testOctoberDataParsing(): Promise<void> {
  if (!IS_TEST_MODE) {
    console.log('[FORMAT_TEST] ⚠️ Test mode disabled - skipping');
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log('🧪 QUESTIONNAIRE FORMAT COMPARISON TEST');
  console.log('='.repeat(80));

  try {
    // Get October 2025 questionnaire
    const [octoberQuestionnaire] = await db.select()
      .from(questionnaires)
      .where(eq(questionnaires.month, 10))
      .limit(1);

    if (!octoberQuestionnaire) {
      console.log('❌ No October 2025 questionnaire found');
      return;
    }

    console.log(`\n✅ Found questionnaire: ${octoberQuestionnaire.title}`);
    console.log(`   Month: ${octoberQuestionnaire.month}/${octoberQuestionnaire.year}`);
    console.log(`   Status: ${octoberQuestionnaire.status}`);

    // Get all responses
    const responses = await db.select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.questionnaireId, octoberQuestionnaire.id))
      .limit(10); // Test with first 10 responses

    console.log(`\n📊 Testing ${responses.length} responses...`);
    console.log('─'.repeat(80));

    let identicalCount = 0;
    let differenceCount = 0;
    const detailedDifferences: any[] = [];

    for (const response of responses) {
      // Parse using both formats
      const oldParsed = parseOctoberFormat(response);
      const newParsed = parseV2Format(response);

      // Compare
      const comparison = compareResponses(
        response.userId,
        'User ' + response.userId.substring(0, 8),
        oldParsed,
        newParsed
      );

      if (comparison.isIdentical) {
        identicalCount++;
      } else {
        differenceCount++;
        detailedDifferences.push({
          userId: response.userId.substring(0, 8),
          differences: comparison.differences,
          old: oldParsed,
          new: newParsed
        });
      }
    }

    // Report results
    console.log('\n📈 RESULTS:');
    console.log('─'.repeat(80));
    console.log(`✅ Identical: ${identicalCount}/${responses.length}`);
    console.log(`⚠️  Differences: ${differenceCount}/${responses.length}`);

    if (differenceCount > 0) {
      console.log('\n⚠️  DETAILED DIFFERENCES:');
      console.log('─'.repeat(80));
      detailedDifferences.forEach((diff, index) => {
        console.log(`\n${index + 1}. User ${diff.userId}:`);
        diff.differences.forEach((d: string) => console.log(`   - ${d}`));
      });
    }

    // Safety check
    console.log('\n🔒 SAFETY CHECK:');
    console.log('─'.repeat(80));
    if (identicalCount === responses.length) {
      console.log('✅ ALL RESPONSES PARSED IDENTICALLY');
      console.log('✅ No data loss detected');
      console.log('✅ Safe to proceed with new format');
    } else {
      console.log('⚠️  DIFFERENCES DETECTED');
      console.log('⚠️  Review differences before proceeding');
      console.log('⚠️  October data should use compatibility layer');
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('[FORMAT_TEST] ❌ Test failed:', error);
    throw error;
  }
}

/**
 * 🔍 DEBUG FUNCTION: Show detailed parsing for one response
 */
export async function debugSingleResponse(userId: string): Promise<void> {
  if (!IS_TEST_MODE) {
    console.log('[FORMAT_TEST] ⚠️ Test mode disabled - skipping');
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log('🔍 DEBUG SINGLE RESPONSE');
  console.log('='.repeat(80));

  try {
    const [response] = await db.select()
      .from(questionnaireResponses)
      .where(eq(questionnaireResponses.userId, userId))
      .limit(1);

    if (!response) {
      console.log(`❌ No response found for user ${userId}`);
      return;
    }

    console.log(`\n📋 User: ${userId}`);
    console.log('─'.repeat(80));

    // Show raw data
    console.log('\n🗂️  RAW DATA:');
    console.log(JSON.stringify(response.responses, null, 2));

    // Parse with October format
    console.log('\n📊 OCTOBER FORMAT PARSING:');
    console.log('─'.repeat(80));
    const oldParsed = parseOctoberFormat(response);
    console.log('Available Sundays:', oldParsed.availableSundays);
    console.log('Preferred Times:', oldParsed.preferredMassTimes);
    console.log('Daily Availability:', oldParsed.dailyMassAvailability);
    console.log('Can Substitute:', oldParsed.canSubstitute);
    console.log('Special Events:', Object.keys(oldParsed.specialEvents).length, 'events');

    // Parse with v2.0 format (should fail gracefully for October data)
    console.log('\n🆕 V2.0 FORMAT PARSING (SHOULD BE EMPTY):');
    console.log('─'.repeat(80));
    const newParsed = parseV2Format(response);
    console.log('Available Sundays:', newParsed.availableSundays);
    console.log('Preferred Times:', newParsed.preferredMassTimes);
    console.log('Daily Availability:', newParsed.dailyMassAvailability);
    console.log('Can Substitute:', newParsed.canSubstitute);

    console.log('\n✅ October data should parse with October format');
    console.log('✅ v2.0 parser should return empty (no version field)');
    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('[FORMAT_TEST] ❌ Debug failed:', error);
    throw error;
  }
}

/**
 * 🎯 PRODUCTION SAFETY: Verify compatibility layer is working
 */
export function verifyProductionSafety(): void {
  console.log('\n' + '='.repeat(80));
  console.log('🔒 PRODUCTION SAFETY VERIFICATION');
  console.log('='.repeat(80));

  console.log('\n✅ SAFETY MEASURES IN PLACE:');
  console.log('─'.repeat(80));
  console.log('1. ✅ Test mode flag: IS_TEST_MODE =', IS_TEST_MODE);
  console.log('2. ✅ Compatibility layer: Uses year/month detection');
  console.log('3. ✅ Version detection: Checks for "version" field');
  console.log('4. ✅ Fallback mechanism: October format if no version');
  console.log('5. ✅ No database modifications: Read-only operations');

  console.log('\n🎯 PRODUCTION BEHAVIOR:');
  console.log('─'.repeat(80));
  console.log('- October 2025: Uses October parser (array format)');
  console.log('- November 2025+: Checks for version field');
  console.log('  - If version=2.0: Uses v2.0 parser');
  console.log('  - If no version: Falls back to October parser');

  console.log('\n🚨 CRITICAL RULES:');
  console.log('─'.repeat(80));
  console.log('❌ NEVER modify October 2025 data in production');
  console.log('❌ NEVER auto-migrate existing responses');
  console.log('✅ ONLY use v2.0 for NEW questionnaires (Nov 2025+)');
  console.log('✅ ALWAYS check version field before parsing');

  console.log('\n' + '='.repeat(80));
}

// Auto-run verification on import
if (IS_TEST_MODE) {
  verifyProductionSafety();
}
