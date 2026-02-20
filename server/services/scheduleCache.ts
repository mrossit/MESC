/**
 * Schedule Cache Service
 *
 * Caches schedule data by month to avoid repeated database queries.
 * Cache is invalidated when schedules are generated, published, or modified.
 *
 * Thread-safe with mutex locks for concurrent access protection.
 */

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

interface MonthKey {
  year: number;
  month: number;
}

/**
 * Simple mutex implementation for cache operations
 */
class SimpleMutex {
  private locked = false;
  private queue: Array<() => void> = [];

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }
}

class ScheduleCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 1000 * 60 * 60; // 1 hour TTL as fallback
  private mutex = new SimpleMutex();

  /**
   * Generate cache key from year and month
   */
  private getCacheKey(year: number, month: number): string {
    return `schedule-${year}-${month}`;
  }

  /**
   * Get cached schedule data for a specific month
   * Thread-safe read operation
   */
  get(year: number, month: number): unknown | null {
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
      // Don't delete here to avoid race condition, let set() handle it
      return null;
    }

    console.log(`[CACHE] ✅ HIT - Returning cached data for ${month}/${year}`);
    return entry.data;
  }

  /**
   * Set cache for a specific month
   * Thread-safe with mutex lock
   */
  async set(year: number, month: number, data: unknown): Promise<void> {
    await this.mutex.acquire();
    try {
      const key = this.getCacheKey(year, month);
      this.cache.set(key, {
        data,
        timestamp: Date.now()
      });
      console.log(`[CACHE] 💾 STORED - Cached data for ${month}/${year}`);
    } finally {
      this.mutex.release();
    }
  }

  /**
   * Synchronous set for backwards compatibility
   * Note: Use async set() when possible for thread safety
   */
  setSync(year: number, month: number, data: unknown): void {
    const key = this.getCacheKey(year, month);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    console.log(`[CACHE] 💾 STORED (sync) - Cached data for ${month}/${year}`);
  }

  /**
   * Invalidate cache for a specific month
   * Thread-safe with mutex lock
   */
  async invalidateAsync(year: number, month: number): Promise<void> {
    await this.mutex.acquire();
    try {
      const key = this.getCacheKey(year, month);
      const deleted = this.cache.delete(key);
      if (deleted) {
        console.log(`[CACHE] 🗑️  INVALIDATED - Cleared cache for ${month}/${year}`);
      } else {
        console.log(`[CACHE] ⚠️  SKIP - No cache found for ${month}/${year}`);
      }
    } finally {
      this.mutex.release();
    }
  }

  /**
   * Synchronous invalidate for backwards compatibility
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
   * Usa split de string para evitar bug de timezone com new Date()
   * (new Date("2025-10-05") cria UTC midnight, que em UTC-3 é dia anterior)
   */
  invalidateByDate(date: string): void {
    const parts = date.split('-');
    if (parts.length < 2) {
      console.log(`[CACHE] ⚠️  INVALID DATE - Cannot invalidate for: ${date}`);
      return;
    }
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      console.log(`[CACHE] ⚠️  INVALID DATE - Cannot invalidate for: ${date}`);
      return;
    }
    this.invalidate(year, month);
  }

  /**
   * Clear all cached data
   * Thread-safe with mutex lock
   */
  async clear(): Promise<void> {
    await this.mutex.acquire();
    try {
      const size = this.cache.size;
      this.cache.clear();
      console.log(`[CACHE] 🧹 CLEARED - Removed ${size} cache entries`);
    } finally {
      this.mutex.release();
    }
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
