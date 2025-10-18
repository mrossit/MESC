# Plano de Ação - Recomendações Críticas de Infraestrutura

**Projeto:** MESC - Sistema de Gestão de Ministros
**Data de Criação:** 16 de Outubro de 2025
**Responsável:** Equipe de DevOps/Infraestrutura
**Status:** PLANEJAMENTO
**Deadline Target:** 3 semanas a partir da aprovação

---

## 📋 Visão Geral do Plano

Este documento detalha o plano de ação para implementar as **12 recomendações críticas** identificadas na avaliação de infraestrutura do Sistema MESC.

**Objetivo:** Elevar o sistema de 52% para 75%+ de conformidade em 3 semanas.

**Esforço Total Estimado:** 80-100 horas (2-2.5 semanas de trabalho)

**Investimento Financeiro:** $5-10/mês em serviços cloud

---

## 🎯 Roadmap Executivo

```
Semana 1: CRÍTICO - Segurança e Monitoramento
├─ Dias 1-2: Implementar Monitoramento & Alertas
├─ Dia 3: Corrigir Vulnerabilidades de Segurança
└─ Dias 4-5: Configurar CI/CD Pipeline

Semana 2: IMPORTANTE - Operações e Confiabilidade
├─ Dias 1-2: Documentar RTO/RPO e Testar DR
├─ Dias 3-4: Implementar Backup Off-site
└─ Dia 5: Aumentar Cobertura de Testes

Semana 3: COMPLEMENTAR - Otimização e Governança
├─ Dias 1-2: Criar Gestão de Mudanças
├─ Dia 3: Estabelecer ADR Repository
├─ Dia 4: Implementar CDN
└─ Dia 5: Buffer para ajustes e validação final
```

---

## 🔴 PRIORIDADE CRÍTICA (Semana 1)

---

### AÇÃO #1: Implementar Monitoramento e Alertas

**Prioridade:** 🔴 CRÍTICA
**Impacto:** Detecção precoce de problemas, visibilidade operacional
**Esforço:** 6-8 horas
**Prazo:** Dias 1-2
**Responsável:** DevOps Engineer

#### Tarefas Detalhadas

##### 1.1 Configurar Sentry para Error Tracking (3h)

**Passos:**
1. Criar conta gratuita no Sentry (sentry.io)
   - Plano: Free (até 5k eventos/mês - suficiente)
   - Time estimado: 15 min

2. Instalar SDK no backend
   ```bash
   npm install --save @sentry/node @sentry/profiling-node
   ```

3. Configurar Sentry no `server/index.ts`
   ```typescript
   import * as Sentry from "@sentry/node";

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 1.0,
   });

   // Error handler
   app.use(Sentry.Handlers.errorHandler());
   ```

4. Configurar Sentry no frontend
   ```bash
   npm install --save @sentry/react
   ```

5. Adicionar ao `client/src/main.tsx`
   ```typescript
   import * as Sentry from "@sentry/react";

   Sentry.init({
     dsn: process.env.VITE_SENTRY_DSN,
     integrations: [
       new Sentry.BrowserTracing(),
       new Sentry.Replay(),
     ],
     tracesSampleRate: 0.1,
     replaysSessionSampleRate: 0.1,
   });
   ```

6. Testar captura de erros
   - Forçar erro no frontend
   - Forçar erro no backend
   - Verificar no dashboard Sentry

**Arquivos Afetados:**
- `server/index.ts`
- `client/src/main.tsx`
- `.env.example` (adicionar SENTRY_DSN)
- `package.json`

**Validação:**
- [ ] Erros aparecem no dashboard Sentry
- [ ] Stack traces completos visíveis
- [ ] Alertas por email configurados

---

##### 1.2 Implementar Health Check Endpoints (1h)

**Criar:** `server/routes/health.ts`

```typescript
import { Router } from 'express';
import { db } from '../db';

const router = Router();

// Basic health check
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    await db.execute('SELECT 1');

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.VERSION || 'unknown',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
    });
  }
});

// Readiness check (more detailed)
router.get('/ready', async (req, res) => {
  const checks = {
    database: false,
    memory: false,
    disk: false,
  };

  try {
    // Database check
    await db.execute('SELECT 1');
    checks.database = true;

    // Memory check (warn if >80% used)
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    checks.memory = memPercent < 80;

    // All checks must pass
    const isReady = Object.values(checks).every(check => check);

    res.status(isReady ? 200 : 503).json({
      ready: isReady,
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      checks,
      error: error.message,
    });
  }
});

export default router;
```

**Integrar no `server/index.ts`:**
```typescript
import healthRoutes from './routes/health';
app.use('/api', healthRoutes);
```

