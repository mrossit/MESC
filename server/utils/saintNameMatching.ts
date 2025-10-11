/**
 * Saint Name Matching Utility
 * Provides bonus scoring for ministers whose names match the saint being celebrated
 */

import { db } from '../db';
import { saints } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Global cache for saints data indexed by feastDay (MM-DD)
let saintsCache: Map<string, any[]> | null = null;

/**
 * Load ALL saints data once and cache it
 * This prevents 1000+ database queries in loops
 */
export async function loadAllSaintsData(): Promise<Map<string, any[]>> {
  if (saintsCache) {
    return saintsCache; // Return cached data
  }

  console.time('[PERF] Load all saints data');
  const allSaints = await db.select().from(saints);
  console.timeEnd('[PERF] Load all saints data');

  // Index saints by feastDay for fast lookup
  saintsCache = new Map<string, any[]>();
  for (const saint of allSaints) {
    const feastDay = saint.feastDay;
    if (!saintsCache.has(feastDay)) {
      saintsCache.set(feastDay, []);
    }
    saintsCache.get(feastDay)!.push(saint);
  }

  console.log(`[SAINT_CACHE] Loaded ${allSaints.length} saints indexed by ${saintsCache.size} feast days`);
  return saintsCache;
}

/**
 * Clear saints cache (useful for testing)
 */
export function clearSaintsCache() {
  saintsCache = null;
}

/**
 * Calculate saint name match score for a minister on a specific date
 * Returns a score between 0 and 1, where 1 is a perfect match
 * OPTIMIZED: Uses cached saints data instead of database queries
 */
export async function calculateSaintNameMatchBonus(
  ministerName: string,
  date: string,
  saintsData?: Map<string, any[]> // Optional: pass pre-loaded saints data
): Promise<number> {
  try {
    // Extract month and day from date (YYYY-MM-DD)
    const [year, month, day] = date.split('-');
    const feastDay = `${month}-${day}`;

    // Use provided cache or load from global cache
    const cache = saintsData || await loadAllSaintsData();
    const saintsForDay = cache.get(feastDay) || [];

    if (saintsForDay.length === 0) {
      return 0; // No saint for this day
    }

    // Normalize minister name for comparison
    const normalizedMinisterName = ministerName.toLowerCase().trim();
    const ministerNameParts = normalizedMinisterName.split(' ');

    let bestMatchScore = 0;

    for (const saint of saintsForDay) {
      const saintName = saint.name.toLowerCase();
      const saintNameParts = saintName.split(' ');

      // Calculate match score for this saint
      let matchScore = 0;
      let matchedParts = 0;

      // Check each part of minister's name against saint's name
      for (const ministerPart of ministerNameParts) {
        if (ministerPart.length < 3) continue; // Skip very short parts

        for (const saintPart of saintNameParts) {
          if (saintPart.length < 3) continue;

          // Exact match
          if (ministerPart === saintPart) {
            matchScore += 1.0;
            matchedParts++;
          }
          // Partial match (name contains)
          else if (ministerPart.includes(saintPart) || saintPart.includes(ministerPart)) {
            matchScore += 0.5;
            matchedParts++;
          }
          // Similar names (Levenshtein-like)
          else if (calculateSimilarity(ministerPart, saintPart) > 0.7) {
            matchScore += 0.3;
            matchedParts++;
          }
        }
      }

      // Normalize match score based on number of name parts
      const normalizedScore = matchScore / Math.max(ministerNameParts.length, saintNameParts.length);

      // Apply rank bonus: Solemnity = 1.5x, Feast = 1.3x, Memorial = 1.2x
      let rankMultiplier = 1.0;
      switch (saint.rank) {
        case 'SOLEMNITY':
          rankMultiplier = 1.5;
          break;
        case 'FEAST':
          rankMultiplier = 1.3;
          break;
        case 'MEMORIAL':
          rankMultiplier = 1.2;
          break;
      }

      const finalScore = Math.min(normalizedScore * rankMultiplier, 1.0);
      bestMatchScore = Math.max(bestMatchScore, finalScore);

      if (finalScore > 0.3) {
        console.log(
          `[SAINT_MATCH] "${ministerName}" matches "${saint.name}" (${saint.rank}): score ${finalScore.toFixed(2)}`
        );
      }
    }

    return bestMatchScore;
  } catch (error) {
    console.error('[SAINT_MATCH] Error calculating saint name match:', error);
    return 0;
  }
}

/**
 * Calculate string similarity (simple version)
 * Returns value between 0 and 1
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Get saints for a specific date
 */
export async function getSaintsForDate(date: string): Promise<any[]> {
  try {
    const [year, month, day] = date.split('-');
    const feastDay = `${month}-${day}`;

    return await db
      .select()
      .from(saints)
      .where(eq(saints.feastDay, feastDay));
  } catch (error) {
    console.error('[SAINT_MATCH] Error getting saints for date:', error);
    return [];
  }
}
