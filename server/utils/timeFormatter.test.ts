/**
 * Testes Unitários: Time Formatter
 * Valida funções de cálculo online/offline e formatação pt-BR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isUserOnline,
  isUserAway,
  getUserStatus,
  formatLastSeen,
  getHumanizedTime,
  maskEmail,
  maskWhatsApp
} from './timeFormatter';

describe('timeFormatter - Status Detection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-10-04T12:00:00.000Z'));
  });

  describe('isUserOnline', () => {
    it('retorna true quando last_activity = now', () => {
      const now = new Date('2025-10-04T12:00:00.000Z');
      expect(isUserOnline(now)).toBe(true);
    });

    it('retorna true quando last_activity = 1 min ago', () => {
      const oneMinAgo = new Date('2025-10-04T11:59:00.000Z');
      expect(isUserOnline(oneMinAgo)).toBe(true);
    });

    it('retorna true quando last_activity = 2 min ago (limite)', () => {
      const twoMinAgo = new Date('2025-10-04T11:58:00.000Z');
      expect(isUserOnline(twoMinAgo)).toBe(true);
    });

    it('retorna false quando last_activity = 3 min ago', () => {
      const threeMinAgo = new Date('2025-10-04T11:57:00.000Z');
      expect(isUserOnline(threeMinAgo)).toBe(false);
    });

    it('retorna false quando last_activity = 1 day ago', () => {
      const oneDayAgo = new Date('2025-10-03T12:00:00.000Z');
      expect(isUserOnline(oneDayAgo)).toBe(false);
    });

    it('retorna false quando last_activity = null', () => {
      expect(isUserOnline(null)).toBe(false);
    });

    it('retorna false quando last_activity = undefined', () => {
      expect(isUserOnline(undefined)).toBe(false);
    });
  });

  describe('isUserAway', () => {
    it('retorna false quando last_activity = now (está online)', () => {
      const now = new Date('2025-10-04T12:00:00.000Z');
      expect(isUserAway(now)).toBe(false);
    });

    it('retorna false quando last_activity = 1 min ago (está online)', () => {
      const oneMinAgo = new Date('2025-10-04T11:59:00.000Z');
      expect(isUserAway(oneMinAgo)).toBe(false);
    });

    it('retorna true quando last_activity = 3 min ago', () => {
      const threeMinAgo = new Date('2025-10-04T11:57:00.000Z');
      expect(isUserAway(threeMinAgo)).toBe(true);
    });

    it('retorna true quando last_activity = 5 min ago', () => {
      const fiveMinAgo = new Date('2025-10-04T11:55:00.000Z');
      expect(isUserAway(fiveMinAgo)).toBe(true);
    });

    it('retorna false quando last_activity = 1 day ago (está offline)', () => {
      const oneDayAgo = new Date('2025-10-03T12:00:00.000Z');
      expect(isUserAway(oneDayAgo)).toBe(false);
    });

    it('retorna false quando last_activity = null', () => {
      expect(isUserAway(null)).toBe(false);
    });
  });

  describe('getUserStatus', () => {
    it('retorna "online" quando last_activity = now', () => {
      const now = new Date('2025-10-04T12:00:00.000Z');
      expect(getUserStatus(now)).toBe('online');
    });

    it('retorna "online" quando last_activity = 1 min ago', () => {
      const oneMinAgo = new Date('2025-10-04T11:59:00.000Z');
      expect(getUserStatus(oneMinAgo)).toBe('online');
    });

    it('retorna "away" quando last_activity = 3 min ago', () => {
      const threeMinAgo = new Date('2025-10-04T11:57:00.000Z');
      expect(getUserStatus(threeMinAgo)).toBe('away');
    });

    it('retorna "offline" quando last_activity = 1 day ago', () => {
      const oneDayAgo = new Date('2025-10-03T12:00:00.000Z');
      expect(getUserStatus(oneDayAgo)).toBe('offline');
    });

    it('retorna "offline" quando last_activity = null', () => {
      expect(getUserStatus(null)).toBe('offline');
    });

    it('retorna "offline" quando last_activity = undefined', () => {
      expect(getUserStatus(undefined)).toBe('offline');
    });

    it('retorna "online" quando last_activity está 119 segundos atrás (limite)', () => {
      const limit = new Date('2025-10-04T11:58:01.000Z');
      expect(getUserStatus(limit)).toBe('online');
    });

    it('retorna "away" quando last_activity está 121 segundos atrás', () => {
      const justPastLimit = new Date('2025-10-04T11:57:59.000Z');
      expect(getUserStatus(justPastLimit)).toBe('away');
    });
  });
});

describe('timeFormatter - formatLastSeen (pt-BR)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-10-04T15:30:00.000Z')); // 15:30 UTC
  });

  it('retorna "agora" quando last_activity < 60s', () => {
    const now = new Date('2025-10-04T15:30:00.000Z');
    expect(formatLastSeen(now)).toBe('agora');
  });

  it('retorna "agora" quando last_activity = 30s atrás', () => {
    const thirtySecsAgo = new Date('2025-10-04T15:29:30.000Z');
    expect(formatLastSeen(thirtySecsAgo)).toBe('agora');
  });

  it('retorna "há X min" quando last_activity = 1 min atrás', () => {
    const oneMinAgo = new Date('2025-10-04T15:29:00.000Z');
    expect(formatLastSeen(oneMinAgo)).toBe('há 1 min');
  });

  it('retorna "há X min" quando last_activity = 5 min atrás', () => {
    const fiveMinAgo = new Date('2025-10-04T15:25:00.000Z');
    expect(formatLastSeen(fiveMinAgo)).toBe('há 5 min');
  });

  it('retorna "há X horas" quando last_activity = 2 horas atrás (hoje)', () => {
    const twoHoursAgo = new Date('2025-10-04T13:30:00.000Z');
    expect(formatLastSeen(twoHoursAgo)).toBe('há 2 horas');
  });

  it('retorna "ontem HH:mm" quando last_activity foi ontem', () => {
    vi.setSystemTime(new Date('2025-10-04T10:00:00.000Z'));
    const yesterday = new Date('2025-10-03T18:30:00.000Z');
    const result = formatLastSeen(yesterday);
    expect(result).toMatch(/^ontem \d{2}:\d{2}$/);
  });

  it('retorna "DD/MM às HH:mm" quando last_activity foi há 2 dias', () => {
    const twoDaysAgo = new Date('2025-10-02T15:30:00.000Z');
    const result = formatLastSeen(twoDaysAgo);
    expect(result).toMatch(/^\d{2}\/\d{2} às \d{2}:\d{2}$/);
  });

  it('retorna "nunca" quando last_activity = null', () => {
    expect(formatLastSeen(null)).toBe('nunca');
  });

  it('retorna "nunca" quando last_activity = undefined', () => {
    expect(formatLastSeen(undefined)).toBe('nunca');
  });

  it('aceita string ISO como entrada', () => {
    const isoString = '2025-10-04T15:29:00.000Z';
    expect(formatLastSeen(isoString)).toBe('há 1 min');
  });
});

describe('timeFormatter - getHumanizedTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-10-04T12:00:00.000Z'));
  });

  it('retorna objeto com iso e human formatado', () => {
    const now = new Date('2025-10-04T12:00:00.000Z');
    const result = getHumanizedTime(now);

    expect(result).toHaveProperty('iso');
    expect(result).toHaveProperty('human');
    expect(result.iso).toBe(now.toISOString());
    expect(result.human).toBe('agora');
  });

  it('retorna valores padrão quando last_activity = null', () => {
    const result = getHumanizedTime(null);

    expect(result.iso).toBe('');
    expect(result.human).toBe('nunca');
  });

  it('retorna valores padrão quando last_activity = undefined', () => {
    const result = getHumanizedTime(undefined);

    expect(result.iso).toBe('');
    expect(result.human).toBe('nunca');
  });

  it('formata corretamente para 3 min atrás', () => {
    const threeMinAgo = new Date('2025-10-04T11:57:00.000Z');
    const result = getHumanizedTime(threeMinAgo);

    expect(result.iso).toBe(threeMinAgo.toISOString());
    expect(result.human).toBe('há 3 min');
  });
});

describe('timeFormatter - Privacy Masking', () => {
  describe('maskEmail', () => {
    it('mascara email curto (john@example.com)', () => {
      expect(maskEmail('john@example.com')).toBe('j***@example.com');
    });

    it('mascara email longo (joaosilva@example.com)', () => {
      expect(maskEmail('joaosilva@example.com')).toBe('j***@example.com');
    });

    it('mascara email com 2 caracteres antes do @', () => {
      expect(maskEmail('ab@example.com')).toBe('a***@example.com');
    });

    it('mascara email com 1 caractere antes do @', () => {
      expect(maskEmail('a@example.com')).toBe('a***@example.com');
    });

    it('retorna "" quando email é null', () => {
      expect(maskEmail(null)).toBe('');
    });

    it('retorna "" quando email é undefined', () => {
      expect(maskEmail(undefined)).toBe('');
    });

    it('retorna "" quando email é string vazia', () => {
      expect(maskEmail('')).toBe('');
    });

    it('preserva domínio completo', () => {
      const masked = maskEmail('user@subdomain.example.com');
      expect(masked).toContain('@subdomain.example.com');
    });
  });

  describe('maskWhatsApp', () => {
    it('mascara telefone brasileiro completo (+5511999999999)', () => {
      expect(maskWhatsApp('+5511999999999')).toBe('+55 11 9****-9999');
    });

    it('mascara telefone com 11 dígitos (5511999999999)', () => {
      expect(maskWhatsApp('5511999999999')).toBe('+55 11 9****-9999');
    });

    it('retorna número mascarado não brasileiro para formato com DDD (11 dígitos após limpar)', () => {
      // (11) 99999-9999 tem apenas 11 dígitos, sem código do país
      // A função assume que números sem 55 no início são estrangeiros
      const result = maskWhatsApp('(11) 99999-9999');
      expect(result).toMatch(/^\+\*\* \*\* \*\*\*\*-\d{4}$/);
    });

    it('retorna "" quando phone é null', () => {
      expect(maskWhatsApp(null)).toBe('');
    });

    it('retorna "" quando phone é undefined', () => {
      expect(maskWhatsApp(undefined)).toBe('');
    });

    it('retorna "" quando phone é string vazia', () => {
      expect(maskWhatsApp('')).toBe('');
    });

    it('retorna original quando telefone muito curto (< 10 dígitos)', () => {
      expect(maskWhatsApp('12345')).toBe('12345');
    });

    it('mascara números não brasileiros', () => {
      expect(maskWhatsApp('+12025551234')).toBe('+** ** ****-1234');
    });
  });
});

describe('timeFormatter - Edge Cases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-10-04T12:00:00.000Z'));
  });

  it('lida com data futura corretamente', () => {
    const future = new Date('2025-10-05T12:00:00.000Z');
    expect(getUserStatus(future)).toBe('online');
    expect(formatLastSeen(future)).toBe('agora');
  });

  it('lida com data muito antiga (> 1 ano)', () => {
    const veryOld = new Date('2024-01-01T12:00:00.000Z');
    expect(getUserStatus(veryOld)).toBe('offline');
    expect(formatLastSeen(veryOld)).toMatch(/^\d{2}\/\d{2} às \d{2}:\d{2}$/);
  });

  it('lida com timestamp como string', () => {
    const timestamp = '2025-10-04T11:59:00.000Z';
    expect(formatLastSeen(timestamp)).toBe('há 1 min');
  });

  it('lida com timestamp inválido', () => {
    expect(formatLastSeen('invalid-date')).toBe('nunca');
  });
});
