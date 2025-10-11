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
  if (typeof window === 'undefined') return;

  const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);

  if (storedVersion !== CACHE_VERSION) {
    clearAllCache();
    localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
  }
}

/**
 * Limpa TODO o cache do React Query e dados relacionados
 */
export function clearAllCache(): void {
  if (typeof window === 'undefined') return;


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

}

/**
 * Limpa cache de queries específicas (ex: escalas, ministros, etc)
 */
export function invalidateScheduleCache(): void {

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
  invalidateScheduleCache();
}

/**
 * Force refresh de dados específicos (útil ao voltar para uma página)
 */
export function forceRefreshAuth(): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: ['/api/auth/me'],
    refetchType: 'active'
  });
}

/**
 * Limpa cache ao fazer logout
 */
export function clearCacheOnLogout(): void {
  if (typeof window === 'undefined') return;

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
