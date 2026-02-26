# 🔍 AUDIT_REPORT.md — MESC — Auditoria Técnica Completa

> **Data:** 26 de fevereiro de 2026  
> **Auditor:** Graunt (Agente de Desenvolvimento)  
> **Versão do projeto:** 5.4.3  
> **Escopo:** Segurança, Qualidade de Código, Estrutura, Boas Práticas

---

## SUMÁRIO EXECUTIVO

O projeto MESC é uma aplicação web full-stack para gestão de escalas de ministros da sagrada comunhão. A arquitetura base é sólida (Express + React + Drizzle ORM + PostgreSQL), com várias proteções de segurança já implementadas. No entanto, existem **vulnerabilidades críticas de segurança**, arquivos de alto acoplamento (God Objects), cobertura de testes muito baixa e inconsistências de código que precisam ser corrigidas antes de qualquer expansão de features ou deploy em produção ampliada.

**Resumo por categoria:**

| Categoria | Nota | Status |
|-----------|------|--------|
| Estrutura do Projeto | 6/10 | ⚠️ Melhorias necessárias |
| Qualidade de Código | 5/10 | ⚠️ Problemas significativos |
| Segurança | 5/10 | 🔴 Vulnerabilidades críticas |
| Boas Práticas | 4/10 | 🔴 Deficiências importantes |

---

## 1. ESTRUTURA DO PROJETO

### 1.1 Organização Geral

A estrutura principal segue o padrão monorepo razoável com separação `client/server/shared`:

```
MESC/
├── client/          # Frontend React (Vite)
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       ├── lib/
│       └── hooks/
├── server/          # Backend Express
│   ├── routes/      # ~25 arquivos de rota
│   ├── services/    # Lógica de negócio
│   ├── middleware/  # Autenticação, CSRF, Rate Limit
│   ├── utils/       # Utilitários
│   └── seeds/       # Dados iniciais
└── shared/          # Tipos e schema compartilhados
```

### 1.2 Pontos Positivos

- Boa separação `client/server/shared` com alias configurados no Vite
- Módulos de rotas individualizados por domínio (`ministers.ts`, `schedules.ts`, etc.)
- Middleware organizado em diretório próprio
- `shared/schema.ts` como fonte única de verdade do modelo de dados
- `shared/validators/` e `shared/utils/` para lógica compartilhada
- Documentação em `server/docs/` e `server/seeds/README.md`

### 1.3 Problemas Identificados

#### ❌ Arquivos de teste/debug soltos na raiz do projeto

Os seguintes arquivos deveriam estar em `test/` ou ser removidos:

```
/test-fair-algorithm.ts
/test-questionnaire-formats.ts
/test-saints-api.js
/test-saints-debug.js
/test.js
/appwa.js
```

Esses arquivos poluem a raiz, misturando código de produção com artefatos de debugging.

#### ❌ Scripts temporários na raiz

```
/fix-schedules-errors.sh
/import-prod-data.sh
```

Scripts de operação ad-hoc ficaram na raiz. Deveriam estar em `/scripts/` (diretório que já existe) ou serem documentados e removidos.

#### ❌ Duplicação de configuração Drizzle

Existem dois arquivos de configuração para o Drizzle ORM:
- `drizzle.config.ts` — PostgreSQL (produção)
- `drizzle.config.sqlite.ts` — SQLite (desenvolvimento)

Isso causa confusão. O `drizzle.config.ts` principal exige `DATABASE_URL` obrigatoriamente, impossibilitando operações de migration em ambiente de desenvolvimento sem banco remoto.

**Correção:** Usar um único `drizzle.config.ts` com detecção de ambiente:
```typescript
dialect: process.env.DATABASE_URL ? 'postgresql' : 'sqlite'
```

#### ❌ Pastas de framework de agentes desnecessárias