**Validação:**
- [ ] GET /api/health retorna 200 quando saudável
- [ ] GET /api/ready retorna 200 quando pronto
- [ ] Endpoints respondem em <100ms

---

##### 1.3 Configurar Uptime Monitoring (1h)

**Opção A: UptimeRobot (Recomendado - Gratuito)**

1. Criar conta em uptimerobot.com
2. Configurar monitores:
   - **HTTP Monitor:** https://seu-dominio.replit.app
     - Intervalo: 5 minutos
     - Timeout: 30 segundos

   - **Keyword Monitor:** https://seu-dominio.replit.app/api/health
     - Buscar palavra: "healthy"
     - Intervalo: 5 minutos

3. Configurar alertas:
   - Email para equipe técnica
   - SMS para on-call (se disponível)
   - Notificação após 2 falhas consecutivas

4. Integrar com Slack (opcional):
   - Webhook URL do canal #alerts
   - Notificações de up/down

**Opção B: Pingdom (Trial 30 dias)**

**Opção C: BetterUptime (Gratuito até 3 monitores)**

**Validação:**
- [ ] Monitor detecta downtime em <5 minutos
- [ ] Alertas chegam por email
- [ ] Dashboard público disponível (opcional)

---

##### 1.4 Implementar Structured Logging (2-3h)

**Instalar Winston:**
```bash
npm install --save winston winston-daily-rotate-file
```

**Criar:** `server/utils/logger.ts`

```typescript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'mesc-api' },
  transports: [
    // Console (development)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),

    // File - errors only
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
    }),

    // File - all logs
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
    }),
  ],
});

export default logger;
```

**Substituir console.log por logger:**

```typescript
// Antes
console.log('User logged in:', userId);

// Depois
logger.info('User logged in', { userId, timestamp: new Date() });
```

**Adicionar ao .gitignore:**
```
logs/
*.log
```

**Validação:**
- [ ] Logs estruturados em JSON
- [ ] Rotação diária funcionando
- [ ] Logs de erro separados
- [ ] Níveis de log respeitados

---

#### Checklist de Conclusão - Ação #1

- [ ] Sentry configurado (frontend + backend)
- [ ] Health check endpoints respondendo
- [ ] Uptime monitoring ativo
- [ ] Structured logging implementado
- [ ] Alertas testados e funcionando
- [ ] Documentação atualizada

**Critério de Aceitação:**
Sistema capaz de detectar e alertar sobre problemas em menos de 5 minutos.

---

### AÇÃO #2: Corrigir Vulnerabilidades de Segurança

**Prioridade:** 🔴 CRÍTICA
**Impacto:** Eliminar riscos de segurança conhecidos
**Esforço:** 4 horas
**Prazo:** Dia 3
**Responsável:** Security Engineer / Full-stack Developer

#### Tarefas Detalhadas

##### 2.1 Corrigir Password Reset Token (1h)

**Localizar código atual:**
Buscar por `Math.random()` em password reset

```bash
grep -r "Math.random()" server/
```

**Substituir por crypto seguro:**

```typescript
// Antes (INSEGURO)
const resetToken = Math.random().toString(36).substring(2);

// Depois (SEGURO)
import crypto from 'crypto';

const resetToken = crypto.randomBytes(32).toString('hex');
```

**Criar utilitário:** `server/utils/crypto.ts`

```typescript
import crypto from 'crypto';

export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function generateSecureNumericCode(length: number = 6): string {
  const max = Math.pow(10, length);
  const random = crypto.randomInt(0, max);
  return random.toString().padStart(length, '0');
}
```

**Aplicar em:**
- Password reset
- Email verification (se existir)
- Session tokens (se necessário)

**Validação:**
- [ ] Tokens têm 64 caracteres hexadecimais
- [ ] Entropia suficiente (256 bits)
- [ ] Testes unitários passando

---

##### 2.2 Melhorar Política de Senhas (30min)

**Atualizar validação:** `shared/validation.ts` ou similar

```typescript
// Antes
password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres')

// Depois
password: z.string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Senha deve conter letras maiúsculas, minúsculas e números'
  )
```

**Adicionar verificador de senha fraca:**

```typescript
const commonPasswords = [
  '12345678', 'password', 'senha123', 'admin123',
  'qwerty123', '123456789'
];

function isWeakPassword(password: string): boolean {
  return commonPasswords.includes(password.toLowerCase());
}
```

**Atualizar UI:**
- Indicador de força de senha
- Mensagens de validação claras
- Tooltip com requisitos

