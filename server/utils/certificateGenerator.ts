/**
 * Certificate Generator for MESC Formation System
 *
 * Generates beautiful PDF certificates for ministers who complete formation tracks.
 */

import { jsPDF } from 'jspdf';

export interface CertificateData {
  certificateNumber: string;
  verificationCode: string;
  recipientName: string;
  trackTitle: string;
  trackCategory: 'liturgia' | 'espiritualidade' | 'pratica';
  totalLessons: number;
  totalHours: number;
  issuedAt: Date;
  issuedBy?: string;
  validUntil?: Date;
}

// Category colors and titles
const CATEGORY_CONFIG = {
  liturgia: {
    color: '#8B4513', // Saddle brown (liturgical)
    accent: '#D4AF37', // Gold
    title: 'Formação Litúrgica',
    icon: '✝'
  },
  espiritualidade: {
    color: '#4A3728', // Dark brown
    accent: '#C0A080', // Warm tan
    title: 'Formação Espiritual',
    icon: '🕊'
  },
  pratica: {
    color: '#5C4033', // Brown
    accent: '#B8860B', // Dark golden rod
    title: 'Formação Pastoral',
    icon: '🤲'
  }
};

/**
 * Generate a PDF certificate
 */
export function generateCertificatePDF(data: CertificateData): Buffer {
  // Create landscape A4 PDF
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const config = CATEGORY_CONFIG[data.trackCategory];

  // Background
  doc.setFillColor(252, 250, 245); // Cream background
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative border
  drawBorder(doc, config.color, config.accent);

  // Header decoration
  drawHeaderDecoration(doc, config.color);

  // Title: "CERTIFICADO"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(config.color);
  doc.text('CERTIFICADO', pageWidth / 2, 45, { align: 'center' });

  // Subtitle: Track category
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text(config.title.toUpperCase(), pageWidth / 2, 55, { align: 'center' });

  // Decorative line
  doc.setDrawColor(config.accent);
  doc.setLineWidth(0.5);
  doc.line(80, 60, 217, 60);

  // "Certificamos que" text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text('Certificamos que', pageWidth / 2, 75, { align: 'center' });

  // Recipient name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(config.color);
  doc.text(data.recipientName, pageWidth / 2, 90, { align: 'center' });

  // Decorative line under name
  const nameWidth = doc.getTextWidth(data.recipientName);
  doc.setDrawColor(config.accent);
  doc.setLineWidth(0.3);
  doc.line((pageWidth - nameWidth) / 2 - 10, 94, (pageWidth + nameWidth) / 2 + 10, 94);

  // Completion text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text('concluiu com êxito a trilha de formação', pageWidth / 2, 108, { align: 'center' });

  // Track title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(config.color);
  doc.text(`"${data.trackTitle}"`, pageWidth / 2, 120, { align: 'center' });

  // Details text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);

  const detailsText = `completando ${data.totalLessons} ${data.totalLessons === 1 ? 'lição' : 'lições'} ` +
    `com carga horária total de ${data.totalHours} ${data.totalHours === 1 ? 'hora' : 'horas'}.`;
  doc.text(detailsText, pageWidth / 2, 132, { align: 'center' });

  // Ministry context
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(
    'Ministério Extraordinário da Sagrada Comunhão - Santuário São Judas Tadeu',
    pageWidth / 2,
    142,
    { align: 'center' }
  );

  // Date and location
  const issuedDate = formatDate(data.issuedAt);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(`Sorocaba/SP, ${issuedDate}`, pageWidth / 2, 155, { align: 'center' });

  // Signature line
  if (data.issuedBy) {
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.line(pageWidth / 2 - 40, 172, pageWidth / 2 + 40, 172);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(data.issuedBy, pageWidth / 2, 178, { align: 'center' });
    doc.text('Coordenador(a)', pageWidth / 2, 183, { align: 'center' });
  }

  // Footer with certificate number and verification code
  drawFooter(doc, data.certificateNumber, data.verificationCode, config.color);

  // Convert to buffer
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}

/**
 * Draw decorative border
 */
function drawBorder(doc: jsPDF, mainColor: string, accentColor: string): void {
  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 8;
  const innerMargin = 12;

  // Outer border
  doc.setDrawColor(mainColor);
  doc.setLineWidth(2);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  // Inner decorative border
  doc.setDrawColor(accentColor);
  doc.setLineWidth(0.5);
  doc.rect(innerMargin, innerMargin, pageWidth - innerMargin * 2, pageHeight - innerMargin * 2);

  // Corner decorations
  const corners = [
    { x: margin + 3, y: margin + 3 },
    { x: pageWidth - margin - 3, y: margin + 3 },
    { x: margin + 3, y: pageHeight - margin - 3 },
    { x: pageWidth - margin - 3, y: pageHeight - margin - 3 }
  ];

  doc.setFillColor(accentColor);
  corners.forEach(corner => {
    doc.circle(corner.x, corner.y, 2, 'F');
  });
}

/**
 * Draw header decoration
 */
function drawHeaderDecoration(doc: jsPDF, color: string): void {
  const pageWidth = 297;

  // Decorative cross or symbol at top
  doc.setDrawColor(color);
  doc.setLineWidth(1);

  // Simple cross design
  const centerX = pageWidth / 2;
  const topY = 22;

  doc.line(centerX, topY - 5, centerX, topY + 5);
  doc.line(centerX - 5, topY, centerX + 5, topY);
}

/**
 * Draw footer with certificate info
 */
function drawFooter(
  doc: jsPDF,
  certificateNumber: string,
  verificationCode: string,
  color: string
): void {
  const pageWidth = 297;
  const pageHeight = 210;

  // Certificate number (left)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Certificado N: ${certificateNumber}`, 20, pageHeight - 15);

  // Verification code (right)
  doc.text(`Verificar em: mesc.app/certificado/${verificationCode}`, pageWidth - 20, pageHeight - 15, {
    align: 'right'
  });

  // QR-like verification hint (center)
  doc.setFontSize(7);
  doc.text(`Codigo de Verificacao: ${verificationCode}`, pageWidth / 2, pageHeight - 15, {
    align: 'center'
  });
}

/**
 * Format date in Portuguese
 */
function formatDate(date: Date): string {
  const months = [
    'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} de ${month} de ${year}`;
}

/**
 * Generate a unique certificate number
 * Format: MESC-YYYY-NNNNN (e.g., MESC-2026-00001)
 */
export function generateCertificateNumber(sequenceNumber: number): string {
  const year = new Date().getFullYear();
  const paddedNumber = sequenceNumber.toString().padStart(5, '0');
  return `MESC-${year}-${paddedNumber}`;
}

/**
 * Generate a verification code
 * Format: 6 character alphanumeric (e.g., A3B9X2)
 */
export function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0, O, 1, I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
