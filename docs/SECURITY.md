# Segurança - Sistema MESC

## 🔒 Visão Geral

Documentação completa das medidas de segurança implementadas no sistema MESC para proteger contra ataques comuns e garantir a integridade dos dados.

---

## 🛡️ Proteções Implementadas

### ✅ Rate Limiting

Sistema de limitação de taxa para prevenir:
- **Ataques de força bruta** em endpoints de autenticação
- **Abuso da API** e sobrecarga do servidor
- **Ataques DDoS** distribuídos

#### Configuração Atual

**1. Rate Limiting de Autenticação** (`authRateLimiter`)
```typescript
// Endpoints: /api/auth/*
Limite: 5 tentativas por 15 minutos por IP
Aplica-se a: Login, registro, logout
Status: 429 Too Many Requests quando excedido
```

**2. Rate Limiting de API Geral** (`apiRateLimiter`)
```typescript
// Endpoints: /api/*
Limite: 100 requisições por minuto por IP
Aplica-se a: Todas as rotas da API
Status: 429 Too Many Requests quando excedido
```

**3. Rate Limiting de Recuperação de Senha** (`passwordResetRateLimiter`)
```typescript
// Endpoints: /api/password-reset/*
Limite: 3 tentativas por hora por IP
Aplica-se a: Solicitações de reset de senha
Status: 429 Too Many Requests quando excedido
```

#### Resposta de Rate Limit Excedido

```json
{
  "error": "Rate limit excedido",
  "message": "Você excedeu o limite de requisições por minuto. Por favor, aguarde um momento.",
  "retryAfter": "1 minute"
}
```

**Headers de Rate Limit**:
- `RateLimit-Limit`: Número máximo de requests permitidos
- `RateLimit-Remaining`: Número de requests restantes
- `RateLimit-Reset`: Timestamp quando o limite resetará

---

### ✅ CSRF Protection

Proteção contra **Cross-Site Request Forgery** usando tokens criptográficos.

#### Como Funciona

1. **Geração de Token**: Servidor gera token CSRF único por sessão
2. **Armazenamento**: Token armazenado na sessão do usuário
3. **Validação**: Requests que modificam estado devem incluir token válido
4. **Verificação**: Middleware valida token antes de processar request

#### Endpoints Protegidos

**CSRF aplicado a todos os métodos que modificam estado**:
- `POST`, `PUT`, `PATCH`, `DELETE`

**Métodos seguros (sem proteção CSRF)**:
- `GET`, `HEAD`, `OPTIONS`

#### Uso no Frontend

**1. Obter Token CSRF**
```typescript
import { useCsrfToken } from '@/hooks/useCsrfToken';

function MyComponent() {
  const { csrfToken, isLoading } = useCsrfToken();

  // Token disponível em csrfToken
}
```

**2. Incluir Token em Requests**
```typescript
import { addCsrfHeader } from '@/hooks/useCsrfToken';

// Opção 1: Via Header
fetch('/api/users', {
  method: 'POST',
  headers: addCsrfHeader({
    'Content-Type': 'application/json'
  }, csrfToken),
  body: JSON.stringify(data)
});

// Opção 2: Via Body
fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ...data,
    _csrf: csrfToken
  })
});
```

#### Resposta de CSRF Inválido

```json
{
  "error": "CSRF token inválido",
  "message": "Token de segurança inválido. A requisição foi bloqueada por segurança."
}
```

Status: `403 Forbidden`

---

### ✅ CORS Configuration

Configuração de **Cross-Origin Resource Sharing** para controlar quais domínios podem acessar a API.

#### Configuração Padrão

```typescript
allowedOrigins: [
  'http://localhost:5000',
  'http://localhost:3000'
]

credentials: true // Permite cookies e headers de auth
methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
```

#### Configuração de Produção

Via variável de ambiente:
```bash
ALLOWED_ORIGINS=https://saojudastadeu.app,capacitor://localhost
```

Múltiplas origens devem ser separadas por vírgula. Em produção, o servidor deve aceitar apenas origens exatas configuradas; previews Replit devem ficar fora de produção.

Validação antes de publicar:
```bash
NODE_ENV=production npm run release:check:env
PRODUCTION_BASE_URL=https://saojudastadeu.app npm run release:check:health
```

