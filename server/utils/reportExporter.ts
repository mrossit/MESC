import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ExportFormat = 'xlsx' | 'pdf' | 'csv';

export interface ReportData {
  title: string;
  subtitle?: string;
  generatedAt: string;
  period?: string;
  headers: string[];
  rows: (string | number)[][];
  summary?: { label: string; value: string | number }[];
}

/**
 * Export report data to Excel format
 */
export function exportToExcel(data: ReportData): Buffer {
  const workbook = XLSX.utils.book_new();

  // Create header rows
  const wsData: (string | number)[][] = [];

  // Title and metadata
  wsData.push([data.title]);
  if (data.subtitle) wsData.push([data.subtitle]);
  wsData.push([`Gerado em: ${data.generatedAt}`]);
  if (data.period) wsData.push([`Período: ${data.period}`]);
  wsData.push([]); // Empty row

  // Summary section if exists
  if (data.summary && data.summary.length > 0) {
    wsData.push(['RESUMO']);
    data.summary.forEach(item => {
      wsData.push([item.label, item.value]);
    });
    wsData.push([]); // Empty row
  }

  // Data headers
  wsData.push(data.headers);

  // Data rows
  data.rows.forEach(row => {
    wsData.push(row);
  });

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  const colWidths = data.headers.map((header, i) => {
    const maxLength = Math.max(
      header.length,
      ...data.rows.map(row => String(row[i] || '').length)
    );
    return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
  });
  worksheet['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

/**
 * Export report data to PDF format
 */
export function exportToPDF(data: ReportData): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.title, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Subtitle
  if (data.subtitle) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(data.subtitle, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 6;
  }

  // Metadata
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${data.generatedAt}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 4;

  if (data.period) {
    doc.text(`Período: ${data.period}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 4;
  }

  yPosition += 6;

  // Summary section
  if (data.summary && data.summary.length > 0) {
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo', 14, yPosition);
    yPosition += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    data.summary.forEach(item => {
      doc.text(`${item.label}: ${item.value}`, 14, yPosition);
      yPosition += 5;
    });
    yPosition += 6;
  }

  // Data table
  if (data.rows.length > 0) {
    autoTable(doc, {
      head: [data.headers],
      body: data.rows.map(row => row.map(cell => String(cell))),
      startY: yPosition,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [180, 115, 51], // Bronze/copper color
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [250, 248, 243], // Light cream
      },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `MESC - Santuário São Judas Tadeu | Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Return as buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

/**
 * Export report data to CSV format
 */
export function exportToCSV(data: ReportData): string {
  const lines: string[] = [];

  // BOM for UTF-8 Excel compatibility
  const BOM = '\uFEFF';

  // Title and metadata as comments
  lines.push(`# ${data.title}`);
  if (data.subtitle) lines.push(`# ${data.subtitle}`);
  lines.push(`# Gerado em: ${data.generatedAt}`);
  if (data.period) lines.push(`# Período: ${data.period}`);
  lines.push('');

  // Summary
  if (data.summary && data.summary.length > 0) {
    lines.push('# RESUMO');
    data.summary.forEach(item => {
      lines.push(`# ${item.label}: ${item.value}`);
    });
    lines.push('');
  }

  // Headers
  lines.push(data.headers.map(h => `"${h}"`).join(','));

  // Data rows
  data.rows.forEach(row => {
    lines.push(row.map(cell => {
      const value = String(cell);
      // Escape quotes and wrap in quotes if contains comma or quotes
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(','));
  });

  return BOM + lines.join('\n');
}

/**
 * Get MIME type for export format
 */
export function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'pdf':
      return 'application/pdf';
    case 'csv':
      return 'text/csv; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Get file extension for export format
 */
export function getFileExtension(format: ExportFormat): string {
  return format;
}