**Migração de senhas existentes:**
```typescript
// Não forçar reset imediato
// Exigir senha forte apenas em próxima troca
```

**Validação:**
- [ ] Senhas curtas rejeitadas
- [ ] Senhas fracas rejeitadas
- [ ] Mensagens de erro claras
- [ ] Usuários existentes não bloqueados

---

##### 2.3 Implementar Helmet.js (30min)

**Instalar:**
```bash
npm install --save helmet
```

**Configurar em `server/index.ts`:**

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind precisa
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Se necessário para imagens
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
```

**Headers adicionados automaticamente:**
- X-DNS-Prefetch-Control
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security (HSTS)
- X-Download-Options: noopen
- X-Permitted-Cross-Domain-Policies: none

**Testar com securityheaders.com:**
```
https://securityheaders.com/?q=seu-dominio.replit.app
```

**Validação:**
- [ ] Headers de segurança presentes
- [ ] Score A em securityheaders.com
- [ ] Aplicação funciona normalmente
- [ ] CSP não bloqueia recursos legítimos

---

##### 2.4 Adicionar Rate Limiting Avançado (2h)

**Já existe rate limiting básico. Melhorar:**

**Instalar Redis (opcional, para produção):**
```bash
npm install --save redis rate-limit-redis
```

**Ou usar MemoryStore aprimorado:**

```typescript
import rateLimit from 'express-rate-limit';

// Rate limiter por rota sensível
const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  message: {
    error: 'Muitas tentativas',
    message: 'Por favor, aguarde 15 minutos antes de tentar novamente',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Store em Redis (produção)
  // store: new RedisStore({ client: redisClient }),
});

// Aplicar em rotas críticas
app.use('/api/auth/login', strictRateLimit);
app.use('/api/auth/register', strictRateLimit);
app.use('/api/password-reset', strictRateLimit);
```

**Rate limiting por usuário:**

```typescript
const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3,
  keyGenerator: (req) => req.body.email || req.ip,
  message: 'Limite de criação de conta excedido',
});
```

**Validação:**
- [ ] Rate limits funcionando por IP
- [ ] Rate limits funcionando por usuário
- [ ] Mensagens claras para usuário
- [ ] Logs de tentativas bloqueadas

---

#### Checklist de Conclusão - Ação #2

- [ ] Password reset tokens seguros
- [ ] Política de senhas fortalecida
- [ ] Helmet.js configurado
- [ ] Rate limiting avançado
- [ ] Testes de segurança passando
- [ ] Documentação atualizada

**Critério de Aceitação:**
Todas as vulnerabilidades identificadas corrigidas e testadas.

---

### AÇÃO #3: Estabelecer CI/CD Pipeline

**Prioridade:** 🔴 CRÍTICA
**Impacto:** Automação de testes, deploy seguro
**Esforço:** 8 horas
**Prazo:** Dias 4-5
**Responsável:** DevOps Engineer

#### Tarefas Detalhadas

##### 3.1 Criar GitHub Actions Workflow (3h)

**Criar:** `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: mesc_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run TypeScript check
        run: npm run check

      - name: Run tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/mesc_test
          JWT_SECRET: test_secret_key_for_ci_only
          SESSION_SECRET: test_session_secret
        run: npm run test:run

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true

  build:
    name: Build Application
    runs-on: ubuntu-latest
    needs: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build frontend
        run: npm run build

      - name: Check build size
        run: |
          du -sh dist/public
          echo "Build completed successfully"

  security:
    name: Security Scan
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run npm audit
        run: npm audit --audit-level=moderate

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        continue-on-error: true
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  deploy:
    name: Deploy to Replit
    runs-on: ubuntu-latest
    needs: [test, build]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - name: Trigger Replit deployment
        run: |
          echo "Replit auto-deploys from main branch"
          # Ou usar Replit API se necessário

      - name: Notify team
        uses: 8398a7/action-slack@v3
        if: always()
        with:
          status: ${{ job.status }}
          text: 'Deployment completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

**Configurar secrets no GitHub:**
1. Settings → Secrets → Actions
2. Adicionar:
   - `SNYK_TOKEN` (criar em snyk.io)
   - `SLACK_WEBHOOK` (opcional)

**Validação:**
- [ ] Pipeline executa em push
- [ ] Testes passam
- [ ] Build completa
- [ ] Security scan roda

---

##### 3.2 Configurar Pre-commit Hooks (1h)

**Instalar Husky:**
```bash
npm install --save-dev husky lint-staged
npx husky install
```

**Criar:** `.husky/pre-commit`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