---

## 🔐 Autenticação e Autorização

### JWT (JSON Web Tokens)

**Armazenamento**: HTTP-only cookies (não acessível via JavaScript)

**Expiração**: Configurável via `JWT_EXPIRATION` (padrão: 7 dias)

**Secret**: Via `JWT_SECRET` (obrigatório em produção)

#### Verificação de Token

Middleware `authenticateToken` valida:
- Token presente e não expirado
- Assinatura válida
- Usuário ainda existe no banco
- Usuário está ativo (`status: 'active'`)

### Controle de Acesso Baseado em Roles (RBAC)

**3 níveis de permissão**:

1. **Ministro** (`ministro`)
   - Acesso básico
   - Ver própria escala
   - Responder questionários
   - Solicitar substituições

2. **Coordenador** (`coordenador`)
   - Tudo de Ministro +
   - Gerenciar escalas
   - Ver todos os ministros
   - Aprovar substituições
   - Gerenciar horários de missa

3. **Gestor** (`gestor`)
   - Tudo de Coordenador +
   - Criar/editar/excluir usuários
   - Alterar roles de usuários
   - Acessar relatórios completos
   - Gerenciar configurações do sistema

#### Middleware de Role

```typescript
requireRole(['gestor', 'coordenador'])
```

**Resposta se role insuficiente**:
```json
{
  "error": "Acesso negado",
  "message": "Você não tem permissão para acessar este recurso"
}
```

Status: `403 Forbidden`

---

## 🔒 Proteção de Dados Sensíveis

### Passwords

- **Hash**: bcrypt com salt automático (10 rounds)
- **Validação**: Mínimo 6 caracteres (recomendado aumentar para 8+)
- **Armazenamento**: Nunca em texto plano
- **Reset**: Deve usar tokens criptográficos seguros

⚠️ **VULNERABILIDADE IDENTIFICADA**: Password reset usa `Math.random()` (INSEGURO)
- **Fix planejado**: Usar `crypto.randomBytes()` para tokens de reset

### Dados Pessoais (LGPD)

**Campos sensíveis**:
- CPF, RG
- Endereço completo
- Telefone, email
- Dados sacramentais (batismo, confirmação, casamento)
- Fotos de perfil

**Proteções**:
- Acesso restrito por role
- Logs de acesso (via `activity_logs`)
- Exclusão só permitida se sem atividade ministerial
- Headers de cache desabilitados para dados de usuários

### Sessões

- **Armazenamento**: PostgreSQL via `connect-pg-simple`
- **Secret**: Via `SESSION_SECRET` (obrigatório em produção)
- **Cookie**: HTTP-only, Secure (em HTTPS), SameSite
- **Expiração**: Configurável, com auto-logout por inatividade

---

## 📊 Logging e Auditoria

### Activity Logs

**Tabela**: `activity_logs`

**Eventos registrados**:
- Login/logout
- Criação/edição/exclusão de usuários
- Mudanças de role e status
- Criação/edição de escalas
- Solicitações de substituição
- Aprovações/rejeições

**Campos**:
```typescript
{
  id: string;
  userId: string;         // Quem fez a ação
  action: string;         // Tipo de ação
  targetType: string;     // Tipo de entidade afetada
  targetId: string;       // ID da entidade
  metadata: json;         // Dados adicionais
  ipAddress: string;      // IP de origem
  userAgent: string;      // Browser/app usado
  createdAt: timestamp;
}
```

### Request Logging

**Console logs** para:
- Todas as requests `/api/*`
- Duração de cada request
- Status HTTP de resposta
- Erros e exceções

**Formato**:
```
GET /api/users 200 in 45ms
```

---

## 🚨 Tratamento de Erros

### Errors Padronizados

```typescript
function handleApiError(error: any, operation: string) {
  // Retorna status e mensagem apropriados
  // Nunca expõe detalhes internos ao cliente
}
```

**Tipos de erro**:
- `400` Bad Request: Dados inválidos
- `401` Unauthorized: Não autenticado
- `403` Forbidden: Sem permissão
- `404` Not Found: Recurso não existe
- `409` Conflict: Violação de regra de negócio
- `429` Too Many Requests: Rate limit excedido
- `500` Internal Server Error: Erro interno

