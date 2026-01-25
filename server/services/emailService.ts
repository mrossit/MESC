/**
 * Email Service for MESC
 *
 * Supports multiple email providers:
 * - Resend (recommended for simplicity)
 * - SendGrid
 * - SMTP (Nodemailer)
 *
 * Configuration via environment variables:
 * - EMAIL_PROVIDER: 'resend' | 'sendgrid' | 'smtp' | 'console' (default for dev)
 * - EMAIL_FROM: Sender email address
 * - RESEND_API_KEY: For Resend provider
 * - SENDGRID_API_KEY: For SendGrid provider
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS: For SMTP provider
 */

import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

type EmailProvider = 'resend' | 'sendgrid' | 'smtp' | 'console';

/**
 * Get the configured email provider
 */
function getProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER?.toLowerCase() as EmailProvider;

  // Validate provider configuration
  if (provider === 'resend' && !process.env.RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured, falling back to console');
    return 'console';
  }

  if (provider === 'sendgrid' && !process.env.SENDGRID_API_KEY) {
    logger.warn('SENDGRID_API_KEY not configured, falling back to console');
    return 'console';
  }

  if (provider === 'smtp' && (!process.env.SMTP_HOST || !process.env.SMTP_USER)) {
    logger.warn('SMTP not fully configured, falling back to console');
    return 'console';
  }

  // Default to console in development, warn in production
  if (!provider || provider === 'console') {
    if (process.env.NODE_ENV === 'production') {
      logger.warn('No email provider configured for production!');
    }
    return 'console';
  }

  return provider;
}

/**
 * Get sender email address
 */
function getFromEmail(): string {
  return process.env.EMAIL_FROM || 'noreply@mesc.app';
}

/**
 * Send email via Resend
 */
