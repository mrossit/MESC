import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Extend Express Request type to include session with csrfToken
declare module 'express-serve-static-core' {
  interface Request {
    session?: any; // Using any to avoid complex session typing issues
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
 * Middleware para validar token CSRF em requests que modificam estado
 * Aplica-se a: POST, PUT, PATCH, DELETE
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Métodos seguros não precisam de proteção CSRF
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Obter token CSRF do header ou body
  const token = req.headers['x-csrf-token'] || req.body._csrf;

  // Verificar se sessão existe
  if (!req.session || !req.session.csrfToken) {
    res.status(403).json({
      error: 'CSRF token inválido',
      message: 'Sessão expirada ou inválida. Faça login novamente.'
    });
    return;
  }

  // Validar token
  if (!token || token !== req.session.csrfToken) {
    res.status(403).json({
      error: 'CSRF token inválido',
      message: 'Token de segurança inválido. A requisição foi bloqueada por segurança.'
    });
    return;
  }

  next();
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