As pastas `.bmad-core/`, `.bmad-creative-writing/` e `.bmad-infrastructure-devops/` contêm centenas de arquivos de um framework de IA não relacionado ao código da aplicação. Estas pastas deveriam estar no `.gitignore` ou removidas do repositório.

#### ❌ Pasta `archive/` com código comprometido

```
/archive/scripts-compromised-passwords/
/archive/scripts-test-debug/
```

Código arquivado relacionado a "passwords comprometidas" não deveria existir no repositório, mesmo em pasta de arquivo. Remover e garantir que nenhum secret foi commitado.

#### ⚠️ Nomenclatura inconsistente de arquivos

Mistura de convenções nos arquivos cliente:
- PascalCase: `MinistersDirectory.tsx`, `Profile.tsx`, `AdorationDraw.tsx`
- camelCase: `formation.tsx`, `communication.tsx`
- kebab-case: `change-password.tsx`, `not-found.tsx`, `terms-of-use.tsx`

**Recomendação:** Adotar um padrão único. Para React, `PascalCase` para componentes de página é o padrão da comunidade.

#### ⚠️ Migração com numeração com gap

```
0000_square_mister_sinister.sql
0001_green_malcolm_colcord.sql
0002_add_activity_logs.sql
0004_add_gamification.sql   ← gap: falta 0003
add_family_relationships.sql  ← sem número!
```

Migrations sem numeração sequencial e com nomes inconsistentes dificultam rastreabilidade e podem causar problemas em deploys.

---

## 2. QUALIDADE DE CÓDIGO

### 2.1 Pontos Positivos

- Uso consistente de TypeScript com tipos explícitos
- Validação de input com Zod nas rotas principais
- Uso de Drizzle ORM type-safe (evita SQL injection por padrão)
- `ApiError` class centralizada para tratamento de erros
- `asyncHandler` wrapper para captura automática de erros assíncronos
- Lazy loading implementado no React para code splitting
- Uso de `memoizee` para cache de operações custosas

### 2.2 God Objects — Violação Grave do SRP (Single Responsibility Principle)

#### ❌ `server/storage.ts` — 1875 linhas

Este arquivo agrega operações de banco de dados para TODOS os domínios do sistema (usuários, escalas, questionários, formação, notificações, etc.). É um **God Object** claro. Deveria ser decomposto em repositórios por domínio:

```
server/repositories/
├── userRepository.ts
├── scheduleRepository.ts
├── questionnaireRepository.ts
├── notificationRepository.ts
└── formationRepository.ts
```

#### ❌ `server/routes.ts` — 1574 linhas

O arquivo `routes.ts` é um monolito que importa todos os sub-routers, mas também contém lógica de negócio inline (formação, sanitização de dados, schemas Zod). Mistura responsabilidades de roteamento e serviços.

#### ❌ `shared/schema.ts` — 1673 linhas

O schema do banco de dados define 20+ tabelas, dezenas de enums e Zod schemas em um único arquivo. Deveria ser dividido por domínio:

```
shared/schema/
├── users.ts
├── schedules.ts
├── questionnaires.ts
├── formation.ts
└── index.ts
```

### 2.3 Duplicação de Lógica

#### ❌ Lógica de reset de senha triplicada

Existe lógica de reset de senha em **três lugares diferentes**:
1. `server/auth.ts` → função `resetPassword()`
2. `server/authRoutes.ts` → rota `POST /reset-password`
3. `server/passwordResetRoutes.ts` → arquivo completo de reset com aprovação de coordenador

Isso gera inconsistência: qual fluxo é o real? Qual está ativo?

#### ❌ Webhook WhatsApp duplicado

O webhook WhatsApp está **hardcoded em `server/index.ts`** (simulação sem processamento real) E declarado em `server/routes/whatsapp.ts` (com handleMessage real). A versão em `index.ts` responde antes do router processar, causando comportamento imprevisível:

