/**
 * Formatador de tempo em português (pt-BR)
 * Converte timestamps em formato humanizado
 */

import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface HumanizedTime {
  iso: string;
  human: string;
  isOnline: boolean;
}

/**
 * Determina se usuário está online baseado em última atividade
 * Online: atividade nos últimos 2 minutos
 */
export function isUserOnline(lastActivity: Date | string): boolean {
  const lastActivityDate = typeof lastActivity === 'string'
    ? new Date(lastActivity)
    : lastActivity;

  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  return lastActivityDate >= twoMinutesAgo;
}

/**
 * Determina se usuário está away baseado em última atividade
 * Away: atividade entre 2 e 5 minutos atrás
 */
export function isUserAway(lastActivity: Date | string): boolean {
  const lastActivityDate = typeof lastActivity === 'string'
    ? new Date(lastActivity)
    : lastActivity;

  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  return lastActivityDate < twoMinutesAgo && lastActivityDate >= fiveMinutesAgo;
}

/**
 * Formata timestamp em formato humanizado pt-BR
 * Exemplos:
 * - "agora" (< 1 min)
 * - "há 1 min"
 * - "há 5 min"
 * - "há 2 horas"
 * - "ontem 14:32"
 * - "01/10 às 09:15"
 */
export function formatLastSeen(lastSeen: Date | string | null): string {
  if (!lastSeen) {
    return 'nunca';
  }

  const lastSeenDate = typeof lastSeen === 'string'
    ? new Date(lastSeen)
    : lastSeen;

  // Verificar se a data é válida
  if (isNaN(lastSeenDate.getTime())) {
    return 'nunca';
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - lastSeenDate.getTime()) / 1000);

  // Agora (menos de 1 minuto)
  if (diffInSeconds < 60) {
    return 'agora';
  }

  // Minutos (até 59 minutos)
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `há ${minutes} min`;
  }

  // Horas (hoje, até 23:59)
  if (isToday(lastSeenDate)) {
    const hours = Math.floor(diffInSeconds / 3600);
    if (hours === 1) {
      return 'há 1 hora';
    }
    return `há ${hours} horas`;
  }

  // Ontem
  if (isYesterday(lastSeenDate)) {
    return `ontem ${format(lastSeenDate, 'HH:mm', { locale: ptBR })}`;
  }

  // Data específica (mais de 1 dia)
  return format(lastSeenDate, "dd/MM 'às' HH:mm", { locale: ptBR });
}

/**
 * Retorna objeto completo com informações de tempo
 */
export function getHumanizedTime(lastSeen: Date | string | null): HumanizedTime {
  const lastSeenDate = lastSeen
    ? (typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen)
    : null;

  return {
    iso: lastSeenDate ? lastSeenDate.toISOString() : '',
    human: formatLastSeen(lastSeen),
    isOnline: lastSeenDate ? isUserOnline(lastSeenDate) : false
  };
}

/**
 * Determina status baseado em última atividade
 */
export function getUserStatus(lastActivity: Date | string | null): 'online' | 'away' | 'offline' {
  if (!lastActivity) {
    return 'offline';
  }

  if (isUserOnline(lastActivity)) {
    return 'online';
  }

  if (isUserAway(lastActivity)) {
    return 'away';
  }

  return 'offline';
}

/**
 * Mascara número de WhatsApp para exibição
 * Exemplo: +55 11 9****-1234
 */
export function maskWhatsApp(whatsapp: string | null): string {
  if (!whatsapp) {
    return '';
  }

  // Formato E.164: +5511999999999
  const cleaned = whatsapp.replace(/\D/g, '');

  if (cleaned.length < 10) {
    return whatsapp; // Retorna original se formato inválido
  }

  // Brasileiro: +55 11 9****-1234
  if (cleaned.startsWith('55')) {
    const ddd = cleaned.substring(2, 4);
    const lastFour = cleaned.slice(-4);
    return `+55 ${ddd} 9****-${lastFour}`;
  }

  // Outros países: mostrar apenas últimos 4 dígitos
  const lastFour = cleaned.slice(-4);
  return `+** ** ****-${lastFour}`;
}

/**
 * Mascara email para exibição
 * Exemplo: a***@dominio.com
 */
export function maskEmail(email: string | null): string {
  if (!email || !email.includes('@')) {
    return '';
  }

  const [localPart, domain] = email.split('@');

  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }

  return `${localPart[0]}***@${domain}`;
}
