/**
 * Schedule Cache Service
 * 
 * Caches schedule data by month to avoid repeated database queries.
 * Cache is invalidated when schedules are generated, published, or modified.
 */

interface CacheEntry {
  data: any;
  timestamp: number;
}

interface MonthKey {
  year: number;
  month: number;
}

class ScheduleCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 1000 * 60 * 60; // 1 hour TTL as fallback

  /**
   * Generate cache key from year and month
   */
  private getCacheKey(year: number, month: number): string {
    return `schedule-${year}-${month}`;
  }

  /**
   * Get cached schedule data for a specific month
   */
  get(year: number, month: number): any | null {
    const key = this.getCacheKey(year, month);
    const entry = this.cache.get(key);

    if (!entry) {
      console.log(`[CACHE] ❌ MISS - No cache for ${month}/${year}`);
      return null;
    }

    // Check if cache is still valid (TTL check as fallback)
    const now = Date.now();
    if (now - entry.timestamp > this.TTL) {
      console.log(`[CACHE] ⏰ EXPIRED - Cache for ${month}/${year} is too old`);
      this.cache.delete(key);
      return null;
    }

    console.log(`[CACHE] ✅ HIT - Returning cached data for ${month}/${year}`);
    return entry.data;
  }

  /**
   * Set cache for a specific month
   */
  set(year: number, month: number, data: any): void {
    const key = this.getCacheKey(year, month);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    console.log(`[CACHE] 💾 STORED - Cached data for ${month}/${year}`);
  }

  /**
   * Invalidate cache for a specific month
   */
  invalidate(year: number, month: number): void {
    const key = this.getCacheKey(year, month);
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`[CACHE] 🗑️  INVALIDATED - Cleared cache for ${month}/${year}`);
    } else {
      console.log(`[CACHE] ⚠️  SKIP - No cache found for ${month}/${year}`);
    }
  }

  /**
   * Invalidate cache for a specific date (extracts month/year from date)
   */
  invalidateByDate(date: string): void {
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    this.invalidate(year, month);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[CACHE] 🧹 CLEARED - Removed ${size} cache entries`);
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const scheduleCache = new ScheduleCache();