async function sendViaResend(options: EmailOptions): Promise<EmailResult> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: getFromEmail(),
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send email via Resend');
    }

    return { success: true, messageId: data.id };
  } catch (error: any) {
    logger.error('Resend email error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(options: EmailOptions): Promise<EmailResult> {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: options.to }] }],
        from: { email: getFromEmail() },
        subject: options.subject,
        content: [
          ...(options.text ? [{ type: 'text/plain', value: options.text }] : []),
          ...(options.html ? [{ type: 'text/html', value: options.html }] : []),
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to send email via SendGrid');
    }

    return { success: true, messageId: response.headers.get('x-message-id') || undefined };
  } catch (error: any) {
    logger.error('SendGrid email error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send email via SMTP (Nodemailer)
 */
async function sendViaSMTP(options: EmailOptions): Promise<EmailResult> {
  try {
    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: getFromEmail(),
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    logger.error('SMTP email error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Console logging for development
 */
async function sendViaConsole(options: EmailOptions): Promise<EmailResult> {
  console.log('============================================');
  console.log('EMAIL (Console Mode - Not Actually Sent)');
  console.log('============================================');
  console.log(`To: ${options.to}`);
  console.log(`Subject: ${options.subject}`);
  console.log('--------------------------------------------');
  console.log(options.text || options.html);
  console.log('============================================');

  return { success: true, messageId: `console-${Date.now()}` };
}

/**
 * Send email using configured provider
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const provider = getProvider();

  logger.info(`Sending email via ${provider}`, { to: options.to, subject: options.subject });

  switch (provider) {
    case 'resend':
      return sendViaResend(options);
    case 'sendgrid':
      return sendViaSendGrid(options);
    case 'smtp':
      return sendViaSMTP(options);
    case 'console':
    default:
      return sendViaConsole(options);
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  userName: string,
  tempPassword: string
): Promise<EmailResult> {
  const subject = 'MESC - Redefinição de Senha';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .password-box { background: #fff; border: 2px dashed #4F46E5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
    .password { font-size: 24px; font-family: monospace; color: #4F46E5; letter-spacing: 2px; }
    .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #6B7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Ministros da Sagrada Comunhao</h1>
    </div>
    <div class="content">
      <p>Ola, <strong>${userName}</strong>!</p>

      <p>Recebemos uma solicitacao para redefinir sua senha. Aqui esta sua senha temporaria:</p>

      <div class="password-box">
        <p style="margin: 0 0 10px 0; color: #6B7280;">Sua senha temporaria:</p>
        <p class="password">${tempPassword}</p>
      </div>

      <div class="warning">
        <strong>Importante:</strong>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>Esta senha e temporaria e expira em 24 horas</li>
          <li>Voce sera solicitado a criar uma nova senha no primeiro login</li>
          <li>Se voce nao solicitou esta redefinicao, ignore este email</li>
        </ul>
      </div>

      <p>Acesse o sistema em: <a href="${process.env.APP_URL || 'https://mesc.app'}">${process.env.APP_URL || 'https://mesc.app'}</a></p>

      <p>Paz e bem,<br>Equipe MESC</p>
    </div>
    <div class="footer">
      <p>Este e um email automatico. Por favor, nao responda.</p>
      <p>Santuario Sao Judas Tadeu - Sorocaba/SP</p>
    </div>
  </div>
</body>
</html>
`;

  const text = `
Ola, ${userName}!

Recebemos uma solicitacao para redefinir sua senha.

Sua senha temporaria: ${tempPassword}

IMPORTANTE:
- Esta senha e temporaria e expira em 24 horas
- Voce sera solicitado a criar uma nova senha no primeiro login
- Se voce nao solicitou esta redefinicao, ignore este email

Acesse o sistema em: ${process.env.APP_URL || 'https://mesc.app'}

Paz e bem,
Equipe MESC

---
Santuario Sao Judas Tadeu - Sorocaba/SP
`;

  return sendEmail({ to, subject, html, text });
}

/**
 * Send schedule notification email
 */
export async function sendScheduleNotificationEmail(
  to: string,
  userName: string,
  scheduleDate: string,
  scheduleTime: string,
  location: string
): Promise<EmailResult> {
  const subject = 'MESC - Nova Escala Publicada';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .schedule-box { background: #fff; border: 1px solid #E5E7EB; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .schedule-item { display: flex; margin: 10px 0; }
    .schedule-label { font-weight: bold; width: 100px; }
    .footer { text-align: center; color: #6B7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nova Escala</h1>
    </div>
    <div class="content">
      <p>Ola, <strong>${userName}</strong>!</p>

      <p>Voce foi escalado para a seguinte missa:</p>

      <div class="schedule-box">
        <div class="schedule-item">
          <span class="schedule-label">Data:</span>
          <span>${scheduleDate}</span>
        </div>
        <div class="schedule-item">
          <span class="schedule-label">Horario:</span>
          <span>${scheduleTime}</span>
        </div>
        <div class="schedule-item">
          <span class="schedule-label">Local:</span>
          <span>${location}</span>
        </div>
      </div>

      <p>Por favor, confirme sua presenca no sistema ou entre em contato com a coordenacao caso nao possa comparecer.</p>

      <p>Paz e bem,<br>Equipe MESC</p>
    </div>
    <div class="footer">
      <p>Santuario Sao Judas Tadeu - Sorocaba/SP</p>
    </div>
  </div>
</body>
</html>
`;

  const text = `
Ola, ${userName}!

Voce foi escalado para a seguinte missa:

Data: ${scheduleDate}
Horario: ${scheduleTime}
Local: ${location}

Por favor, confirme sua presenca no sistema ou entre em contato com a coordenacao caso nao possa comparecer.

Paz e bem,
Equipe MESC
`;

  return sendEmail({ to, subject, html, text });
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  const provider = getProvider();
  return provider !== 'console' || process.env.NODE_ENV === 'development';
}

/**
 * Get current email provider name
 */
export function getEmailProviderName(): string {
  return getProvider();
}