```typescript
// server/index.ts - linha 147 (PROBLEMÁTICO)
app.post("/api/whatsapp/webhook", express.json(), async (req, res) => {
  // Simulação de resposta imediata (teste)
  res.status(200).send("Webhook executado com sucesso!"); // ← Intercepta antes do router!
  // Quando quiser ativar o processamento real, descomente:
  // await handleMessage(req.body);
});
```

O comentário "quando quiser ativar" indica código temporário que nunca foi limpo.

#### ⚠️ Sanitização de dados duplicada

Funções similares de sanitização existem em:
- `server/utils/userDataHelpers.ts`
- `server/routes.ts` (`sanitizeUserData`)
- `server/middleware/auditLogger.ts` (`sanitizeAuditData`)
- `server/utils/logger.ts` (sanitize interno)

Deveriam ser consolidadas em um único utilitário.

### 2.4 Inconsistências de Código

#### ⚠️ Mínimo de 6 vs 8 caracteres para senha

O schema de **login** aceita senhas com apenas 6 caracteres:
```typescript
// authRoutes.ts
const loginSchema = z.object({
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
});
```

Mas o schema de **registro** exige 8:
```typescript
const registerSchema = z.object({
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres')
});
```

Isso é inconsistente. O login deveria usar o mesmo mínimo do registro.

#### ⚠️ Uso de `any` implícito

```typescript
role: userData.role as any || 'ministro'  // server/auth.ts
```

Uso de `as any` para contornar tipagem é má prática.

#### ⚠️ Client tem duas camadas de API paralelas

O cliente tem dois sistemas de API em uso:
1. `client/src/services/api.ts` → `ApiService` class com métodos `get/post/put/delete`
2. `client/src/lib/queryClient.ts` → `apiRequest()` função direta com fetch

Ambos são usados em diferentes partes do cliente, sem padronização.

### 2.5 Console.log excessivo

Existem **1293 ocorrências** de `console.log/error/warn` espalhadas no código do servidor, mesmo havendo um `logger` centralizado (Winston-based). Isso resulta em:
- Logs sem timestamp/nível estruturado
- Dados sensíveis potencialmente logados sem sanitização
- Logs de debug em produção

```typescript
// Exemplos problemáticos encontrados:
console.log("🔥 Recebido POST direto em /api/whatsapp/webhook");
console.log("📦 Corpo recebido:", req.body);  // ← Loga BODY inteiro em produção!
console.log(`💬 Mensagem de ${from}: ${body}`);
```

### 2.6 Raw SQL Desnecessário

Em `server/services/formationService.ts`, há uso de `db.execute(sql\`...\`)` quando Drizzle ORM tem APIs type-safe equivalentes. Isso aumenta risco de SQL injection se parâmetros não forem sanitizados corretamente.

---

## 3. SEGURANÇA

### 3.1 Pontos Positivos

- ✅ `bcrypt` com salt rounds 10 para hash de senhas
- ✅ JWT Secret obrigatório via env — lança erro crítico se ausente
- ✅ Rate limiting implementado por email+IP (não apenas IP)
- ✅ Helmet configurado com HSTS, noSniff, XSS filter, referrer-policy
- ✅ CORS com allowlist explícita
- ✅ Proteção CSRF via Content-Type header
- ✅ Auditoria de ações (LGPD compliance)
- ✅ Sanitização de dados sensíveis nos logs (REDACTED)
- ✅ `requiresPasswordChange` implementado para senhas temporárias
- ✅ Verificação de status de usuário a cada requisição (não apenas no token)
- ✅ AES-256-GCM implementado para dados sacramentais (LGPD)
- ✅ Anti-enumeration de emails no reset de senha

### 3.2 Vulnerabilidades Identificadas

---

#### 🔴 CRÍTICO — JWT armazenado em localStorage

**Arquivo:** `client/src/lib/auth.ts` (linha 96-97)

```typescript
localStorage.setItem('token', data.token);
localStorage.setItem('auth_token', data.token); // duplicado!
```

JWT em `localStorage` é vulnerável a **ataques XSS**: qualquer script malicioso injetado na página pode roubar o token e se passar pelo usuário.

