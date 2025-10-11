import { Request, Response, NextFunction } from 'express';

/**
 * CRITICAL: Middleware to prevent API response caching
 *
 * Forces browsers and proxies to NEVER cache API responses.
 * This ensures users always see fresh data without manual cache clearing.
 *
 * Headers explained:
 * - Cache-Control: Comprehensive caching prevention for all proxies/browsers
 * - Pragma: Legacy HTTP/1.0 cache control
 * - Expires: Set to 0 to mark as already expired
 * - Surrogate-Control: Prevent caching in CDNs/proxies
 */
export function noCacheHeaders(req: Request, res: Response, next: NextFunction) {
  // Only apply to API routes
  if (req.path.startsWith('/api')) {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
  }
  next();
}