**Resposta de erro**:
```json
{
  "error": "Tipo do erro",
  "message": "Mensagem amigável ao usuário"
}
```

Em desenvolvimento, pode incluir `debug` com stack trace.

---

## 🛠️ Boas Práticas de Segurança

### ✅ Implementadas

1. ✅ Rate limiting em endpoints críticos
2. ✅ CSRF protection em rotas de modificação
3. ✅ CORS configurado com whitelist
4. ✅ JWT em HTTP-only cookies
5. ✅ Passwords com bcrypt
6. ✅ Controle de acesso baseado em roles
7. ✅ Validação de entrada com Zod
8. ✅ Logs de auditoria
9. ✅ Tratamento centralizado de erros
10. ✅ Headers de segurança (Cache-Control para dados sensíveis)

### ⚠️ Melhorias Pendentes

1. ⚠️ **Password reset tokens inseguros** (usa Math.random)
   - **Fix**: Migrar para `crypto.randomBytes(32).toString('hex')`

2. ⚠️ **Política de senhas fraca** (mínimo 6 caracteres)
   - **Recomendado**: Mínimo 8 caracteres + complexidade

3. ⚠️ **Sem 2FA** (autenticação de dois fatores)
   - **Considerar**: TOTP para gestores/coordenadores

4. ⚠️ **Sem headers de segurança HTTP**
   - **Adicionar**: Helmet.js middleware
   - Headers: HSTS, X-Frame-Options, CSP, etc.

5. ⚠️ **Logging limitado**
   - **Melhorar**: Winston/Pino para logs estruturados
   - **Adicionar**: Rotação de logs, níveis (debug, info, warn, error)

6. ⚠️ **Sem detecção de anomalias**
   - **Considerar**: Alertas para tentativas suspeitas

7. ⚠️ **Backups sem criptografia**
   - **Adicionar**: Criptografia GPG para arquivos de backup

---

## 📝 Checklist de Deployment

### Produção - Segurança

- [ ] `JWT_SECRET` configurado (64+ caracteres aleatórios)
- [ ] `SESSION_SECRET` configurado (64+ caracteres aleatórios)
- [ ] `ALLOWED_ORIGINS` definido com domínios de produção
- [ ] `DATABASE_URL` usa SSL (`?sslmode=require`)
- [ ] HTTPS habilitado (certificado SSL válido)
- [ ] Cookies com flag `Secure` (apenas HTTPS)
- [ ] Variáveis de ambiente não versionadas no Git
- [ ] Backups automáticos configurados
- [ ] Logs de auditoria habilitados
- [ ] Rate limiting testado e ativo
- [ ] CSRF protection ativo em produção
- [ ] Monitoramento de erros configurado
- [ ] Política de retenção de logs definida

---

## 🔍 Testes de Segurança

### Testes Manuais

**1. Rate Limiting**
```bash
# Testar limite de login (5 em 15 min)
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# 6ª tentativa deve retornar 429
```

**2. CSRF Protection**
```bash
# Tentar POST sem token (deve falhar)
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Hacker"}'
# Deve retornar 403 Forbidden
```

**3. CORS**
```bash
# Testar de origem não permitida
curl -X GET http://localhost:5000/api/users \
  -H "Origin: https://evil.com"
# Deve ser bloqueado pelo CORS
```

### Testes Automatizados

**Pendente**: Configurar Vitest com suíte de testes de segurança

**Cobertura planejada**:
- Rate limiting funciona
- CSRF tokens validados
- Autorização por role funciona
- Passwords nunca expostos
- Logs de auditoria criados

---

## 📞 Reporte de Vulnerabilidades

**Em caso de descoberta de vulnerabilidade**:

1. **NÃO** abrir issue público
2. Contatar equipe de DevOps diretamente
3. Incluir:
   - Descrição da vulnerabilidade
   - Passos para reproduzir
   - Impacto potencial
   - Sugestão de correção (se tiver)

**Tempo de resposta**: 48h úteis

---

## 📚 Referências

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [LGPD - Lei Geral de Proteção de Dados](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

---

**Última atualização**: Outubro 2025
**Versão**: 1.0
**Responsável**: Equipe MESC DevOps / Segurança