O backend **já emite o token como cookie HttpOnly** (em `authRoutes.ts`), mas o frontend ainda guarda uma cópia no localStorage "para compatibilidade". Isso anula completamente a proteção do cookie.

**Correção:** Remover o token do localStorage. Usar exclusivamente o cookie HttpOnly emitido pelo servidor. Ajustar todas as chamadas API para não enviar `Authorization: Bearer` quando o cookie estiver disponível.

---

#### 🔴 CRÍTICO — Webhook WhatsApp sem autenticação em `server/index.ts`

**Arquivo:** `server/index.ts` (linha 147)

```typescript
app.post("/api/whatsapp/webhook", express.json(), async (req, res) => {
  // Sem qualquer verificação de origem, API key ou assinatura
  res.status(200).send("Webhook executado com sucesso!");
});
```

Este endpoint registrado no `index.ts` não tem nenhuma autenticação e **intercepta todas as chamadas** antes do roteador principal. Qualquer pessoa pode fazer POST para `/api/whatsapp/webhook` e obter resposta 200.

**Correção:** Remover este endpoint do `index.ts`. Usar exclusivamente o router em `server/routes/whatsapp-api.ts` que tem autenticação via API Key. Adicionar verificação de assinatura HMAC do provedor (Z-API ou similar).

---

#### 🔴 CRÍTICO — `trust proxy: true` sem restrição de IPs

**Arquivo:** `server/index.ts` (linha 29)

```typescript
app.set("trust proxy", true);
```

Configurar `trust proxy: true` faz o Express confiar em qualquer IP informado via `X-Forwarded-For`. Isso permite que um atacante **falsifique seu IP** para bypassar o rate limiter, enviando:
```
X-Forwarded-For: 1.2.3.4
```

**Correção:** Especificar o número de proxies ou os IPs dos proxies confiáveis:
```typescript
app.set("trust proxy", 1); // Confiar apenas no primeiro proxy
// ou
app.set("trust proxy", "loopback, linklocal, uniquelocal");
```

---

#### 🔴 ALTO — CORS aceita qualquer subdomínio `*.replit.dev`

**Arquivo:** `server/index.ts` (linha 101-106)

```typescript
if (
  origin.includes(".replit.dev") ||
  origin.includes(".replit.com") ||
  origin.includes(".replit.app")
) {
  return true; // Qualquer projeto Replit pode acessar!
}
```

Isso significa que **qualquer aplicação hospedada no Replit** pode fazer requisições autenticadas para a API MESC, incluindo projetos maliciosos de terceiros que saibam a URL da API.

**Correção:** Especificar os slugs exatos permitidos:
```typescript
const ALLOWED_REPLIT_SLUGS = ['mesc-saojudastadeu', 'mesc-staging'];
const isAllowedReplit = ALLOWED_REPLIT_SLUGS.some(slug => origin.includes(slug));
```

---

#### 🟠 ALTO — CSP com `unsafe-inline` e `unsafe-eval`

**Arquivo:** `server/index.ts` (linha 38-42)

```typescript
scriptSrc: [
  "'self'",
  "'unsafe-inline'",  // ← Permite execução de scripts inline!
  "'unsafe-eval'",    // ← Permite eval()!
  "https://cdn.jsdelivr.net",
],
```

`'unsafe-inline'` e `'unsafe-eval'` praticamente anulam as proteções do CSP contra XSS. Com essas diretivas, um atacante que consiga injetar HTML na página pode executar JavaScript arbitrário.

**Correção para produção:**
```typescript
scriptSrc: ["'self'", "'nonce-{gerado por requisição}'"],
// Remover unsafe-inline e unsafe-eval
// Usar hash ou nonce para scripts inline legítimos
```

Para desenvolvimento, pode-se usar diretivas mais permissivas. Usar `process.env.NODE_ENV` para diferenciar.

---

