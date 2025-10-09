/**
 * Middleware de Auditoria (LGPD Compliance)
 *
 * Registra ações sensíveis para fins de auditoria e compliance
 * LGPD Art. 37: Controlador deve manter registro das operações de tratamento de dados
 *
 * Uso:
 *   import { auditLog } from './middleware/auditLogger';
 *
 *   app.delete('/api/users/:id',
 *     authenticateToken,
 *     auditLog('USER_DELETE'),
 *     async (req, res) => { ... }
 *   );
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { activityLogs } from '@shared/schema';
import { AuthRequest } from '../auth';
import { logger } from '../utils/logger';

/**
 * Tipos de ações auditáveis
 */
export enum AuditAction {
  // Autenticação
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE = 'PASSWORD_RESET_COMPLETE',

  // Usuários (CRUD)
  USER_CREATE = 'USER_CREATE',
  USER_READ = 'USER_READ',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  USER_STATUS_CHANGE = 'USER_STATUS_CHANGE',
  USER_ROLE_CHANGE = 'USER_ROLE_CHANGE',

  // Dados Pessoais (LGPD)
  PERSONAL_DATA_ACCESS = 'PERSONAL_DATA_ACCESS',
  PERSONAL_DATA_EXPORT = 'PERSONAL_DATA_EXPORT',
  PERSONAL_DATA_UPDATE = 'PERSONAL_DATA_UPDATE',
  PERSONAL_DATA_DELETE = 'PERSONAL_DATA_DELETE',

  // Dados Religiosos (LGPD Art. 11)
  RELIGIOUS_DATA_ACCESS = 'RELIGIOUS_DATA_ACCESS',
  RELIGIOUS_DATA_UPDATE = 'RELIGIOUS_DATA_UPDATE',

  // Escalas
  SCHEDULE_CREATE = 'SCHEDULE_CREATE',
  SCHEDULE_UPDATE = 'SCHEDULE_UPDATE',
  SCHEDULE_DELETE = 'SCHEDULE_DELETE',
  SCHEDULE_ASSIGN = 'SCHEDULE_ASSIGN',

  // Substituições
  SUBSTITUTION_REQUEST = 'SUBSTITUTION_REQUEST',
  SUBSTITUTION_APPROVE = 'SUBSTITUTION_APPROVE',
  SUBSTITUTION_REJECT = 'SUBSTITUTION_REJECT',

  // Configurações
  CONFIG_UPDATE = 'CONFIG_UPDATE',
  MASS_TIME_UPDATE = 'MASS_TIME_UPDATE',

  // Segurança
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CORS_BLOCKED = 'CORS_BLOCKED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  FORBIDDEN_ACCESS = 'FORBIDDEN_ACCESS'
}

/**
 * Interface para metadata de auditoria
 */
interface AuditMetadata {
  userId?: string;
  targetUserId?: string;
  targetResource?: string;
  resourceId?: string;
  changes?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: any;
}

/**
 * Sanitiza dados sensíveis antes de salvar no log de auditoria
 */
function sanitizeAuditData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password',
    'passwordHash',
    'currentPassword',
    'newPassword',
    'token',
    'jwt',
    'secret',
    'apiKey',
    'privateKey'
  ];

  const sanitized: any = {};

  for (const key of Object.keys(data)) {
    if (sensitiveFields.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      sanitized[key] = sanitizeAuditData(data[key]);
    } else {
      sanitized[key] = data[key];
    }
  }

  return sanitized;
}

/**
 * Registra uma ação de auditoria
 */
export async function logAudit(
  action: AuditAction | string,
  metadata: AuditMetadata = {}
): Promise<void> {
  try {
    const sanitizedMetadata = sanitizeAuditData(metadata);

    // Log no console (Winston)
    logger.info(`[AUDIT] ${action}`, sanitizedMetadata);

    // Salvar no banco de dados (activity_logs)
    await db.insert(activityLogs).values({
      userId: metadata.userId || null,
      action,
      details: JSON.stringify(sanitizedMetadata),
      ipAddress: metadata.ipAddress || null,
      userAgent: metadata.userAgent || null,
      createdAt: new Date()
    });
  } catch (error) {
    // Não falhar a requisição se o log de auditoria falhar
    logger.error('[AUDIT] Failed to log audit entry', { error, action });
  }
}

/**
 * Middleware para auditoria automática de rotas
 *
 * @param action - Ação a ser registrada
 * @param extractMetadata - Função para extrair metadata customizada da requisição
 *
 * @example
 * app.delete('/api/users/:id',
 *   authenticateToken,
 *   auditLog('USER_DELETE', (req) => ({ targetUserId: req.params.id })),
 *   async (req, res) => { ... }
 * );
 */
export function auditLog(
  action: AuditAction | string,
  extractMetadata?: (req: AuthRequest) => Record<string, any>
) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Extrair metadata básica
    const baseMetadata: AuditMetadata = {
      userId: req.user?.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      method: req.method,
      path: req.path
    };

    // Extrair metadata customizada se fornecida
    const customMetadata = extractMetadata ? extractMetadata(req) : {};

    // Registrar quando a resposta terminar
    res.on('finish', async () => {
      const duration = Date.now() - startTime;

      const fullMetadata: AuditMetadata = {
        ...baseMetadata,
        ...customMetadata,
        statusCode: res.statusCode,
        duration
      };

      // Só registrar se foi bem-sucedido (2xx ou 3xx)
      if (res.statusCode < 400) {
        await logAudit(action, fullMetadata);
      }
    });

    next();
  };
}

/**
 * Middleware para auditoria de acesso a dados pessoais (LGPD)
 */
export function auditPersonalDataAccess(
  dataType: 'religious' | 'personal' | 'sensitive'
) {
  return auditLog(
    dataType === 'religious'
      ? AuditAction.RELIGIOUS_DATA_ACCESS
      : AuditAction.PERSONAL_DATA_ACCESS,
    (req) => ({
      dataType,
      query: sanitizeAuditData(req.query),
      params: sanitizeAuditData(req.params)
    })
  );
}

/**
 * Middleware para auditoria de modificação de dados
 */
export function auditDataModification(
  action: AuditAction,
  getChanges?: (req: AuthRequest) => Record<string, any>
) {
  return auditLog(action, (req) => {
    const changes = getChanges ? getChanges(req) : req.body;

    return {
      targetResource: req.params.id || req.params.userId,
      changes: sanitizeAuditData(changes)
    };
  });
}

/**
 * Middleware para auditoria de eventos de segurança
 */
export async function auditSecurityEvent(
  event: AuditAction,
  req: Request,
  metadata: Record<string, any> = {}
): Promise<void> {
  await logAudit(event, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    method: req.method,
    path: req.path,
    ...metadata
  });
}

/**
 * Middleware para auditoria de tentativas de login
 */
export async function auditLoginAttempt(
  email: string,
  success: boolean,
  req: Request,
  reason?: string
): Promise<void> {
  await logAudit(
    success ? AuditAction.LOGIN : AuditAction.LOGIN_FAILED,
    {
      email,
      success,
      reason,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    }
  );
}

/**
 * Exportar tipos
 */
export type { AuditMetadata };
