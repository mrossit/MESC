import { useEffect } from 'react';
import { APP_VERSION, queryClient } from '@/lib/queryClient';

/**
 * CRITICAL: Version check hook to force cache refresh on version change
 *
 * This hook runs on every app load and:
 * 1. Checks if stored version matches current version
 * 2. If different, clears all caches and forces reload
 * 3. Updates stored version
 *
 * This ensures users ALWAYS see the latest version without manual cache clearing
 */
export function useVersionCheck() {
  useEffect(() => {
    const checkVersion = async () => {
      try {
        // Detecta se está no preview do Replit
        const isReplitPreview = window.location.hostname.includes('replit.dev') || 
                                window.location.hostname.includes('repl.co');
        
        const storedVersion = localStorage.getItem('app_version');

        if (storedVersion && storedVersion !== APP_VERSION) {
          console.warn(`Version changed from ${storedVersion} to ${APP_VERSION} - clearing caches`);

          // 1. Clear React Query cache
          queryClient.clear();

          // 2. Clear Service Worker caches
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }

          // 3. Clear localStorage (preserve auth token)
          const token = localStorage.getItem('token');
          const userId = localStorage.getItem('userId');
          localStorage.clear();
          if (token) localStorage.setItem('token', token);
          if (userId) localStorage.setItem('userId', userId);

          // 4. Update version
          localStorage.setItem('app_version', APP_VERSION);

          // 5. Unregister Service Worker
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(reg => reg.unregister()));
          }

          // 6. Force hard reload ONLY if NOT in Replit preview
          // This prevents reload loops in the Replit preview environment
          if (!isReplitPreview) {
            console.warn('Reloading page to apply updates...');
            window.location.reload();
          } else {
            console.warn('Running in Replit preview - skipping auto-reload to prevent connection errors');
            console.warn('Please refresh manually if you experience issues');
          }
        } else if (!storedVersion) {
          // First time - just set version
          localStorage.setItem('app_version', APP_VERSION);
        }
      } catch (error) {
        console.error('Error checking version:', error);
        // Even on error, set version to prevent infinite loops
        localStorage.setItem('app_version', APP_VERSION);
      }
    };

    checkVersion();
  }, []);
}

/**
 * Get current app version
 */
export function getAppVersion(): string {
  return APP_VERSION;
}

/**
 * Force clear all caches (for debugging/manual intervention)
 */
export async function forceClearAllCaches(): Promise<void> {
  console.warn('🧹 FORCE CLEARING ALL CACHES...');

  // Clear React Query
  queryClient.clear();

  // Clear Service Worker caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }

  // Clear localStorage (preserve auth)
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  localStorage.clear();
  if (token) localStorage.setItem('token', token);
  if (userId) localStorage.setItem('userId', userId);
  localStorage.setItem('app_version', APP_VERSION);

  // Unregister Service Worker
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));
  }

  console.warn('✅ All caches cleared! Reloading...');
  window.location.reload();
}
