import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

/**
 * Rate limiter para endpoints de autenticação (mais restritivo)
 * Previne ataques de força bruta em login/registro
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 tentativas por IP
  message: {
    error: 'Muitas tentativas de autenticação. Tente novamente em 15 minutos.'
  },
  standardHeaders: true, // Retorna info de rate limit nos headers `RateLimit-*`
  legacyHeaders: false, // Desabilita headers `X-RateLimit-*`
  skipSuccessfulRequests: false, // Contar mesmo se request for bem-sucedido
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Muitas tentativas de autenticação',
      message: 'Você excedeu o limite de tentativas. Por favor, aguarde 15 minutos e tente novamente.',
      retryAfter: '15 minutes'
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
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Máximo 3 tentativas por hora por IP
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
