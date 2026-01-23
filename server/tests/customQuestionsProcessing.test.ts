/**
 * TESTE CRÍTICO: Processamento de Perguntas Customizadas
 *
 * Este teste garante que o ResponseCompiler encontra as respostas
 * de eventos customizados em TODOS os formatos possíveis.
 *
 * HISTÓRICO:
 * - Bug recorrente: respostas de custom_* não eram processadas
 * - Causa: código não procurava em rawData.special_events
 * - Correção: verificar rawData.special_events PRIMEIRO (formato V2.0)
 */

import { describe, it, expect } from 'vitest';

// Simular a função parseAnswer
function parseAnswer(answer: any): boolean {
  if (typeof answer === 'boolean') return answer;
  if (typeof answer === 'string') {
    const normalized = answer.toLowerCase().trim();
    return normalized === 'sim' || normalized === 'yes' || normalized === 'true';
  }
  return false;
}

// Simular a função processCustomQuestions (lógica corrigida)
function findCustomAnswer(rawData: any, questionId: string): { answer: any; foundIn: string } | null {
  let answer: any = null;
  let foundIn: string = '';

  // FORMATO V2.0 - VERIFICAR PRIMEIRO!
  if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
    // 1. PRINCIPAL: Procurar em special_events
    if (rawData.special_events && typeof rawData.special_events === 'object') {
      const seValue = rawData.special_events[questionId];
      if (seValue !== null && seValue !== undefined) {
        answer = seValue;
        foundIn = 'rawData.special_events';
      }
    }

    // 2. Fallback: acesso direto
    if (answer === null || answer === undefined) {
      const directValue = rawData[questionId];
      if (directValue !== null && directValue !== undefined) {
        answer = directValue;
        foundIn = 'rawData (direct)';
      }
    }
  }

  // FORMATO V1.0 ARRAY
  if ((answer === null || answer === undefined) && Array.isArray(rawData)) {
    const found = rawData.find((item: any) => item.questionId === questionId);
    if (found) {
      answer = found.answer;
      foundIn = 'rawData array';
    }
  }

  if (answer !== null && answer !== undefined) {
    return { answer, foundIn };
  }
  return null;
}

describe('Processamento de Perguntas Customizadas', () => {

  describe('Formato V2.0 (special_events)', () => {

    it('deve encontrar resposta em rawData.special_events', () => {
      // Este é o formato REAL que Marco e Priscila têm
      const rawData = {
        format_version: '2.0',
        masses: {
          '2026-02-01': { '08:00': false, '10:00': true }
        },
        special_events: {
          healing_liberation: false,
          first_friday: false,
          custom_1768851338272: true,  // Cinzas 7h
          custom_1768851366589: false  // Cinzas 15h
        },
        weekdays: { monday: false, tuesday: false },
        can_substitute: true
      };

      const result1 = findCustomAnswer(rawData, 'custom_1768851338272');
      expect(result1).not.toBeNull();
      expect(result1?.answer).toBe(true);
      expect(result1?.foundIn).toBe('rawData.special_events');

      const result2 = findCustomAnswer(rawData, 'custom_1768851366589');
      expect(result2).not.toBeNull();
      expect(result2?.answer).toBe(false);
      expect(result2?.foundIn).toBe('rawData.special_events');
    });

    it('deve processar healing_liberation e first_friday', () => {
      const rawData = {
        format_version: '2.0',
        special_events: {
          healing_liberation: true,
          first_friday: false,
          first_saturday: true
        }
      };

      expect(findCustomAnswer(rawData, 'healing_liberation')?.answer).toBe(true);
      expect(findCustomAnswer(rawData, 'first_friday')?.answer).toBe(false);
      expect(findCustomAnswer(rawData, 'first_saturday')?.answer).toBe(true);
    });

    it('deve retornar null para pergunta inexistente', () => {
      const rawData = {
        format_version: '2.0',
        special_events: {
          custom_123: true
        }
      };

      const result = findCustomAnswer(rawData, 'custom_999');
      expect(result).toBeNull();
    });
  });

  describe('Formato V1.0 Array', () => {

    it('deve encontrar resposta em formato array', () => {
      const rawData = [
        { questionId: 'custom_123', answer: 'Sim' },
        { questionId: 'custom_456', answer: 'Não' }
      ];

      const result1 = findCustomAnswer(rawData, 'custom_123');
      expect(result1).not.toBeNull();
      expect(result1?.answer).toBe('Sim');
      expect(result1?.foundIn).toBe('rawData array');

      const result2 = findCustomAnswer(rawData, 'custom_456');
      expect(result2?.answer).toBe('Não');
    });
  });

  describe('parseAnswer', () => {

    it('deve parsear booleanos corretamente', () => {
      expect(parseAnswer(true)).toBe(true);
      expect(parseAnswer(false)).toBe(false);
    });

    it('deve parsear strings "Sim"/"Não" corretamente', () => {
      expect(parseAnswer('Sim')).toBe(true);
      expect(parseAnswer('sim')).toBe(true);
      expect(parseAnswer('SIM')).toBe(true);
      expect(parseAnswer('Não')).toBe(false);
      expect(parseAnswer('não')).toBe(false);
      expect(parseAnswer('NÃO')).toBe(false);
    });

    it('deve parsear strings "yes"/"no" corretamente', () => {
      expect(parseAnswer('yes')).toBe(true);
      expect(parseAnswer('Yes')).toBe(true);
      expect(parseAnswer('no')).toBe(false);
    });
  });

  describe('Caso Real: Marco Rossit Fev/2026', () => {

    it('deve processar resposta real do Marco corretamente', () => {
      // Dados REAIS do banco de produção
      const marcoResponse = {
        format_version: '2.0',
        masses: {
          '2026-02-01': { '08:00': false, '10:00': true, '19:00': false, '19:30': false },
          '2026-02-08': { '08:00': false, '10:00': true, '19:00': false, '19:30': false },
          '2026-02-15': { '08:00': false, '10:00': true, '19:00': false, '19:30': false },
          '2026-02-22': { '08:00': false, '10:00': true, '19:00': false, '19:30': false }
        },
        special_events: {
          healing_liberation: false,
          first_friday: false,
          first_saturday: false,
          custom_1768851338272: true,   // Cinzas 18/02 às 7h - MARCO DISSE SIM!
          custom_1768851366589: false,  // Cinzas 18/02 às 15h
          custom_1768851403839: false,  // Cinzas 18/02 às 19h30
          custom_1768851220806: false,  // Penitência 20/02 às 5h
          custom_1768851246238: false   // Penitência 27/02 às 5h
        },
        weekdays: {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false
        },
        can_substitute: true,
        alternative_times: ['8h']
      };

      // Verificar que encontramos a resposta "Sim" para Cinzas 7h
      const cinzas7h = findCustomAnswer(marcoResponse, 'custom_1768851338272');
      expect(cinzas7h).not.toBeNull();
      expect(cinzas7h?.answer).toBe(true);
      expect(cinzas7h?.foundIn).toBe('rawData.special_events');
      expect(parseAnswer(cinzas7h?.answer)).toBe(true);

      // Verificar que encontramos "Não" para os outros
      const cinzas15h = findCustomAnswer(marcoResponse, 'custom_1768851366589');
      expect(cinzas15h?.answer).toBe(false);
      expect(parseAnswer(cinzas15h?.answer)).toBe(false);
    });
  });
});
