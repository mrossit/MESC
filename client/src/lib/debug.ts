/**
 * Debug utilities for development mode
 * These are no-ops in production
 */

const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

// Track component renders (can be called from any component)
const renderTracking = new Map<string, number>();

/**
 * Track a component render in the debug panel
 * Usage: Call this at the top of your component
 *
 * Example:
 * ```tsx
 * export function MyComponent() {
 *   useDebugRender('MyComponent');
 *   // ... rest of component
 * }
 * ```
 */
export const trackRender = (componentName: string) => {
  if (!isDev) return;

  const current = renderTracking.get(componentName) || 0;
  renderTracking.set(componentName, current + 1);
};

/**
 * Get all render tracking data
 */
export const getRenderTracking = () => {
  return Array.from(renderTracking.entries());
};

/**
 * Clear render tracking data
 */
export const clearRenderTracking = () => {
  renderTracking.clear();
};

/**
 * React hook to track component renders
 * Usage: Call this at the top of your component
 *
 * Example:
 * ```tsx
 * import { useDebugRender } from '@/lib/debug';
 *
 * export function MyComponent() {
 *   useDebugRender('MyComponent');
 *   // ... rest of component
 * }
 * ```
 */
export const useDebugRender = (componentName: string) => {
  if (isDev) {
    trackRender(componentName);
  }
};

/**
 * Log to console only in development
 */
export const debugLog = (...args: any[]) => {
  if (isDev) {
    console.log('[DEBUG]', ...args);
  }
};

/**
 * Measure component render time
 * Returns a function to call when render is complete
 *
 * Example:
 * ```tsx
 * export function MyComponent() {
 *   const endMeasure = measureRender('MyComponent');
 *
 *   // ... component logic
 *
 *   useEffect(() => {
 *     endMeasure();
 *   });
 * }
 * ```
 */
export const measureRender = (componentName: string) => {
  if (!isDev) return () => {};

  const startTime = performance.now();

  return () => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    debugLog(`${componentName} rendered in ${duration.toFixed(2)}ms`);
  };
};
