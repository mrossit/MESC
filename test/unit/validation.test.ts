import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Data Validation', () => {
  describe('Email Validation', () => {
    const emailSchema = z.string().email();

    it('should validate correct email formats', () => {
      expect(() => emailSchema.parse('test@example.com')).not.toThrow();
      expect(() => emailSchema.parse('user.name@domain.co.uk')).not.toThrow();
      expect(() => emailSchema.parse('user+tag@example.com')).not.toThrow();
    });

    it('should reject invalid email formats', () => {
      expect(() => emailSchema.parse('notanemail')).toThrow();
      expect(() => emailSchema.parse('@example.com')).toThrow();
      expect(() => emailSchema.parse('user@')).toThrow();
      expect(() => emailSchema.parse('')).toThrow();
    });
  });

  describe('Password Validation', () => {
    const passwordSchema = z.string().min(6);

    it('should accept passwords with minimum length', () => {
      expect(() => passwordSchema.parse('123456')).not.toThrow();
      expect(() => passwordSchema.parse('abcdefgh')).not.toThrow();
    });

    it('should reject passwords too short', () => {
      expect(() => passwordSchema.parse('12345')).toThrow();
      expect(() => passwordSchema.parse('abc')).toThrow();
      expect(() => passwordSchema.parse('')).toThrow();
    });
  });

  describe('User Data Validation', () => {
    const userSchema = z.object({
      email: z.string().email(),
      name: z.string().min(1),
      role: z.enum(['gestor', 'coordenador', 'ministro']),
      status: z.enum(['active', 'inactive', 'pending']),
    });

    it('should validate complete user data', () => {
      const validUser = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'ministro' as const,
        status: 'active' as const,
      };

      expect(() => userSchema.parse(validUser)).not.toThrow();
    });

    it('should reject invalid role', () => {
      const invalidUser = {
        email: 'test@example.com',
        name: 'Test User',
        role: 'invalid',
        status: 'active',
      };

      expect(() => userSchema.parse(invalidUser)).toThrow();
    });

    it('should reject missing required fields', () => {
      const incompleteUser = {
        email: 'test@example.com',
        // name missing
        role: 'ministro',
        status: 'active',
      };

      expect(() => userSchema.parse(incompleteUser)).toThrow();
    });
  });

  describe('Schedule Data Validation', () => {
    const scheduleSchema = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
      ministerId: z.string().uuid(),
    });

    it('should validate correct schedule format', () => {
      const validSchedule = {
        date: '2025-10-05',
        time: '08:00:00',
        ministerId: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(() => scheduleSchema.parse(validSchedule)).not.toThrow();
    });

    it('should reject invalid date format', () => {
      const invalidSchedule = {
        date: '05/10/2025', // Formato errado
        time: '08:00:00',
        ministerId: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(() => scheduleSchema.parse(invalidSchedule)).toThrow();
    });

    it('should reject invalid time format', () => {
      const invalidSchedule = {
        date: '2025-10-05',
        time: '8:00', // Formato errado
        ministerId: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(() => scheduleSchema.parse(invalidSchedule)).toThrow();
    });
  });
});
