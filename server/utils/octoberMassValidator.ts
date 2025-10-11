/**
 * October Mass Schedule Validator
 * Validates that October masses follow the correct rules for the Sanctuary
 */

import { MassTime } from './scheduleGenerator';

export interface ValidationError {
  date: string;
  time: string;
  type: string;
  error: string;
  severity: 'ERROR' | 'WARNING';
}

/**
 * Validates October mass schedule against sanctuary rules
 */
export function validateOctoberMasses(masses: MassTime[]): ValidationError[] {
  const errors: ValidationError[] = [];

  masses.forEach(mass => {
    if (!mass.date) return;

    const date = new Date(mass.date);
    const month = date.getMonth() + 1; // 1-12

    // Only validate October
    if (month !== 10) return;

    const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
    const dayOfMonth = date.getDate(); // 1-31

    // RULE 1: Check no regular Saturday masses except 1st Saturday
    if (dayOfWeek === 6) { // Saturday
      // Only 1st Saturday (days 1-7) should have morning mass
      if (dayOfMonth > 7 && mass.time === '06:30' && mass.type === 'missa_diaria') {
        errors.push({
          date: mass.date,
          time: mass.time,
          type: mass.type || 'unknown',
          error: `Regular Saturday ${dayOfMonth} should have NO morning mass (only 1st Saturday has 6:30)`,
          severity: 'ERROR'
        });
      }

      // Special check: Saturdays 11, 18 should have NO mass at all
      if ((dayOfMonth === 11 || dayOfMonth === 18) && mass.time === '06:30') {
        errors.push({
          date: mass.date,
          time: mass.time,
          type: mass.type || 'unknown',
          error: `October ${dayOfMonth} is a regular Saturday - should have NO mass`,
          severity: 'ERROR'
        });
      }
    }

    // RULE 2: Novena period checks (20-27 October)
    if (dayOfMonth >= 20 && dayOfMonth <= 27) {
      // No morning masses during novena (only evening novena masses)
      if (mass.time === '06:30') {
        errors.push({
          date: mass.date,
          time: mass.time,
          type: mass.type || 'unknown',
          error: `October ${dayOfMonth} during novena should NOT have 6:30 morning mass (only evening novena)`,
          severity: 'ERROR'
        });
      }

      // Verify novena masses exist
      if (mass.type === 'missa_sao_judas') {
        // Saturday during novena should be 19:00
        if (dayOfWeek === 6 && mass.time !== '19:00') {
          errors.push({
            date: mass.date,
            time: mass.time,
            type: mass.type,
            error: `Novena Saturday (${dayOfMonth}) should be at 19:00, not ${mass.time}`,
            severity: 'WARNING'
          });
        }

        // Weekdays should be 19:30
        if (dayOfWeek >= 1 && dayOfWeek <= 5 && mass.time !== '19:30') {
          errors.push({
            date: mass.date,
            time: mass.time,
            type: mass.type,
            error: `Novena weekday (${dayOfMonth}) should be at 19:30, not ${mass.time}`,
            severity: 'WARNING'
          });
        }
      }
    }

    // RULE 3: October 28 (St Jude Feast) - should have NO daily mass
    if (dayOfMonth === 28 && mass.type === 'missa_diaria') {
      errors.push({
        date: mass.date,
        time: mass.time,
        type: mass.type,
        error: `October 28 (St Jude Feast) should NOT have regular daily mass`,
        severity: 'ERROR'
      });
    }

    // RULE 4: Verify 1st Saturday has Immaculate Heart mass
    if (dayOfWeek === 6 && dayOfMonth <= 7) {
      if (mass.time === '06:30' && mass.type !== 'missa_imaculado_coracao') {
        errors.push({
          date: mass.date,
          time: mass.time,
          type: mass.type || 'unknown',
          error: `1st Saturday should be Immaculate Heart mass, not ${mass.type}`,
          severity: 'WARNING'
        });
      }
    }
  });

  return errors;
}

/**
 * Validates and logs October mass schedule
 * Returns true if validation passed (no errors)
 */
export function validateAndLogOctoberMasses(masses: MassTime[], year: number): boolean {
  const octoberMasses = masses.filter(m => {
    if (!m.date) return false;
    const date = new Date(m.date);
    return date.getMonth() + 1 === 10 && date.getFullYear() === year;
  });

  if (octoberMasses.length === 0) {
    console.log('[OCT_VALIDATION] No October masses to validate');
    return true;
  }

  console.log(`\n[OCT_VALIDATION] 📋 Validating ${octoberMasses.length} October masses...`);

  const errors = validateOctoberMasses(octoberMasses);

  if (errors.length === 0) {
    console.log('[OCT_VALIDATION] ✅ All October masses are VALID!');
    return true;
  }

  console.log(`[OCT_VALIDATION] ❌ Found ${errors.length} validation issues:\n`);

  // Group by severity
  const errorList = errors.filter(e => e.severity === 'ERROR');
  const warningList = errors.filter(e => e.severity === 'WARNING');

  if (errorList.length > 0) {
    console.log(`[OCT_VALIDATION] 🚨 ERRORS (${errorList.length}):`);
    errorList.forEach((err, idx) => {
      console.log(`[OCT_VALIDATION]   ${idx + 1}. ${err.date} ${err.time} (${err.type})`);
      console.log(`[OCT_VALIDATION]      ${err.error}`);
    });
    console.log('');
  }

  if (warningList.length > 0) {
    console.log(`[OCT_VALIDATION] ⚠️  WARNINGS (${warningList.length}):`);
    warningList.forEach((err, idx) => {
      console.log(`[OCT_VALIDATION]   ${idx + 1}. ${err.date} ${err.time} (${err.type})`);
      console.log(`[OCT_VALIDATION]      ${err.error}`);
    });
    console.log('');
  }

  return errorList.length === 0; // Pass if no errors (warnings are okay)
}

/**
 * Print expected vs actual October schedule
 */
export function printOctoberScheduleComparison(masses: MassTime[], year: number): void {
  const octoberMasses = masses.filter(m => {
    if (!m.date) return false;
    const date = new Date(m.date);
    return date.getMonth() + 1 === 10 && date.getFullYear() === year;
  });

  console.log('\n[OCT_VALIDATION] 📅 OCTOBER SCHEDULE COMPARISON:');
  console.log('[OCT_VALIDATION] ================================================\n');

  // Group by date
  const massesByDate = new Map<string, MassTime[]>();
  octoberMasses.forEach(mass => {
    if (!mass.date) return;
    if (!massesByDate.has(mass.date)) {
      massesByDate.set(mass.date, []);
    }
    massesByDate.get(mass.date)!.push(mass);
  });

  // Sort and display
  const sortedDates = Array.from(massesByDate.keys()).sort();

  sortedDates.forEach(date => {
    const masses = massesByDate.get(date)!.sort((a, b) => a.time.localeCompare(b.time));
    const dateObj = new Date(date);
    const day = dateObj.getDate();
    const dayOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dateObj.getDay()];

    console.log(`[OCT_VALIDATION] Oct ${day.toString().padStart(2, '0')} (${dayOfWeek}):`);

    if (masses.length === 0) {
      console.log(`[OCT_VALIDATION]   (no masses)`);
    } else {
      masses.forEach(mass => {
        const typeLabel = mass.type || 'unknown';
        console.log(`[OCT_VALIDATION]   ${mass.time} - ${typeLabel}`);
      });
    }
  });

  console.log('\n[OCT_VALIDATION] ================================================\n');
}
