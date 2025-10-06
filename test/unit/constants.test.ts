import { describe, it, expect } from 'vitest';
import { MASS_TIMES_BY_DAY, WEEKDAY_NAMES, getMassTimesForDate } from '@shared/constants';
import { getDay } from 'date-fns';

describe('Constants', () => {
  describe('MASS_TIMES_BY_DAY', () => {
    it('should have mass times for Sunday (0)', () => {
      expect(MASS_TIMES_BY_DAY[0]).toBeDefined();
      expect(MASS_TIMES_BY_DAY[0].length).toBeGreaterThan(0);
    });

    it('should have correct time format', () => {
      const sundayMasses = MASS_TIMES_BY_DAY[0];

      sundayMasses.forEach((time) => {
        expect(time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
        expect(typeof time).toBe('string');
      });
    });

    it('should have all weekdays defined', () => {
      expect(MASS_TIMES_BY_DAY).toHaveLength(7);
      MASS_TIMES_BY_DAY.forEach((dayTimes) => {
        expect(Array.isArray(dayTimes)).toBe(true);
      });
    });
  });

  describe('WEEKDAY_NAMES', () => {
    it('should have 7 weekdays', () => {
      expect(WEEKDAY_NAMES).toHaveLength(7);
    });

    it('should start with Domingo', () => {
      expect(WEEKDAY_NAMES[0]).toBe('Domingo');
    });

    it('should end with Sábado', () => {
      expect(WEEKDAY_NAMES[6]).toBe('Sábado');
    });
  });

  describe('getMassTimesForDate', () => {
    it('should return mass times for a Sunday', () => {
      // Criar um domingo (getDay === 0)
      const sunday = new Date('2025-10-05'); // Um domingo
      expect(getDay(sunday)).toBe(0);

      const massTimes = getMassTimesForDate(sunday);
      expect(massTimes.length).toBeGreaterThan(0);
      expect(typeof massTimes[0]).toBe('string');
      expect(massTimes[0]).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('should return mass times for weekdays', () => {
      // Criar uma segunda-feira normal (não novena)
      const monday = new Date('2025-11-03'); // Segunda-feira fora de outubro
      expect(getDay(monday)).toBe(1);

      const massTimes = getMassTimesForDate(monday);
      expect(Array.isArray(massTimes)).toBe(true);
      expect(massTimes.length).toBeGreaterThanOrEqual(0);
    });

    it('should return consistent results for same date', () => {
      const date1 = new Date('2025-10-05');
      const date2 = new Date('2025-10-05');

      const times1 = getMassTimesForDate(date1);
      const times2 = getMassTimesForDate(date2);

      expect(times1).toEqual(times2);
    });

    it('should handle first Thursday special mass (19:30)', () => {
      // Primeira quinta-feira de novembro de 2025 é dia 6
      const firstThursday = new Date('2025-11-06');
      expect(getDay(firstThursday)).toBe(4);
      expect(firstThursday.getDate()).toBeLessThanOrEqual(7);

      const massTimes = getMassTimesForDate(firstThursday);
      expect(massTimes).toContain('06:30:00');
      expect(massTimes).toContain('19:30:00');
    });

    it('should handle October novena special schedule', () => {
      // Dia 22 de outubro é durante a novena (20-27)
      const novenaDay = new Date('2025-10-22');
      const dayOfWeek = getDay(novenaDay);

      const massTimes = getMassTimesForDate(novenaDay);

      // Durante a novena, segunda a sexta tem apenas 19:30
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        expect(massTimes).toEqual(['19:30:00']);
      }
      // Sábado tem apenas 19:00
      if (dayOfWeek === 6) {
        expect(massTimes).toEqual(['19:00:00']);
      }
    });
  });
});