**Configurar em `package.json`:**

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  },
  "scripts": {
    "prepare": "husky install"
  }
}
```

**Validação:**
- [ ] Hooks executam antes de commit
- [ ] Código formatado automaticamente
- [ ] Erros de lint bloqueiam commit

---

##### 3.3 Aumentar Cobertura de Testes (4h)

**Priorizar testes em:**

1. **Authentication (server/auth.ts)**
   ```typescript
   describe('Authentication', () => {
     it('should generate valid JWT token');
     it('should reject invalid credentials');
     it('should expire tokens correctly');
   });
   ```

2. **Schedule Generation (server/routes/schedules.ts)**
   ```typescript
   describe('Schedule Generation', () => {
     it('should generate schedules from questionnaire');
     it('should respect minimum ministers per mass');
     it('should avoid scheduling same family together');
   });
   ```

3. **Substitution System (server/routes/substitutions.ts)**
   ```typescript
   describe('Substitutions', () => {
     it('should auto-assign available substitute');
     it('should calculate urgency correctly');
     it('should auto-approve when criteria met');
   });
   ```

**Meta:** Atingir 40% de cobertura (atualmente 20%)

**Foco:** Business logic crítica, não UI components

**Validação:**
- [ ] Cobertura ≥40%
- [ ] Testes de integração adicionados
- [ ] Business logic crítica testada
- [ ] Pipeline verde

---

#### Checklist de Conclusão - Ação #3

- [ ] GitHub Actions configurado
- [ ] Pre-commit hooks funcionando
- [ ] Cobertura de testes ≥40%
- [ ] Security scan integrado
- [ ] Documentação de CI/CD criada

**Critério de Aceitação:**
Pipeline automatizado executando em cada push, bloqueando merges com falhas.

---

## 🟡 PRIORIDADE ALTA (Semana 2)

---

### AÇÃO #4: Documentar RTO/RPO e Testar DR

**Prioridade:** 🟡 ALTA
**Esforço:** 4 horas
**Prazo:** Dias 1-2 (Semana 2)

#### Tarefas

1. **Definir RTO (Recovery Time Objective)** (1h)
   - Meta proposta: 2 horas
   - Documentar procedimentos de recuperação
   - Identificar dependências críticas

2. **Definir RPO (Recovery Point Objective)** (1h)
   - Meta proposta: 24 horas (backup diário)
   - Avaliar necessidade de backup mais frequente
   - Considerar Neon point-in-time recovery

3. **Teste de Disaster Recovery** (2h)
   - Executar restore completo
   - Cronometrar tempo de recuperação
   - Documentar gaps e melhorias
   - Atualizar runbook de DR

**Deliverable:** Documento RTO/RPO + Relatório de teste DR

---

### AÇÃO #5: Implementar Backup Off-site

**Prioridade:** 🟡 ALTA
**Esforço:** 8 horas
**Prazo:** Dias 3-4 (Semana 2)

#### Tarefas

1. **Configurar AWS S3** (2h)
   - Criar bucket S3 (região us-east-1)
   - Configurar lifecycle policy (30 dias)
   - Habilitar versionamento
   - Configurar encryption at rest

2. **Modificar script de backup** (3h)
   - Adicionar upload para S3
   - Implementar retry logic
   - Adicionar verificação de integridade
   - Notificar sucesso/falha

3. **Configurar backup automático** (2h)
   - GitHub Actions scheduled workflow
   - Ou Replit cron job
   - Notificações de falha

4. **Testar restore de S3** (1h)
   - Download de backup
   - Restore em ambiente de teste
   - Validar integridade

**Custo:** ~$2-5/mês

**Deliverable:** Backup automático para S3 funcionando

---

### AÇÃO #6: Aumentar Cobertura de Testes

**Prioridade:** 🟡 ALTA
**Esforço:** 8 horas (ongoing)
**Prazo:** Dia 5 (Semana 2)

*Ver detalhes em Ação #3.3*

**Meta:** 40% de cobertura

---

## 🟢 PRIORIDADE MÉDIA (Semana 3)

---

### AÇÃO #7: Criar Gestão de Mudanças

**Esforço:** 4 horas

1. **Criar template de Change Request** (1h)
2. **Definir approval workflow** (1h)
3. **Documentar deployment windows** (1h)
4. **Criar change log** (1h)

---

### AÇÃO #8: Estabelecer ADR Repository

**Esforço:** 2 horas

1. **Criar pasta `docs/architecture/decisions/`**
2. **Documentar decisões passadas** (3-5 ADRs)
3. **Criar template ADR**
4. **Atualizar contribuição guidelines**

---

### AÇÃO #9-12: Otimizações

*Detalhes disponíveis se necessário*

---

## 📊 Tracking e Métricas

### Daily Standup Questions
1. O que foi completado ontem?
2. O que será trabalhado hoje?
3. Há bloqueadores?

### Métricas de Progresso

| Métrica | Atual | Meta | Prazo |
|---------|-------|------|-------|
| Uptime Visibility | 0% | 99% | Semana 1 |
| Security Score | C | A | Semana 1 |
| Test Coverage | 20% | 40% | Semana 2 |
| Backup Redundancy | 1 local | 2 (local+cloud) | Semana 2 |
| CI/CD Automation | 0% | 80% | Semana 1 |
| RTO Defined | No | Yes | Semana 2 |

---

## 💰 Orçamento

| Item | Custo Mensal | Custo Setup | Notas |
|------|--------------|-------------|-------|
| Sentry | $0 | $0 | Free tier (5k events) |
| UptimeRobot | $0 | $0 | Free tier (50 monitors) |
| AWS S3 | $2-5 | $0 | ~10GB backups |
| GitHub Actions | $0 | $0 | Incluído |
| CodeCov | $0 | $0 | Open source gratuito |
| **Total** | **$2-5** | **$0** | |

**Tempo de Desenvolvimento:** 80-100 horas = R$ 0 (voluntário)

---

## ✅ Critérios de Aceitação Final

Antes de considerar o plano completo, validar:

- [ ] Sistema detecta downtime em <5 minutos
- [ ] Alertas chegam para equipe em <2 minutos
- [ ] Vulnerabilidades de segurança corrigidas
- [ ] Pipeline CI/CD executando automaticamente
- [ ] Cobertura de testes ≥40%
- [ ] Backup cloud funcionando
- [ ] RTO/RPO documentados e testados
- [ ] Health checks respondendo
- [ ] Logs estruturados e rotacionados
- [ ] Documentação atualizada

---

## 📞 Responsabilidades

| Responsável | Ações |
|-------------|-------|
| DevOps Lead | #1, #3, #5 |
| Security Engineer | #2 |
| QA/Test Engineer | #6 |
| Tech Lead | #4, #7, #8 |
| Full Team | Code reviews, testing |

---

## 🚨 Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Tempo insuficiente | Média | Alto | Priorizar ações críticas, pedir extensão |
| Replit limitações | Baixa | Médio | Ter plano B para cada ferramenta |
| Quebra em produção | Baixa | Alto | Deploy gradual, rollback preparado |
| Custo exceder orçamento | Baixa | Baixo | Monitorar AWS billing alerts |

---

## 📅 Cronograma Detalhado

```
Semana 1
─────────
Segunda    │ Ação #1.1-1.2: Sentry + Health Checks
Terça      │ Ação #1.3-1.4: Uptime + Logging
Quarta     │ Ação #2: Corrigir vulnerabilidades
Quinta     │ Ação #3.1-3.2: CI/CD + Hooks
Sexta      │ Ação #3.3: Aumentar testes

