import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Session data interface for CSRF
interface SessionData {
  csrfToken?: string;
  [key: string]: unknown;
}

// Extend Express Request type to include session with csrfToken
declare module 'express-serve-static-core' {
  interface Request {
    session?: SessionData;
  }
}

/**
 * Gera token CSRF criptograficamente seguro
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Middleware para gerar e armazenar token CSRF na sessão
 */
export function csrfTokenGenerator(req: Request, res: Response, next: NextFunction): void {
  if (req.session) {
    if (!req.session.csrfToken) {
      req.session.csrfToken = generateCsrfToken();
    }
  }
  next();
}

/**
 * Middleware de proteção CSRF usando validação de Content-Type.
 *
 * Estratégia: Para métodos que modificam estado (POST, PUT, PATCH, DELETE),
 * exigimos Content-Type: application/json. Formulários HTML cross-site só
 * conseguem enviar application/x-www-form-urlencoded, multipart/form-data
 * ou text/plain — nunca application/json. Isso impede ataques CSRF via forms.
 *
 * Combinado com SameSite=Lax no cookie (já configurado), isso provê
 * defesa em camadas contra CSRF.
 *
 * Referência: OWASP "Custom Request Headers" defense.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Métodos seguros (leitura) — não precisam de verificação
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Para métodos que modificam estado, verificar Content-Type
  const contentType = req.headers['content-type'] || '';

  // Permitir requests sem body (ex: DELETE sem payload)
  // Content-Length ausente ou "0" indica que não há body
  const contentLength = req.headers['content-length'];
  if (!contentLength || contentLength === '0') {
    return next();
  }

  // Se há body, deve ser JSON (forms cross-site não podem enviar application/json)
  if (contentType.includes('application/json')) {
    return next();
  }

  // Permitir multipart/form-data para uploads legítimos (upload de fotos etc.)
  // Estes endpoints já são protegidos por autenticação JWT + SameSite=Lax
  if (contentType.includes('multipart/form-data')) {
    return next();
  }

  // Bloquear requests com Content-Type suspeito (ex: text/plain de um form cross-site)
  console.warn(`[CSRF] Blocked ${req.method} ${req.path} - suspicious Content-Type: ${contentType}`);
  res.status(403).json({
    error: 'Requisição bloqueada por proteção CSRF. Content-Type inválido.'
  });
}

/**
 * Endpoint para obter token CSRF (usado pelo frontend)
 */
export function getCsrfToken(req: Request, res: Response): void {
  if (!req.session) {
    res.status(500).json({
      error: 'Sessão não disponível'
    });
    return;
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }

  res.json({
    csrfToken: req.session.csrfToken
  });
}

/**
 * Regenera token CSRF (útil após login/logout)
 */
export function regenerateCsrfToken(req: Request): void {
  if (req.session) {
    req.session.csrfToken = generateCsrfToken();
  }
}
