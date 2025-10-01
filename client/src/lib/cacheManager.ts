/**
 * Cache Manager
 * Gerencia limpeza de cache e versionamento para invalidar dados antigos
 */

import { queryClient } from './queryClient';

// Versão do cache - IMPORTANTE: incrementar a cada deploy que precise invalidar cache
const CACHE_VERSION = '1.0.0';
const CACHE_VERSION_KEY = 'app-cache-version';

/**
 * Verifica se a versão do cache mudou e limpa tudo se necessário
 */
export function checkCacheVersion(): void {
  const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);

  if (storedVersion !== CACHE_VERSION) {
    console.log(`[CacheManager] Versão mudou de ${storedVersion} para ${CACHE_VERSION}. Limpando cache...`);
    clearAllCache();
    localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
  }
}

/**
 * Limpa TODO o cache do React Query e dados relacionados
 */
export function clearAllCache(): void {
  console.log('[CacheManager] Limpando todo o cache...');

  // Limpa cache do React Query
  queryClient.clear();

  // Limpa dados específicos do localStorage que podem estar obsoletos
  const keysToKeep = [
    'token', // Token de autenticação
    'mesc-ui-theme', // Tema do usuário
    CACHE_VERSION_KEY, // Versão do cache
    'minister-tutorial-dismissed', // Estado do tutorial
  ];

  const allKeys = Object.keys(localStorage);
  allKeys.forEach(key => {
    if (!keysToKeep.includes(key)) {
      localStorage.removeItem(key);
    }
  });

  console.log('[CacheManager] Cache limpo com sucesso');
}

/**
 * Limpa cache de queries específicas (ex: escalas, ministros, etc)
 */
export function invalidateScheduleCache(): void {
  console.log('[CacheManager] Invalidando cache de escalas...');

  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === 'string' && (
        key.includes('/schedules') ||
        key.includes('/schedule') ||
        key.includes('/ministers')
      );
    }
  });
}

/**
 * Limpa cache quando sair de uma página de edição
 */
export function clearEditCache(): void {
  console.log('[CacheManager] Limpando cache de edição...');
  invalidateScheduleCache();
}

/**
 * Force refresh de dados específicos (útil ao voltar para uma página)
 */
export function forceRefreshAuth(): Promise<void> {
  console.log('[CacheManager] Forçando refresh de autenticação...');
  return queryClient.invalidateQueries({
    queryKey: ['/api/auth/me'],
    refetchType: 'active'
  });
}

/**
 * Limpa cache ao fazer logout
 */
export function clearCacheOnLogout(): void {
  console.log('[CacheManager] Limpando cache no logout...');
  clearAllCache();
  localStorage.removeItem('token');
}

/**
 * Hook para limpar cache ao desmontar componente de edição
 */
export function useClearCacheOnUnmount(): () => void {
  return () => {
    clearEditCache();
  };
}
