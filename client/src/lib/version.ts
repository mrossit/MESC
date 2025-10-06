/**
 * Sistema de Versionamento e Cache Busting
 *
 * Gerencia versões da aplicação e força atualização quando necessário
 */

// Versão atual da aplicação (atualizar manualmente a cada deploy)
export const APP_VERSION = '1.0.0';

// Timestamp de build (gerado automaticamente)
export const BUILD_TIMESTAMP = new Date().toISOString();

// Chave para armazenar versão no localStorage
const VERSION_KEY = 'app_version';
const LAST_ACTIVITY_KEY = 'last_activity';

/**
 * Verifica se há uma nova versão da aplicação
 */
export function checkVersion(): boolean {
  if (typeof window === 'undefined') return false;

  const storedVersion = localStorage.getItem(VERSION_KEY);

  if (!storedVersion || storedVersion !== APP_VERSION) {
    console.log(`🔄 Nova versão detectada: ${storedVersion} → ${APP_VERSION}`);
    return true;
  }

  return false;
}

/**
 * Atualiza a versão armazenada
 */
export function updateVersion(): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(VERSION_KEY, APP_VERSION);
  console.log(`✅ Versão atualizada para: ${APP_VERSION}`);
}

/**
 * Limpa todo o cache da aplicação
 */
export async function clearAppCache(): Promise<void> {
  // Verificar se está no navegador
  if (typeof window === 'undefined') {
    console.log('⚠️ clearAppCache chamado fora do navegador');
    return;
  }

  console.log('🧹 Limpando cache da aplicação...');

  try {
    // Limpar cache do navegador
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log(`  Removendo cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    }

    // Limpar localStorage (exceto dados críticos)
    const criticalKeys = ['auth_token', 'user_preferences'];
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !criticalKeys.includes(key)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Limpar sessionStorage
    sessionStorage.clear();

    console.log('✅ Cache limpo com sucesso');
  } catch (error) {
    console.error('❌ Erro ao limpar cache:', error);
  }
}

/**
 * Força o reload da aplicação
 */
export function forceReload(): void {
  console.log('🔄 Forçando reload da aplicação...');
  window.location.reload();
}

/**
 * Registra atividade do usuário
 */
export function recordActivity(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

/**
 * Verifica se o usuário está inativo há mais de X minutos
 */
export function checkInactivity(minutesThreshold: number = 10): boolean {
  if (typeof window === 'undefined') return false;

  const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);

  if (!lastActivity) {
    return false;
  }

  const lastActivityTime = parseInt(lastActivity, 10);
  const now = Date.now();
  const inactiveMinutes = (now - lastActivityTime) / (1000 * 60);

  return inactiveMinutes >= minutesThreshold;
}

/**
 * Inicializa o sistema de versionamento
 */
export async function initVersionControl(): Promise<void> {
  if (typeof window === 'undefined') {
    console.log('⚠️ initVersionControl chamado fora do navegador');
    return;
  }

  console.log('🚀 Inicializando controle de versão...');
  console.log(`📦 Versão atual: ${APP_VERSION}`);
  console.log(`🕐 Build: ${BUILD_TIMESTAMP}`);

  // Verificar se há nova versão
  if (checkVersion()) {
    console.log('⚠️ Nova versão detectada! Limpando cache...');
    await clearAppCache();
    updateVersion();

    // Não força reload imediatamente, deixa a aplicação inicializar
    // O reload será feito pelo componente VersionChecker
  } else {
    updateVersion();
  }

  // Verificar inatividade
  if (checkInactivity(10)) {
    console.log('⏰ Usuário inativo há mais de 10 minutos. Limpando cache...');
    await clearAppCache();
  }

  // Registrar atividade inicial
  recordActivity();
}

/**
 * Busca a versão do servidor (para comparação)
 */
export async function fetchServerVersion(): Promise<string | null> {
  try {
    const response = await fetch('/api/version', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.version || null;
  } catch (error) {
    console.error('Erro ao buscar versão do servidor:', error);
    return null;
  }
}

/**
 * Verifica periodicamente se há nova versão no servidor
 */
export function startVersionPolling(intervalMinutes: number = 15): void {
  const checkInterval = intervalMinutes * 60 * 1000;

  setInterval(async () => {
    const serverVersion = await fetchServerVersion();

    if (serverVersion && serverVersion !== APP_VERSION) {
      console.log(`🔔 Nova versão disponível no servidor: ${serverVersion}`);

      // Disparar evento customizado
      window.dispatchEvent(new CustomEvent('new-version-available', {
        detail: { serverVersion, currentVersion: APP_VERSION }
      }));
    }
  }, checkInterval);
}
