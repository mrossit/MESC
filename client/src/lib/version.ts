// Version management for cache busting and update detection
// IMPORTANTE: Incrementar APP_VERSION sempre que houver deploy com mudanças

export const APP_VERSION = '5.4.1'; // Sincronizado com service worker
export const BUILD_DATE = new Date().toISOString();

// Gera um hash único baseado na versão e data de build
export const VERSION_HASH = `${APP_VERSION}-${BUILD_DATE.split('T')[0]}`;

// Chave para armazenar versão no localStorage
export const VERSION_STORAGE_KEY = 'mesc-app-version';

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
    console.log(`Version changed: ${storedVersion} -> ${APP_VERSION}`);
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
      console.log('App inactive for too long, clearing cache...');
      clearCacheAndReload();
      return;
    }
  }

  // Atualiza timestamp
  localStorage.setItem(lastUpdateKey, now.toString());
}
