import { describe, it, expect } from 'vitest';
import {
  generateCertificatePDF,
  generateCertificateNumber,
  generateVerificationCode,
  type CertificateData
} from '../../../server/utils/certificateGenerator';

describe('CertificateGenerator', () => {
  describe('generateCertificatePDF', () => {
    const sampleCertificateData: CertificateData = {
      certificateNumber: 'MESC-2026-00001',
      verificationCode: 'A3B9X2',
      recipientName: 'Joao da Silva',
      trackTitle: 'Formacao Liturgica Basica',
      trackCategory: 'liturgia',
      totalLessons: 10,
      totalHours: 5,
      issuedAt: new Date('2026-01-25T10:00:00Z'),
      issuedBy: 'Maria Coordenadora'
    };

    it('should generate a valid PDF buffer', () => {
      const result = generateCertificatePDF(sampleCertificateData);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate a PDF with correct header', () => {
      const result = generateCertificatePDF(sampleCertificateData);

      // PDF files start with %PDF
      expect(result.toString('utf8', 0, 4)).toBe('%PDF');
    });

    it('should handle different track categories', () => {
      const categories: Array<'liturgia' | 'espiritualidade' | 'pratica'> = [
        'liturgia',
        'espiritualidade',
        'pratica'
      ];

      for (const category of categories) {
        const data: CertificateData = {
          ...sampleCertificateData,
          trackCategory: category
        };

        const result = generateCertificatePDF(data);
        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBeGreaterThan(0);
      }
    });

    it('should generate certificate without issuer name', () => {
      const dataWithoutIssuer: CertificateData = {
        ...sampleCertificateData,
        issuedBy: undefined
      };

      const result = generateCertificatePDF(dataWithoutIssuer);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle special characters in recipient name', () => {
      const dataWithSpecialChars: CertificateData = {
        ...sampleCertificateData,
        recipientName: 'Jose da Conceicao Oliveira Santos'
      };

      const result = generateCertificatePDF(dataWithSpecialChars);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle long track titles', () => {
      const dataWithLongTitle: CertificateData = {
        ...sampleCertificateData,
        trackTitle: 'Formacao Avancada em Liturgia e Praticas Pastorais para Ministros'
      };

      const result = generateCertificatePDF(dataWithLongTitle);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('generateCertificateNumber', () => {
    it('should generate certificate number in correct format', () => {
      const result = generateCertificateNumber(1);

      expect(result).toMatch(/^MESC-\d{4}-\d{5}$/);
    });

    it('should include current year', () => {
      const result = generateCertificateNumber(1);
      const currentYear = new Date().getFullYear();

      expect(result).toContain(`MESC-${currentYear}`);
    });

    it('should pad sequence number with zeros', () => {
      expect(generateCertificateNumber(1)).toContain('00001');
      expect(generateCertificateNumber(42)).toContain('00042');
      expect(generateCertificateNumber(12345)).toContain('12345');
    });

    it('should handle large sequence numbers', () => {
      const result = generateCertificateNumber(99999);

      expect(result).toMatch(/^MESC-\d{4}-99999$/);
    });
  });

  describe('generateVerificationCode', () => {
    it('should generate a 6-character code', () => {
      const result = generateVerificationCode();

      expect(result).toHaveLength(6);
    });

    it('should only contain alphanumeric characters', () => {
      const result = generateVerificationCode();

      expect(result).toMatch(/^[A-Z0-9]+$/);
    });

    it('should not contain confusing characters (0, O, 1, I)', () => {
      // Generate multiple codes to have a good sample
      for (let i = 0; i < 100; i++) {
        const result = generateVerificationCode();

        expect(result).not.toContain('0');
        expect(result).not.toContain('O');
        expect(result).not.toContain('1');
        expect(result).not.toContain('I');
      }
    });

    it('should generate unique codes', () => {
      const codes = new Set<string>();

      for (let i = 0; i < 100; i++) {
        codes.add(generateVerificationCode());
      }

      // With 6 chars from 32 possible, collision should be very rare
      expect(codes.size).toBeGreaterThan(95);
    });
  });
});