#### 🟠 ALTO — Token JWT duplicado em cookie + localStorage

**Arquivos:** `authRoutes.ts` e `client/src/lib/auth.ts`

O servidor emite o JWT como cookie HttpOnly (correto), mas o frontend salva uma cópia no localStorage E em `auth_token` (inconsistência). Além de duplicar a superfície de ataque, cria inconsistências quando um expira e o outro não.

**Correção:** Escolher uma estratégia única. Recomendado: cookie HttpOnly apenas.

---

#### 🟠 ALTO — `validate: false` no rate limiter

**Arquivo:** `server/middleware/rateLimiter.ts`

```typescript
export const apiRateLimiter = rateLimit({
  validate: false, // Desabilita proteções padrão do express-rate-limit!
  ...
});
```

A opção `validate: false` desativa verificações de segurança internas do `express-rate-limit`, incluindo a validação de que `trust proxy` está configurado corretamente. O código usa isso como "solução" para evitar warnings do Replit, mas remove proteções reais.

**Correção:** Corrigir o `trust proxy` para um valor específico e remover `validate: false`.

---

#### 🟡 MÉDIO — `imageData` armazenada como Base64 no banco de dados

**Arquivo:** `shared/schema.ts` e `server/routes/upload.ts`

```typescript
imageData: text('image_data'), // Base64 encoded image data
```

Armazenar imagens de perfil como Base64 em coluna `text` no banco de dados é má prática:
- Dados podem ter centenas de KB por usuário
- Degrada performance das queries que selecionam usuários
- PostgreSQL não é otimizado para blobs grandes em colunas text

**Correção:** Usar armazenamento de objetos (S3, Cloudflare R2, Supabase Storage) ou pelo menos servir os arquivos via filesystem.

---

#### 🟡 MÉDIO — Senha mínima 6 caracteres no schema de login

**Arquivo:** `server/authRoutes.ts` (linha 23)

```typescript
password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
```

O registro exige 8 caracteres, mas o login aceita 6. Isso significa que usuários com senha de 6-7 caracteres podem existir, e o schema de registro não impede isso caso o código de registro seja chamado com o schema errado.

**Correção:** Padronizar para `min(8)` em todos os schemas de senha.

---

#### 🟡 MÉDIO — Criptografia de dados sacramentais não obrigatória

**Arquivo:** `server/utils/encryption.ts`

O sistema implementa corretamente AES-256-GCM (`encrypt()`, `decrypt()`). No entanto, não há middleware ou validação garantindo que os campos sacramentais do banco (baptismParish, confirmationParish, etc.) sejam sempre criptografados antes do insert. A função `encryptIfNeeded()` existe mas precisa ser chamada explicitamente.

**Risco:** Dados religiosos (protegidos pela LGPD Art. 11) podem ser inseridos sem criptografia por um desenvolvedor que esqueça de chamar `encrypt()`.

**Correção:** Usar hooks do Drizzle ORM (`$defaultFn`) ou middleware de repositório que aplique criptografia automaticamente.

---

#### 🟡 MÉDIO — `console.log(req.body)` em produção

**Arquivo:** `server/index.ts` (linha 152)

```typescript
console.log("📦 Corpo recebido:", req.body);
```

Loga o corpo inteiro do request em produção, podendo expor dados sensíveis enviados pelo usuário nos logs do servidor.

---

## 4. BOAS PRÁTICAS

### 4.1 Testes

#### Cobertura de Testes — 3.5% (Meta: 40%)

```
Statements:  2.930 / 82.704 =  3.5%   🔴 (meta: 40%)
Branches:      493 /  1.029 = 47.9%   ✅
Functions:     119 /    597 = 19.9%   🔴 (meta: 40%)
```

A estrutura de testes existe e é bem organizada:
```
test/
├── unit/
│   ├── server/     # 16 arquivos de teste
│   └── shared/     # 3 arquivos
├── integration/    # 4 arquivos
└── load/           # Testes de carga
```

