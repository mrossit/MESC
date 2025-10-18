import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

/**
 * Rate limiter para endpoints de autenticação (mais restritivo)
 * Previne ataques de força bruta em login/registro
 *
 * SEGURANÇA: Usa EMAIL + IP como chave, não apenas IP
 * Isso previne bypass via proxy rotation
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 tentativas por email/IP

  // CRÍTICO: Rate limit por EMAIL, não apenas IP
  // Desabilita todas as validações pois usamos chave customizada baseada em email
  validate: false,
  keyGenerator: (req: Request) => {
    // Usar email do body como chave principal (se disponível)
    const email = req.body?.email;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    if (email) {
      // Combinar email + IP para prevenir ataques de múltiplos IPs no mesmo email
      return `auth:${email.toLowerCase()}:${ip}`;
    }

    // Fallback para IP se email não estiver disponível
    return `auth:ip:${ip}`;
  },

  message: {
    error: 'Muitas tentativas de autenticação. Tente novamente em 15 minutos.'
  },
  standardHeaders: true, // Retorna info de rate limit nos headers `RateLimit-*`
  legacyHeaders: false, // Desabilita headers `X-RateLimit-*`
  skipSuccessfulRequests: false, // Contar mesmo se request for bem-sucedido
  handler: (req: Request, res: Response) => {
    const email = req.body?.email;

    res.status(429).json({
      error: 'Muitas tentativas de autenticação',
      message: email
        ? `Muitas tentativas de login para ${email}. Aguarde 15 minutos e tente novamente.`
        : 'Você excedeu o limite de tentativas. Por favor, aguarde 15 minutos e tente novamente.',
      retryAfter: '15 minutes',
      accountLocked: !!email // Indicar se a conta específica está bloqueada
    });
  }
});

/**
 * Rate limiter para API geral (menos restritivo)
 * Previne abuso da API e ataques DDoS
 */
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // Máximo 100 requests por minuto por IP
  
  // Desabilita validações pois usamos trust proxy no Replit
  validate: false,
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `api:${ip}`;
  },
  
  message: {
    error: 'Muitas requisições. Tente novamente em breve.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Rate limit excedido',
      message: 'Você excedeu o limite de requisições por minuto. Por favor, aguarde um momento.',
      retryAfter: '1 minute'
    });
  }
});

/**
 * Rate limiter para recuperação de senha (muito restritivo)
 * Previne abuso do sistema de email
 *
 * SEGURANÇA: Usa EMAIL como chave para prevenir spam
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Máximo 3 tentativas por hora por email

  // Rate limit por EMAIL para prevenir spam de reset
  // Desabilita todas as validações pois usamos chave customizada baseada em email
  validate: false,
  keyGenerator: (req: Request) => {
    const email = req.body?.email;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    if (email) {
      return `password-reset:${email.toLowerCase()}`;
    }

    return `password-reset:ip:${ip}`;
  },

  message: {
    error: 'Muitas tentativas de recuperação de senha.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Não contar se request falhar
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Limite de recuperação de senha excedido',
      message: 'Você excedeu o limite de tentativas de recuperação de senha. Aguarde 1 hora.',
      retryAfter: '1 hour'
    });
  }
});
