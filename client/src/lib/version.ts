// Version management for cache busting and update detection
// IMPORTANT: Version is automatically injected from package.json during build
// DO NOT manually edit APP_VERSION - it's synced with package.json

export const APP_VERSION = '5.4.2'; // Auto-synced with package.json by build script
export const BUILD_DATE = new Date().toISOString();

// Gera um hash único baseado na versão e data de build
export const VERSION_HASH = `${APP_VERSION}-${BUILD_DATE.split('T')[0]}`;

// Chave para armazenar versão no localStorage
export const VERSION_STORAGE_KEY = 'mesc-app-version';
const ACTIVITY_STORAGE_KEY = 'mesc-last-activity';
const SERVER_VERSION_KEY = 'mesc-server-version';

interface VersionInfo {
  version: string;
  buildTime: string;
  buildTimestamp: number;
}

/**
 * Verifica se a versão do app mudou desde a última visita
 */
export function hasVersionChanged(): boolean {
  const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);
  if (!storedVersion) {
    localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION);
    return false;
  }

  if (storedVersion !== APP_VERSION) {
    return true;
  }

  return false;
}

/**
 * Atualiza a versão armazenada
 */
export function updateStoredVersion(): void {
  localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION);
}

/**
 * Limpa todos os caches e força reload da página
 */
export async function clearCacheAndReload(): Promise<void> {
  try {
    // Limpa localStorage (exceto configurações importantes)
    const keysToKeep = ['mesc-ui-theme'];
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    // Limpa sessionStorage
    sessionStorage.clear();

    // Desregistra service workers antigos
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }

    // Limpa cache do browser
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }

    // Atualiza versão e recarrega
    updateStoredVersion();
    window.location.reload();
  } catch (error) {
    console.error('Error clearing cache:', error);
    // Mesmo com erro, tenta recarregar
    updateStoredVersion();
    window.location.reload();
  }
}

/**
 * Verifica se há muito tempo desde a última atualização (indica inatividade)
 */
export function checkInactivityAndClear(): void {
  const lastUpdateKey = 'mesc-last-update';
  const lastUpdate = localStorage.getItem(lastUpdateKey);
  const now = Date.now();

  if (lastUpdate) {
    const hoursSinceUpdate = (now - parseInt(lastUpdate)) / (1000 * 60 * 60);

    // Se passou mais de 7 dias, limpa cache
    if (hoursSinceUpdate > 168) {
      clearCacheAndReload();
      return;
    }
  }

  // Atualiza timestamp
  localStorage.setItem(lastUpdateKey, now.toString());
}

/**
 * Verifica se a versão local é diferente da versão do servidor
 * @returns true se houver nova versão disponível
 */
export function checkVersion(): boolean {
  const stored = localStorage.getItem(VERSION_STORAGE_KEY);
  if (!stored || stored !== APP_VERSION) {
    return true;
  }
  return false;
}

/**
 * Limpa todo o cache do app (localStorage, sessionStorage, caches, SW)
 */
export async function clearAppCache(): Promise<void> {
  try {
    // Limpa sessionStorage
    sessionStorage.clear();

    // Limpa localStorage (exceto tema)
    const keysToKeep = ['mesc-ui-theme'];
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    // Limpa cache do browser
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log('[Version] Clearing cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }

    // Atualiza service worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        // Force skip waiting
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    }

    console.log('[Version] All caches cleared');
  } catch (error) {
    console.error('[Version] Error clearing cache:', error);
  }
}

/**
 * Força reload da página (hard reload, bypass cache)
 */
export function forceReload(): void {
  console.log('[Version] Force reloading page...');
  // Update version before reload
  localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION);
  // Reload
  window.location.reload();
}

/**
 * Registra atividade do usuário
 */
export function recordActivity(): void {
  localStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
}

/**
 * Verifica se usuário está inativo por X minutos
 * @param minutes Minutos de inatividade para considerar
 * @returns true se usuário está inativo
 */
export function checkInactivity(minutes: number): boolean {
  const lastActivity = localStorage.getItem(ACTIVITY_STORAGE_KEY);
  if (!lastActivity) {
    recordActivity();
    return false;
  }

  const now = Date.now();
  const minutesSinceActivity = (now - parseInt(lastActivity)) / (1000 * 60);

  return minutesSinceActivity >= minutes;
}

/**
 * Busca versão do servidor via version.json
 * @returns VersionInfo ou null se falhar
 */
export async function fetchServerVersion(): Promise<VersionInfo | null> {
  try {
    const response = await fetch('/version.json?v=' + Date.now(), {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const versionInfo: VersionInfo = await response.json();

    // Store server version
    localStorage.setItem(SERVER_VERSION_KEY, JSON.stringify(versionInfo));

    return versionInfo;
  } catch (error) {
    console.error('[Version] Failed to fetch server version:', error);
    return null;
  }
}

/**
 * Inicia polling periódico da versão do servidor
 * @param intervalMinutes Intervalo em minutos entre verificações
 */
export function startVersionPolling(intervalMinutes: number = 15): void {
  const checkForUpdate = async () => {
    const serverVersion = await fetchServerVersion();

    if (!serverVersion) {
      return;
    }

    // Compare with stored version
    const storedVersionStr = localStorage.getItem(SERVER_VERSION_KEY);
    if (!storedVersionStr) {
      return;
    }

    try {
      const storedVersion: VersionInfo = JSON.parse(storedVersionStr);

      // Compare build timestamps (most reliable)
      if (serverVersion.buildTimestamp !== storedVersion.buildTimestamp) {
        console.log('[Version] New version detected!', {
          current: storedVersion,
          new: serverVersion
        });

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('new-version-available', {
          detail: {
            serverVersion: serverVersion.version,
            buildTime: serverVersion.buildTime,
            buildTimestamp: serverVersion.buildTimestamp
          }
        }));
      }
    } catch (error) {
      console.error('[Version] Error comparing versions:', error);
    }
  };

  // Initial check after 30s
  setTimeout(checkForUpdate, 30000);

  // Periodic checks
  setInterval(checkForUpdate, intervalMinutes * 60 * 1000);

  // Check when page becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForUpdate();
    }
  });

  console.log(`[Version] Started version polling (every ${intervalMinutes} minutes)`);
}