Porém, com apenas 3.5% de cobertura de statements, a maior parte do código não tem qualquer teste. Os endpoints principais (schedules, ministers, questionnaires, formation) têm testes de integração esboçados mas insuficientes.

**Áreas críticas sem teste:**
- `server/storage.ts` (1875 linhas, lógica central)
- `server/services/scheduleGenerator.ts` (algoritmo de geração de escala)
- `server/services/whatsappHandler.ts` (integração externa)
- Fluxo completo de login/logout com cookies

### 4.2 Documentação

**Positivo:**
- `.env.example` muito bem documentado com instruções claras
- `server/docs/LITURGICAL_SYSTEM_IMPLEMENTATION.md` e `QUESTIONNAIRE_MANAGEMENT.md`
- `server/seeds/README.md` e `server/migrations/README.md`
- JSDoc em funções de criptografia e auditoria
- `replit.md` com instruções de deployment

**Faltando:**
- Documentação de API (sem Swagger/OpenAPI)
- README.md principal com arquitetura, setup local e guia de contribuição
- Comentários em algoritmos complexos (`scheduleGenerator.ts`)

### 4.3 Configuração de Ambiente

O `.env.example` é excelente — documenta todas as variáveis necessárias, inclui comandos para gerar secrets, e tem avisos de segurança. 

**Problema:** O arquivo `.replit` e as referências a `REPLIT_DEPLOYMENT=1` no `.env.example` indicam que o ambiente de produção está no Replit. Para uma aplicação com dados religiosos sensíveis (LGPD), é recomendável documentar e planejar a migração para infraestrutura própria (VPS com backup controlado).

### 4.4 Error Handling

**Positivo:**
- `ApiError` class com factory methods bem implementada
- `asyncHandler()` wrapper disponível
- `handleZodError()` e `handleDatabaseError()` para tipos específicos
- `notFoundHandler` para rotas não mapeadas

**Problema:**
Apesar do sistema centralizado existir, muitas rotas ainda fazem tratamento inline:
```typescript
// Padrão problemático encontrado em múltiplas rotas:
} catch (error) {
  console.error("Error fetching ministers:", error);
  res.status(500).json({ message: "Erro ao buscar ministros" });
}
```

Isso faz com que erros de banco passem para o usuário sem o tratamento adequado do `ApiError`, e evita que o middleware centralizado (`errorHandler`) funcione corretamente.

### 4.5 Logging

- `server/utils/logger.ts` — logger centralizado com sanitização de dados sensíveis ✅
- Winston mencionado no `package.json` como dependência mas o logger implementado usa apenas `console.*` internamente
- 1293 `console.log` diretos ainda no código do servidor (não usam o logger centralizado)
- Sem integração com Sentry (DSN no `.env.example` mas não no código)

### 4.6 Banco de Dados e Migrations

- `drizzle-kit push` como estratégia de migration (sem histórico rastreável em produção)
- Apenas 4-5 arquivos de migration para um schema com 1673 linhas (sugerindo que `db:push` foi o método principal)
- Migration faltando: 0003 está ausente (vai de 0002 para 0004)
- `add_family_relationships.sql` sem número sequencial

**Risco:** `drizzle-kit push` em produção pode causar perda de dados em mudanças destrutivas (drop de colunas, renaming). Recomenda-se usar `drizzle-kit generate` + `drizzle-kit migrate` com histórico de migrations.

---

## 5. TOP 10 PROBLEMAS MAIS GRAVES

### #1 — CRÍTICO: JWT armazenado em localStorage (XSS Theft)

**Arquivos:** `client/src/lib/auth.ts`, `client/src/services/auth.service.ts`  
**CVSS:** 8.8 (Alto)

O token JWT é salvo em localStorage, exposto a qualquer script XSS. O servidor já emite o token via cookie HttpOnly, mas o cliente faz uma cópia — anulando a proteção.

