import { Router } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../auth';
import { db } from '../db';
import { users, schedules, questionnaireResponses, substitutionRequests } from '@shared/schema';
import { eq, count, gte, sql } from 'drizzle-orm';
import os from 'os';

const router = Router();

// Armazenar métricas de requisições em memória
interface ErrorLog {
  route: string;
  method: string;
  statusCode: number;
  message: string;
  timestamp: Date;
}

interface RouteStats {
  count: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
}

interface RequestMetrics {
  total: number;
  success: number;
  errors: number;
  avgResponseTime: number;
  lastReset: Date;
  responseTimes: number[];
  errorLogs: ErrorLog[];
  routeStats: Map<string, RouteStats>;
}

const metrics: RequestMetrics = {
  total: 0,
  success: 0,
  errors: 0,
  avgResponseTime: 0,
  lastReset: new Date(),
  responseTimes: [],
  errorLogs: [],
  routeStats: new Map()
};

// Função para atualizar métricas (será chamada pelo middleware)
export function updateMetrics(
  statusCode: number, 
  responseTime: number, 
  route?: string, 
  method?: string,
  errorMessage?: string
) {
  metrics.total++;
  
  if (statusCode >= 200 && statusCode < 400) {
    metrics.success++;
  } else if (statusCode >= 400) {
    metrics.errors++;
    
    // Registrar erro detalhado
    if (route) {
      metrics.errorLogs.push({
        route,
        method: method || 'UNKNOWN',
        statusCode,
        message: errorMessage || `HTTP ${statusCode}`,
        timestamp: new Date()
      });
      
      // Manter apenas os últimos 100 erros
      if (metrics.errorLogs.length > 100) {
        metrics.errorLogs.shift();
      }
    }
  }
  
  // Rastrear estatísticas por rota
  if (route) {
    const key = `${method || 'GET'} ${route}`;
    const stats = metrics.routeStats.get(key);
    
    if (stats) {
      stats.count++;
      stats.totalTime += responseTime;
      stats.avgTime = stats.totalTime / stats.count;
      stats.minTime = Math.min(stats.minTime, responseTime);
      stats.maxTime = Math.max(stats.maxTime, responseTime);
    } else {
      metrics.routeStats.set(key, {
        count: 1,
        totalTime: responseTime,
        avgTime: responseTime,
        minTime: responseTime,
        maxTime: responseTime
      });
    }
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

// GET /api/metrics/errors - Obter lista de erros
router.get('/errors', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  try {
    // Retornar erros ordenados do mais recente para o mais antigo
    const errors = [...metrics.errorLogs]
      .reverse()
      .map(error => ({
        ...error,
        timestamp: error.timestamp.toISOString()
      }));
    
    res.json({
      total: metrics.errorLogs.length,
      errors
    });
  } catch (error) {
    console.error('Error fetching error logs:', error);
    res.status(500).json({ error: 'Failed to fetch error logs' });
  }
});

// GET /api/metrics/slow-routes - Obter top 10 rotas mais lentas
router.get('/slow-routes', authenticateToken, requireRole(['gestor', 'coordenador']), async (req: AuthRequest, res) => {
  try {
    // Converter Map para array e ordenar por tempo médio (desc)
    const routes = Array.from(metrics.routeStats.entries())
      .map(([route, stats]) => ({
        route,
        count: stats.count,
        avgTime: Math.round(stats.avgTime),
        minTime: Math.round(stats.minTime),
        maxTime: Math.round(stats.maxTime),
        totalTime: Math.round(stats.totalTime)
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10); // Top 10
    
    res.json({
      total: metrics.routeStats.size,
      routes
    });
  } catch (error) {
    console.error('Error fetching slow routes:', error);
    res.status(500).json({ error: 'Failed to fetch slow routes' });
  }
});

// POST /api/metrics/reset - Resetar métricas de requisições
router.post('/reset', authenticateToken, requireRole(['gestor']), async (req: AuthRequest, res) => {
  metrics.total = 0;
  metrics.success = 0;
  metrics.errors = 0;
  metrics.avgResponseTime = 0;
  metrics.responseTimes = [];
  metrics.errorLogs = [];
  metrics.routeStats.clear();
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
