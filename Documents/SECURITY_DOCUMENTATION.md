# 🔐 Documentação de Segurança - Sistema MESC

**Sistema:** MESC - Ministros Extraordinários da Sagrada Comunhão
**Versão:** 2.0
**Data:** 2025-10-09
**Classificação:** CONFIDENCIAL - USO INTERNO

---

## 📋 ÍNDICE

1. [Visão Geral de Segurança](#1-visão-geral-de-segurança)
2. [Arquitetura de Segurança](#2-arquitetura-de-segurança)
3. [Configuração Segura](#3-configuração-segura)
4. [Gestão de Acesso](#4-gestão-de-acesso)
5. [Proteção de Dados](#5-proteção-de-dados)
6. [Auditoria e Monitoramento](#6-auditoria-e-monitoramento)
7. [Backup e Recuperação](#7-backup-e-recuperação)
8. [Resposta a Incidentes](#8-resposta-a-incidentes)
9. [Compliance LGPD](#9-compliance-lgpd)
10. [Checklist de Deploy](#10-checklist-de-deploy)

---

## 1. VISÃO GERAL DE SEGURANÇA

### 1.1. Princípios de Segurança

O Sistema MESC adota os seguintes princípios de segurança:

- **🔒 Defesa em Profundidade:** Múltiplas camadas de proteção
- **🔐 Princípio do Menor Privilégio:** Acesso mínimo necessário
- **📊 Auditoria Completa:** Rastreabilidade de todas as ações
- **🛡️ Criptografia por Padrão:** Dados sensíveis sempre criptografados
- **⚡ Segurança desde o Design:** Security by Design
- **🔄 Manutenção Contínua:** Atualizações regulares de segurança

### 1.2. Modelo de Ameaças

#### Ameaças Externas
- Ataques de força bruta
- Injeção SQL
- Cross-Site Scripting (XSS)
- Cross-Site Request Forgery (CSRF)
- Man-in-the-Middle (MITM)
- DDoS (Distributed Denial of Service)

#### Ameaças Internas
- Abuso de privilégios administrativos
- Vazamento acidental de dados
- Perda de credenciais

#### Ameaças de Compliance
- Não conformidade com LGPD
- Exposição de dados sensíveis religiosos
- Falta de auditoria

---

## 2. ARQUITETURA DE SEGURANÇA

### 2.1. Camadas de Segurança

```
┌─────────────────────────────────────────────┐
│         USUÁRIO (Browser)                    │
│  ↓ HTTPS/TLS 1.3                            │
├─────────────────────────────────────────────┤
│         CAMADA DE APLICAÇÃO                  │
│  - Helmet.js (Security Headers)             │
│  - CORS (Whitelist)                         │
│  - Rate Limiting (Email + IP)               │
│  ↓                                           │
├─────────────────────────────────────────────┤
│         CAMADA DE AUTENTICAÇÃO              │
│  - JWT com secret forte                     │
│  - bcrypt (10 rounds)                       │
│  - Sessões com timeout                      │
│  ↓                                           │
├─────────────────────────────────────────────┤
│         CAMADA DE AUTORIZAÇÃO               │
│  - RBAC (gestor/coordenador/ministro)      │
│  - Middleware de verificação de roles       │
│  ↓                                           │
├─────────────────────────────────────────────┤
│         CAMADA DE DADOS                     │
│  - Criptografia AES-256-GCM (dados sensíveis)│
│  - Parametrização SQL (anti-injection)      │
│  - Validação Zod                            │
│  ↓                                           │
├─────────────────────────────────────────────┤
│         BANCO DE DADOS                      │
│  - PostgreSQL com SSL                       │
│  - Backup criptografado                     │
└─────────────────────────────────────────────┘
```

### 2.2. Componentes de Segurança

#### 2.2.1. Frontend
- **React SPA:** Sem armazenamento de dados sensíveis no localStorage
- **HTTPS Only:** Cookies com flag `secure`
- **CSP:** Content Security Policy via Helmet
- **Auto-logout:** 10 minutos de inatividade

#### 2.2.2. Backend
- **Express.js:** Framework robusto e bem mantido
- **Middleware de Segurança:**
  - `helmet` - Security headers
  - `express-rate-limit` - DDoS protection
  - `cors` - Origin validation
  - `auditLogger` - Compliance tracking

#### 2.2.3. Banco de Dados
- **PostgreSQL:** RDBMS com suporte a criptografia
- **Drizzle ORM:** Proteção contra SQL injection
- **Criptografia em repouso:** AES-256-GCM para dados sensíveis

---

## 3. CONFIGURAÇÃO SEGURA

### 3.1. Variáveis de Ambiente Obrigatórias

#### ⚠️ CRÍTICO - Nunca commitar .env ao Git

```bash
# Autenticação (OBRIGATÓRIO)
JWT_SECRET=<64+ caracteres hexadecimais aleatórios>
# Gerar: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Criptografia LGPD (OBRIGATÓRIO)
ENCRYPTION_KEY=<32 caracteres hexadecimais aleatórios>
# Gerar: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Banco de Dados (OBRIGATÓRIO)
DATABASE_URL=postgresql://user:password@host:5432/mesc

# CORS - Origens Permitidas (OBRIGATÓRIO em produção)
ALLOWED_ORIGINS=https://mesc.saojudastadeu.app,https://admin.saojudastadeu.app

# Email (Notificações)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@saojudastadeu.app
SMTP_PASS=<senha-app>

# Backup
BACKUP_ENCRYPTION_PASSWORD=<senha-forte-64+>
BACKUP_DESTINATION=/backups/mesc
```

### 3.2. Checklist de Configuração

#### Desenvolvimento
```bash
# .env.development
NODE_ENV=development
JWT_SECRET=<secret-dev-apenas-para-testes>
ENCRYPTION_KEY=<key-dev-apenas-para-testes>
DATABASE_URL=postgresql://localhost:5432/mesc_dev
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

#### Produção
```bash
# .env.production (NUNCA commitar!)
NODE_ENV=production
JWT_SECRET=<secret-forte-64+>          # ⚠️ OBRIGATÓRIO
ENCRYPTION_KEY=<key-forte-32>          # ⚠️ OBRIGATÓRIO
DATABASE_URL=<postgres-ssl>             # ⚠️ OBRIGATÓRIO
ALLOWED_ORIGINS=<dominio-producao>      # ⚠️ OBRIGATÓRIO
```

### 3.3. Headers de Segurança (Helmet)

```typescript
// server/index.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

**Resultado:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

---

## 4. GESTÃO DE ACESSO

### 4.1. Hierarquia de Funções (RBAC)

| Função | Permissões |
|--------|-----------|
| **gestor** | - Acesso total ao sistema<br>- Criar coordenadores<br>- Gerenciar configurações<br>- Acessar relatórios completos |
| **coordenador** | - Criar ministros<br>- Gerenciar escalas<br>- Aprovar substituições<br>- Acessar relatórios limitados |
| **ministro** | - Ver próprias escalas<br>- Solicitar substituições<br>- Atualizar perfil<br>- Acessar formação |

### 4.2. Fluxo de Autenticação

```
┌─────────────┐
│   LOGIN     │
│ (email/pwd) │
└──────┬──────┘
       │
       ↓
┌─────────────────────────┐
│  Validação bcrypt       │
│  (10 rounds)            │
└──────┬──────────────────┘
       │
       ↓
┌─────────────────────────┐
│  Gera JWT Token         │
│  (12h expiration)       │
└──────┬──────────────────┘
       │
       ↓
┌─────────────────────────┐
│  Cria Session Token     │
│  (activity tracking)    │
└──────┬──────────────────┘
       │
       ↓
┌─────────────────────────┐
│  Define Cookies         │
│  (httpOnly, secure)     │
└─────────────────────────┘
```

### 4.3. Rate Limiting

#### Login/Autenticação
- **Limite:** 5 tentativas por 15 minutos
- **Chave:** `email + IP`
- **Bypass:** Impossível via proxy rotation

```typescript
// server/middleware/rateLimiter.ts
keyGenerator: (req) => {
  const email = req.body?.email;
  const ip = req.ip || 'unknown';
  return email ? `auth:${email}:${ip}` : `auth:ip:${ip}`;
}
```

#### Password Reset
- **Limite:** 3 tentativas por 1 hora
- **Chave:** `email + IP`

#### API Geral
- **Limite:** 100 requisições por 15 minutos
- **Chave:** `IP`

---

## 5. PROTEÇÃO DE DADOS

### 5.1. Criptografia de Dados Sensíveis

#### 5.1.1. Dados Religiosos (LGPD Art. 11)

**Algoritmo:** AES-256-GCM (Authenticated Encryption)

```typescript
// server/utils/encryption.ts
function encrypt(text: string): string {
  const key = getEncryptionKey(); // 32 bytes from ENCRYPTION_KEY
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}
```

**Campos Criptografados:**
- `baptismParish`
- `confirmationParish`
- `marriageParish`

#### 5.1.2. Senhas

**Algoritmo:** bcrypt com 10 rounds

```typescript
// server/auth.ts
const passwordHash = await bcrypt.hash(password, 10);
```

#### 5.1.3. Tokens JWT

**Configuração:**
- **Algoritmo:** HS256
- **Secret:** 64+ bytes aleatórios
- **Expiração:** 12 horas
- **Claims:** `{ id, email, role }`

### 5.2. Helpers de Criptografia

```typescript
// server/utils/userDataHelpers.ts

// SALVAR no banco
const dataToSave = prepareUserDataForDb(formData);
await db.insert(users).values(dataToSave);
// ✅ Campos religiosos automaticamente criptografados

// LER do banco
const user = await db.select().from(users).where(...);
const userData = prepareUserDataForClient(user);
// ✅ Campos religiosos automaticamente descriptografados
```

### 5.3. Migração de Dados Existentes

```bash
# Criptografar dados religiosos já existentes
npm run tsx scripts/encrypt-religious-data.ts
```

**Segurança:**
- Testa criptografia antes de aplicar
- Cria backup automático
- Verifica integridade pós-migração

---

## 6. AUDITORIA E MONITORAMENTO

### 6.1. Sistema de Auditoria (LGPD Art. 37)

#### 6.1.1. Eventos Auditados

```typescript
// server/middleware/auditLogger.ts
enum AuditAction {
  // Autenticação
  LOGIN, LOGOUT, LOGIN_FAILED,
  PASSWORD_CHANGE, PASSWORD_RESET_REQUEST,

  // Usuários
  USER_CREATE, USER_UPDATE, USER_DELETE,
  USER_STATUS_CHANGE, USER_ROLE_CHANGE,

  // Dados Pessoais (LGPD)
  PERSONAL_DATA_ACCESS,
  PERSONAL_DATA_UPDATE,
  PERSONAL_DATA_EXPORT,

  // Dados Religiosos (LGPD Art. 11)
  RELIGIOUS_DATA_ACCESS,
  RELIGIOUS_DATA_UPDATE,

  // Segurança
  RATE_LIMIT_EXCEEDED,
  CORS_BLOCKED,
  UNAUTHORIZED_ACCESS
}
```

#### 6.1.2. Uso do Middleware

```typescript
// Auditoria automática em rotas
router.post('/login', async (req, res) => {
  try {
    const result = await login(email, password);
    await auditLoginAttempt(email, true, req);
    // ...
  } catch (error) {
    await auditLoginAttempt(email, false, req, error.message);
  }
});

// Auditoria de dados pessoais
router.get('/profile',
  authenticateToken,
  auditPersonalDataAccess('personal'),
  async (req, res) => { /* ... */ }
);

// Auditoria de dados religiosos
router.put('/profile', async (req, res) => {
  // ...
  const hasReligiousData = /* check */;
  await logAudit(
    hasReligiousData
      ? AuditAction.RELIGIOUS_DATA_UPDATE
      : AuditAction.PERSONAL_DATA_UPDATE,
    { /* metadata */ }
  );
});
```

### 6.2. Logs Estruturados (Winston)

```typescript
// server/utils/logger.ts
logger.info('[AUDIT] LOGIN', {
  email,
  ip,
  userAgent,
  timestamp: new Date()
});

logger.error('[SECURITY] Rate limit exceeded', {
  email,
  ip,
  attempts: 5
});
```

**Sanitização Automática:**
- Senha, token, apiKey → `[REDACTED]`

### 6.3. Consulta de Logs de Auditoria

```sql
-- Atividades de um usuário específico
SELECT * FROM activity_logs
WHERE user_id = 'uuid'
ORDER BY created_at DESC;

-- Logins falhados nas últimas 24h
SELECT * FROM activity_logs
WHERE action = 'LOGIN_FAILED'
  AND created_at > NOW() - INTERVAL '24 hours';

-- Acesso a dados religiosos
SELECT * FROM activity_logs
WHERE action IN ('RELIGIOUS_DATA_ACCESS', 'RELIGIOUS_DATA_UPDATE')
ORDER BY created_at DESC;
```

---

## 7. BACKUP E RECUPERAÇÃO

### 7.1. Estratégia de Backup

#### 7.1.1. Tipos de Backup

| Tipo | Frequência | Retenção | Localização |
|------|-----------|----------|-------------|
| **Completo** | Diário (3h) | 30 dias | Local + Cloud |
| **Incremental** | 6h em 6h | 7 dias | Local |
| **Logs** | Tempo real | 90 dias | Cloud |

#### 7.1.2. Script de Backup

```bash
# Executar backup
npm run tsx scripts/backup-db.ts

# Com senha customizada
BACKUP_PASSWORD="senha-forte" npm run tsx scripts/backup-db.ts
```

**Características:**
- ✅ Compressão gzip
- ✅ Criptografia AES-256
- ✅ Timestamp no nome do arquivo
- ✅ Verificação de integridade
- ✅ Limpeza automática de backups antigos

### 7.2. Procedimento de Restore

```bash
# 1. Parar o servidor
pm2 stop mesc

# 2. Criar backup do estado atual
pg_dump -U postgres mesc > pre-restore-backup.sql

# 3. Restaurar backup
# Descompactar
gpg --decrypt backups/mesc-backup-2025-10-09T03-00-00.sql.gz.gpg | gunzip > restore.sql

# Restaurar no banco
psql -U postgres mesc < restore.sql

# 4. Verificar integridade
psql -U postgres mesc -c "SELECT COUNT(*) FROM users;"

# 5. Reiniciar servidor
pm2 start mesc
```

### 7.3. Testes de Recuperação

**Frequência:** Mensal

**Checklist:**
- [ ] Backup completo é criado
- [ ] Arquivo é criptografado
- [ ] Restore em ambiente de teste
- [ ] Verificação de integridade dos dados
- [ ] Documentar tempo de recuperação (RTO)

---

## 8. RESPOSTA A INCIDENTES

### 8.1. Classificação de Incidentes

| Nível | Descrição | Tempo de Resposta |
|-------|-----------|-------------------|
| 🔴 **P0 - Crítico** | Vazamento de dados sensíveis | Imediato (< 1h) |
| 🟠 **P1 - Alto** | Brecha de segurança ativa | < 4h |
| 🟡 **P2 - Médio** | Tentativa de ataque bloqueada | < 24h |
| 🟢 **P3 - Baixo** | Anomalia detectada | < 72h |

### 8.2. Fluxo de Resposta

```
┌─────────────────────┐
│  DETECÇÃO           │ → Alertas, logs, relatórios
└──────┬──────────────┘
       │
       ↓
┌─────────────────────┐
│  CLASSIFICAÇÃO      │ → P0/P1/P2/P3
└──────┬──────────────┘
       │
       ↓
┌─────────────────────┐
│  CONTENÇÃO          │ → Isolar sistema afetado
└──────┬──────────────┘
       │
       ↓
┌─────────────────────┐
│  INVESTIGAÇÃO       │ → Root cause analysis
└──────┬──────────────┘
       │
       ↓
┌─────────────────────┐
│  MITIGAÇÃO          │ → Correção da vulnerabilidade
└──────┬──────────────┘
       │
       ↓
┌─────────────────────┐
│  COMUNICAÇÃO        │ → ANPD (se necessário)
└──────┬──────────────┘        Usuários afetados
       │
       ↓
┌─────────────────────┐
│  DOCUMENTAÇÃO       │ → Post-mortem report
└─────────────────────┘
```

### 8.3. Incidentes Comuns e Resposta

#### 8.3.1. Tentativa de Acesso Não Autorizado

**Detecção:**
```sql
SELECT * FROM activity_logs
WHERE action = 'LOGIN_FAILED'
  AND ip_address = '...'
  AND created_at > NOW() - INTERVAL '1 hour';
```

**Resposta:**
1. Verificar se rate limit está funcionando
2. Adicionar IP à blacklist temporária (se múltiplas tentativas)
3. Notificar dono da conta

#### 8.3.2. Vazamento de Dados Sensíveis (P0)

**Ações Imediatas:**
1. ⚠️ **Isolar sistema** - Colocar em modo manutenção
2. 🔍 **Investigar escopo** - Quantos usuários afetados?
3. 🔒 **Revogar credenciais** - Invalidar todos os tokens JWT
4. 📞 **Notificar ANPD** - Dentro de 72h (LGPD Art. 48)
5. 📧 **Notificar usuários** - Email para afetados
6. 📝 **Documentar** - Criar relatório de incidente

#### 8.3.3. Ataque DDoS

**Detecção:**
```bash
# Ver requisições por IP
cat access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -10
```

**Resposta:**
1. Ativar CloudFlare DDoS protection
2. Aumentar rate limits temporariamente
3. Blacklist IPs atacantes
4. Contatar provedor de hospedagem

### 8.4. Comunicação à ANPD (LGPD Art. 48)

**Quando reportar:**
- Vazamento de dados pessoais
- Acesso não autorizado com impacto
- Incidente que gere risco aos titulares

**Prazo:** Até 72 horas

**Canal:** https://www.gov.br/anpd/pt-br/canais_atendimento

**Informações a incluir:**
- Descrição do incidente
- Dados afetados e quantidade de titulares
- Medidas técnicas adotadas
- Possíveis consequências
- Medidas para mitigar danos

---

## 9. COMPLIANCE LGPD

### 9.1. Checklist de Conformidade

#### Princípios (Art. 6º)
- [x] **Finalidade:** Declarada na política de privacidade
- [x] **Adequação:** Compatível com finalidades informadas
- [x] **Necessidade:** Apenas dados mínimos necessários
- [x] **Transparência:** Política pública e acessível
- [x] **Segurança:** Criptografia AES-256-GCM
- [x] **Prevenção:** Medidas para evitar danos
- [x] **Não discriminação:** Vedado uso discriminatório

#### Base Legal (Art. 7º)
- [x] Consentimento do titular (cadastro)
- [x] Execução de serviço (ministério)
- [x] Obrigação legal (direito canônico)

#### Dados Sensíveis (Art. 11)
- [x] Consentimento específico para dados religiosos
- [x] Criptografia AES-256-GCM
- [x] Auditoria de acesso e modificação

#### Direitos dos Titulares (Art. 18)
- [x] Confirmação de tratamento
- [x] Acesso aos dados
- [x] Correção
- [x] Anonimização ou exclusão
- [x] Portabilidade (em desenvolvimento)
- [x] Informação sobre compartilhamento
- [x] Revogação do consentimento

#### Segurança (Art. 46)
- [x] Medidas técnicas adequadas
- [x] Medidas administrativas adequadas
- [x] Proteção contra acesso não autorizado
- [x] Proteção contra destruição acidental

#### Auditoria (Art. 37)
- [x] Registro de operações
- [x] Data e hora
- [x] Origem da operação
- [x] Identificação do responsável

### 9.2. Encarregado de Dados (DPO)

**Email:** dpo@saojudastadeu.app
**Prazo de resposta:** 15 dias (Art. 18, § 3º)

**Responsabilidades:**
- Aceitar reclamações e comunicações
- Prestar esclarecimentos
- Adotar providências
- Orientar funcionários
- Ser canal de comunicação com ANPD

### 9.3. Relatório de Impacto (DPIA)

Ver documento: `DPIA_MESC.md`

---

## 10. CHECKLIST DE DEPLOY

### 10.1. Pré-Deploy

#### Ambiente
- [ ] Variáveis de ambiente configuradas
- [ ] `JWT_SECRET` gerado (64+ bytes)
- [ ] `ENCRYPTION_KEY` gerado (32 bytes)
- [ ] `ALLOWED_ORIGINS` configurado
- [ ] `.env` adicionado ao `.gitignore`

#### Banco de Dados
- [ ] PostgreSQL com SSL habilitado
- [ ] Backup inicial criado
- [ ] Script de migração executado
- [ ] Dados religiosos criptografados

#### Segurança
- [ ] HTTPS/TLS 1.3 configurado
- [ ] Certificado SSL válido
- [ ] Headers de segurança testados
- [ ] Rate limiting ativo
- [ ] CORS restrito

### 10.2. Deploy

```bash
# 1. Build da aplicação
npm run build

# 2. Executar migrações
npm run db:push

# 3. Criptografar dados existentes
npm run tsx scripts/encrypt-religious-data.ts

# 4. Criar backup pré-deploy
npm run tsx scripts/backup-db.ts

# 5. Deploy com PM2
pm2 start ecosystem.config.js --env production

# 6. Verificar logs
pm2 logs mesc
```

### 10.3. Pós-Deploy

#### Testes de Segurança
- [ ] Login funciona corretamente
- [ ] Rate limiting bloqueia após 5 tentativas
- [ ] CORS bloqueia origens não autorizadas
- [ ] HTTPS redirect ativo
- [ ] Cookies com flag `secure`
- [ ] CSP headers presentes
- [ ] Auditoria registrando eventos

#### Testes Funcionais
- [ ] CRUD de usuários
- [ ] Escalas de missas
- [ ] Substituições
- [ ] Formação
- [ ] Notificações

#### Monitoramento
- [ ] Configurar alertas (Sentry/similar)
- [ ] Monitorar logs de erro
- [ ] Dashboard de métricas
- [ ] Verificar backups diários

### 10.4. Hardening do Servidor

```bash
# Firewall
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP (redirect)
ufw allow 443/tcp  # HTTPS
ufw enable

# Fail2Ban (anti-brute force SSH)
apt-get install fail2ban
systemctl enable fail2ban

# Atualizações automáticas de segurança
apt-get install unattended-upgrades
dpkg-reconfigure --priority=low unattended-upgrades

# Desabilitar SSH root
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd
```

---

## 📚 REFERÊNCIAS

### Documentação Técnica
- [Helmet.js Security Headers](https://helmetjs.github.io/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

### Compliance
- [LGPD - Lei 13.709/2018](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [Guia ANPD](https://www.gov.br/anpd/pt-br)
- [GDPR (referência)](https://gdpr.eu/)

### Segurança
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Controls](https://www.cisecurity.org/controls)
- [ISO 27001/27002](https://www.iso.org/isoiec-27001-information-security.html)

---

## 📞 CONTATOS DE EMERGÊNCIA

| Função | Contato | Horário |
|--------|---------|---------|
| **DPO (Encarregado)** | dpo@saojudastadeu.app | 24/7 |
| **Suporte Técnico** | dev@saojudastadeu.app | Comercial |
| **ANPD** | https://www.gov.br/anpd | Comercial |
| **CERT.br** | cert@cert.br | 24/7 |

---

**Documento Atualizado em:** 2025-10-09
**Próxima Revisão:** 2026-01-09 (Trimestral)
**Classificação:** CONFIDENCIAL - DISTRIBUIÇÃO RESTRITA