Semana 2
─────────
Segunda    │ Ação #4: RTO/RPO + DR test
Terça      │ Ação #4: Conclusão DR
Quarta     │ Ação #5: Setup AWS S3
Quinta     │ Ação #5: Integrar backup S3
Sexta      │ Ação #6: Testes adicionais

Semana 3
─────────
Segunda    │ Ação #7: Change management
Terça      │ Ação #7: Conclusão
Quarta     │ Ação #8: ADR repository
Quinta     │ Ações #9-12: Otimizações
Sexta      │ Buffer, validação final, docs
```

---

## 📝 Relatório de Progresso (Template)

```markdown
# Relatório Semanal - Semana X

## Completado
- [ ] Ação X: Descrição
- [ ] Ação Y: Descrição

## Em Progresso
- [ ] Ação Z: 60% completo

## Bloqueadores
- Nenhum

## Próxima Semana
- Focar em Ação W

## Métricas
- Cobertura de testes: 25% → 32%
- Uptime visibility: 0% → 100%
```

---

## 🎓 Recursos de Treinamento

- **Sentry Docs:** https://docs.sentry.io/
- **GitHub Actions:** https://docs.github.com/actions
- **AWS S3 Backup:** https://aws.amazon.com/s3/
- **Winston Logging:** https://github.com/winstonjs/winston
- **Vitest Testing:** https://vitest.dev/

---

**Próxima Revisão:** Fim da Semana 1
**Responsável pelo Follow-up:** DevOps Lead
**Aprovação Necessária:** Tech Lead + Product Owner

---

**Documento Vivo:** Este plano deve ser atualizado semanalmente com progresso e ajustes.