**Correção:**
```typescript
// REMOVER COMPLETAMENTE:
localStorage.setItem('token', data.token);
localStorage.setItem('auth_token', data.token);

// Usar exclusivamente o cookie HttpOnly emitido pelo servidor.
// Ajustar queryClient.ts para não enviar Authorization header
// (o cookie será enviado automaticamente com credentials: 'include')
```

---

### #2 — CRÍTICO: Webhook WhatsApp sem autenticação intercepta todas as requisições

**Arquivo:** `server/index.ts` (linha 147-165)  
**CVSS:** 7.5 (Alto)

Endpoint hardcoded no `index.ts` sem qualquer autenticação, respondendo sempre 200 e bloqueando o processamento real do webhook.

**Correção:**
```typescript
// REMOVER do index.ts — mover completamente para server/routes/whatsapp-api.ts
// que já tem autenticação por API Key
// Adicionar verificação de assinatura HMAC do Z-API
```

---

### #3 — CRÍTICO: `trust proxy: true` permite bypass de rate limiting

**Arquivo:** `server/index.ts` (linha 29)  
**CVSS:** 7.3 (Alto)

Qualquer cliente pode forjar IP via `X-Forwarded-For` e contornar rate limiting, permitindo ataques de força bruta ilimitados no login.

**Correção:**
```typescript
app.set("trust proxy", 1); // Especificar número de proxies, não true
```

---

### #4 — ALTO: CORS permissivo para toda plataforma Replit

**Arquivo:** `server/index.ts` (linha 101-108)  
**CVSS:** 6.5 (Médio)

Qualquer projeto hospedado no Replit pode fazer requisições autenticadas à API.

**Correção:** Usar slugs explícitos ou verificar header `Origin` contra lista estrita.

---

### #5 — ALTO: CSP com `unsafe-inline` e `unsafe-eval` em produção

**Arquivo:** `server/index.ts` (linha 38-42)  
**CVSS:** 6.1 (Médio)

Neutraliza praticamente toda a proteção do Content-Security-Policy contra XSS.

**Correção:** Implementar nonces por requisição e remover diretivas unsafe:
```typescript
scriptSrc: ["'self'", `'nonce-${generateNonce(res)}'`],
```

---

### #6 — ALTO: Cobertura de testes em 3.5% (meta: 40%)

**Risco:** Funcional / Qualidade  
**Impacto:** Regressões não detectadas, bugs em produção

Com apenas 3.5% de cobertura, mudanças em código crítico (algoritmo de escala, autenticação, substituições) não têm proteção contra regressão.

**Correção:**
1. Priorizar testes do `scheduleGenerator.ts` e `storage.ts`
2. Implementar testes de integração para fluxos críticos (login, criação de escala, substituição)
3. Configurar CI/CD para falhar se cobertura cair abaixo de 40%

---

### #7 — ALTO: God Objects — storage.ts (1875 linhas) e routes.ts (1574 linhas)

**Risco:** Manutenibilidade / SRP  
**Impacto:** Alta complexidade ciclomática, difícil de testar, merge conflicts frequentes

**Correção:** Decompor em repositórios e routers por domínio (ver seção 2.2).

---

### #8 — ALTO: 1293 console.log sem uso do logger centralizado

**Risco:** Segurança (dados expostos) / Operacional  
**Impacto:** Dados de usuários potencialmente logados em produção sem sanitização

**Destaque especial:** `console.log("📦 Corpo recebido:", req.body)` em `index.ts` loga o body completo de CADA webhook em produção.

**Correção:**
```typescript
// Substituir todos os console.log/error/warn pelo logger:
import { logger } from './utils/logger';
logger.debug('Webhook recebido', { from, bodyLength: JSON.stringify(req.body).length });
```

---

### #9 — MÉDIO: Webhook WhatsApp duplicado — código morto com mensagem enganosa

**Arquivo:** `server/index.ts`

```typescript
// Quando quiser ativar o processamento real, descomente:
// await handleMessage(req.body);
```

