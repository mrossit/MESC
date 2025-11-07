import { Router } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../auth';
import { db } from '../db';
import { users, schedules, questionnaireResponses, substitutionRequests } from '@shared/schema';
import { eq, count, gte, sql } from 'drizzle-orm';
import os from 'os';

const router = Router();

// Armazenar métricas de requisições em memória
interface RequestMetrics {
  total: number;
  success: number;
  errors: number;
  avgResponseTime: number;
  lastReset: Date;
  responseTimes: number[];
}

const metrics: RequestMetrics = {
  total: 0,
  success: 0,
  errors: 0,
  avgResponseTime: 0,
  lastReset: new Date(),
  responseTimes: []
};

// Função para atualizar métricas (será chamada pelo middleware)
export function updateMetrics(statusCode: number, responseTime: number) {
  metrics.total++;
  
  if (statusCode >= 200 && statusCode < 400) {
    metrics.success++;
  } else if (statusCode >= 400) {
    metrics.errors++;
  }
  
  metrics.responseTimes.push(responseTime);
  
  // Manter apenas as últimas 1000 requisições
  if (metrics.responseTimes.length > 1000) {
    metrics.responseTimes.shift();
  }
  
  // Calcular média
  if (metrics.responseTimes.length > 0) {
    metrics.avgResponseTime = 
      metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
  }
}

// GET /api/metrics - Obter métricas do sistema
router.get('/', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  try {
    // Informações do sistema
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Estatísticas do banco de dados
    const [usersCount] = await db.select({ count: count() }).from(users);
    const [activeUsersCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, 'active'));
    
    const [schedulesCount] = await db.select({ count: count() }).from(schedules);
    const [publishedSchedulesCount] = await db
      .select({ count: count() })
      .from(schedules)
      .where(eq(schedules.status, 'published'));
    
    const [responsesCount] = await db.select({ count: count() }).from(questionnaireResponses);
    const [substitutionsCount] = await db.select({ count: count() }).from(substitutionRequests);
    
    // Substituições pendentes
    const [pendingSubstitutions] = await db
      .select({ count: count() })
      .from(substitutionRequests)
      .where(eq(substitutionRequests.status, 'pending'));
    
    // Usuários cadastrados nos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [recentUsersCount] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo));
    
    // Calcular percentis de tempo de resposta
    const sortedTimes = [...metrics.responseTimes].sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;
    
    res.json({
      timestamp: new Date().toISOString(),
      
      // Métricas do servidor
      server: {
        uptime: Math.floor(uptime),
        uptimeFormatted: formatUptime(uptime),
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname()
      },
      
      // Uso de recursos
      resources: {
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
          heapUsagePercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
        },
        cpu: {
          user: Math.round(cpuUsage.user / 1000), // ms
          system: Math.round(cpuUsage.system / 1000)
        },
        system: {
          totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024), // GB
          freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024),
          loadAverage: os.loadavg(),
          cpuCount: os.cpus().length
        }
      },
      
      // Métricas de requisições HTTP
      requests: {
        total: metrics.total,
        success: metrics.success,
        errors: metrics.errors,
        successRate: metrics.total > 0 ? Math.round((metrics.success / metrics.total) * 100) : 0,
        errorRate: metrics.total > 0 ? Math.round((metrics.errors / metrics.total) * 100) : 0,
        avgResponseTime: Math.round(metrics.avgResponseTime),
        p50ResponseTime: Math.round(p50),
        p95ResponseTime: Math.round(p95),
        p99ResponseTime: Math.round(p99),
        lastReset: metrics.lastReset.toISOString()
      },
      
      // Estatísticas do banco de dados
      database: {
        users: {
          total: usersCount.count,
          active: activeUsersCount.count,
          recentSignups: recentUsersCount.count
        },
        schedules: {
          total: schedulesCount.count,
          published: publishedSchedulesCount.count
        },
        responses: responsesCount.count,
        substitutions: {
          total: substitutionsCount.count,
          pending: pendingSubstitutions.count
        }
      }
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// POST /api/metrics/reset - Resetar métricas de requisições
router.post('/reset', authenticateToken, requireRole(['gestor']), async (req: AuthRequest, res) => {
  metrics.total = 0;
  metrics.success = 0;
  metrics.errors = 0;
  metrics.avgResponseTime = 0;
  metrics.responseTimes = [];
  metrics.lastReset = new Date();
  
  res.json({ message: 'Métricas resetadas com sucesso', lastReset: metrics.lastReset });
});

// Função auxiliar para formatar uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  
  return parts.join(' ');
}

export default router;
