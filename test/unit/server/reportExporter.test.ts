import { describe, it, expect } from 'vitest';
import {
  exportToExcel,
  exportToPDF,
  exportToCSV,
  getMimeType,
  getFileExtension,
  type ReportData
} from '../../../server/utils/reportExporter';

describe('ReportExporter', () => {
  const sampleReportData: ReportData = {
    title: 'Test Report',
    subtitle: 'Test Subtitle',
    generatedAt: '25/01/2026 10:30',
    period: '01/01/2026 a 31/01/2026',
    headers: ['Nome', 'Email', 'Valor'],
    rows: [
      ['João Silva', 'joao@example.com', 100],
      ['Maria Santos', 'maria@example.com', 200],
      ['Pedro Oliveira', 'pedro@example.com', 150]
    ],
    summary: [
      { label: 'Total de Registros', value: 3 },
      { label: 'Soma Total', value: 450 }
    ]
  };

  const minimalReportData: ReportData = {
    title: 'Minimal Report',
    generatedAt: '25/01/2026',
    headers: ['Col1', 'Col2'],
    rows: [['A', 'B']]
  };

  describe('exportToExcel', () => {
    it('should generate a valid Excel buffer', () => {
      const result = exportToExcel(sampleReportData);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle minimal report data', () => {
      const result = exportToExcel(minimalReportData);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty rows', () => {
      const emptyData: ReportData = {
        ...minimalReportData,
        rows: []
      };

      const result = exportToExcel(emptyData);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle special characters in data', () => {
      const specialData: ReportData = {
        ...minimalReportData,
        rows: [
          ['Café & Chá', 'Preço: R$10,00'],
          ['Açúcar "Especial"', "Nome's Test"]
        ]
      };

      const result = exportToExcel(specialData);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('exportToPDF', () => {
    it('should generate a valid PDF buffer', () => {
      const result = exportToPDF(sampleReportData);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      // PDF files start with %PDF
      expect(result.toString('utf8', 0, 4)).toBe('%PDF');
    });

    it('should handle minimal report data', () => {
      const result = exportToPDF(minimalReportData);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString('utf8', 0, 4)).toBe('%PDF');
    });

    it('should handle report without summary', () => {
      const noSummaryData: ReportData = {
        ...sampleReportData,
        summary: undefined
      };

      const result = exportToPDF(noSummaryData);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle report without subtitle and period', () => {
      const result = exportToPDF(minimalReportData);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle large datasets', () => {
      const largeData: ReportData = {
        ...sampleReportData,
        rows: Array(100).fill(null).map((_, i) => [
          `User ${i}`,
          `user${i}@example.com`,
          i * 10
        ])
      };

      const result = exportToPDF(largeData);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('exportToCSV', () => {
    it('should generate valid CSV string with BOM', () => {
      const result = exportToCSV(sampleReportData);

      expect(typeof result).toBe('string');
      // Check for UTF-8 BOM
      expect(result.charCodeAt(0)).toBe(0xFEFF);
    });

    it('should include title as comment', () => {
      const result = exportToCSV(sampleReportData);

      expect(result).toContain('# Test Report');
    });

    it('should include subtitle if present', () => {
      const result = exportToCSV(sampleReportData);

      expect(result).toContain('# Test Subtitle');
    });

    it('should include headers', () => {
      const result = exportToCSV(sampleReportData);

      expect(result).toContain('"Nome","Email","Valor"');
    });

    it('should include data rows', () => {
      const result = exportToCSV(sampleReportData);

      expect(result).toContain('João Silva');
      expect(result).toContain('joao@example.com');
      expect(result).toContain('100');
    });

    it('should escape commas in values', () => {
      const dataWithCommas: ReportData = {
        ...minimalReportData,
        rows: [['Hello, World', 'Test']]
      };

      const result = exportToCSV(dataWithCommas);
      expect(result).toContain('"Hello, World"');
    });

    it('should escape quotes in values', () => {
      const dataWithQuotes: ReportData = {
        ...minimalReportData,
        rows: [['He said "Hello"', 'Test']]
      };

      const result = exportToCSV(dataWithQuotes);
      expect(result).toContain('He said ""Hello""');
    });

    it('should handle newlines in values', () => {
      const dataWithNewlines: ReportData = {
        ...minimalReportData,
        rows: [['Line1\nLine2', 'Test']]
      };

      const result = exportToCSV(dataWithNewlines);
      expect(result).toContain('"Line1\nLine2"');
    });

    it('should include summary if present', () => {
      const result = exportToCSV(sampleReportData);

      expect(result).toContain('# RESUMO');
      expect(result).toContain('Total de Registros: 3');
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME type for xlsx', () => {
      expect(getMimeType('xlsx')).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    });

    it('should return correct MIME type for pdf', () => {
      expect(getMimeType('pdf')).toBe('application/pdf');
    });

    it('should return correct MIME type for csv', () => {
      expect(getMimeType('csv')).toBe('text/csv; charset=utf-8');
    });

    it('should return octet-stream for unknown formats', () => {
      expect(getMimeType('unknown' as any)).toBe('application/octet-stream');
    });
  });

  describe('getFileExtension', () => {
    it('should return xlsx for xlsx format', () => {
      expect(getFileExtension('xlsx')).toBe('xlsx');
    });

    it('should return pdf for pdf format', () => {
      expect(getFileExtension('pdf')).toBe('pdf');
    });

    it('should return csv for csv format', () => {
      expect(getFileExtension('csv')).toBe('csv');
    });
  });
});