Este comentário indica que a funcionalidade real nunca foi ativada. O webhook intercepta requisições antes do router e responde "sucesso" sem processar nada. Isso pode causar perda silenciosa de mensagens WhatsApp.

**Correção:** Remover o bloco do `index.ts` completamente. Ativar o `handleMessage` no router correto com autenticação adequada.

---

### #10 — MÉDIO: Dados sacramentais sem garantia de criptografia aplicada

**Arquivo:** `shared/schema.ts`, `server/utils/encryption.ts`  
**Regulação:** LGPD Art. 11 (dados religiosos = dados sensíveis)

A infraestrutura de criptografia AES-256-GCM existe e é bem implementada, mas não há enforcement automático. Campos como `baptismParish`, `confirmationParish`, `marriageParish` podem ser inseridos sem criptografia se um desenvolvedor esquecer de chamar `encrypt()`.

**Correção:**
```typescript
// Implementar hooks de repositório ou middleware Drizzle:
export const usersRepository = {
  async insert(data: InsertUser) {
    return db.insert(users).values({
      ...data,
      baptismParish: encrypt(data.baptismParish),
      confirmationParish: encrypt(data.confirmationParish),
      marriageParish: encrypt(data.marriageParish),
    });
  }
};
```

---

## APPENDIX A — Problemas Adicionais (Menor Prioridade)

| Severidade | Problema | Localização |
|------------|----------|-------------|
| BAIXO | `as any` para tipo de role | `server/auth.ts` |
| BAIXO | `bcrypt` e `bcryptjs` ambos instalados | `package.json` |
| BAIXO | `openid-client` e `passport`/`passport-local` instalados mas aparentemente não usados ativamente | `package.json` |
| BAIXO | Pasta `attached_assets/` com arquivos no repositório (pode ter imagens sensíveis) | raiz |
| BAIXO | `data-exports/` no repositório (dados exportados de produção?) | raiz |
| BAIXO | `upload/` directory sem .gitignore explícito | raiz |
| BAIXO | `appwa.js` na raiz — arquivo Node.js sem documentação ou uso claro | raiz |
| BAIXO | Inconsistência de versão do Express types: `@types/express: 4.17.21` enquanto express é `^4.21.2` | `package.json` |
| BAIXO | `gluestack-mcp/` pasta no projeto sem documentação | raiz |
| BAIXO | Arquivo `drizzle.config.sqlite.ts` duplicado | raiz |

---

## APPENDIX B — Checklist de Ação Imediata (Quick Wins)

### Esta semana (antes de qualquer deploy novo):

- [ ] **Remover JWT do localStorage** — usar apenas cookie HttpOnly
- [ ] **Remover webhook WhatsApp do `index.ts`** — código morto e sem auth
- [ ] **Corrigir `trust proxy: true`** → `trust proxy: 1`
- [ ] **Adicionar verificação de token HMAC** no webhook WhatsApp
- [ ] **Remover `console.log(req.body)`** do webhook em produção

### Próximas 2 semanas:

- [ ] Corrigir CORS para allowlist estrita de slugs Replit
- [ ] Remover `unsafe-inline`/`unsafe-eval` do CSP (requer refactor de scripts inline)
- [ ] Padronizar mínimo de senha para 8 caracteres em todos os schemas
- [ ] Adicionar testes para `scheduleGenerator.ts` e fluxo de auth

### Próximo mês:

- [ ] Decompor `storage.ts` em repositórios por domínio
- [ ] Migrar todos os `console.log` para o logger centralizado
- [ ] Implementar Sentry para monitoramento de erros em produção
- [ ] Documentar API com OpenAPI/Swagger
- [ ] Criar README.md principal com setup e arquitetura
- [ ] Corrigir gaps nas migrations e adotar `generate` + `migrate`

---

*Relatório gerado em 26/02/2026 por Graunt — Agente de Desenvolvimento MESC*
