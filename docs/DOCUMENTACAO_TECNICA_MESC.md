# Documentação Técnica – Sistema MESC
## Análise de Engenharia Reversa – Projeto MESC

**Data da Análise:** Dezembro 2025  
**Status:** Modo Leitura (Read-Only) - Sem Alterações de Código  
**Arquivo Base:** Projeto Full-Stack JavaScript/TypeScript em Replit

---

## 1. Visão Geral da Arquitetura

### Stack Tecnológico

| Camada | Tecnologia | Versão | Propósito |
|--------|-----------|--------|----------|
| **Frontend** | React 18 + TypeScript | ^18.3.1 | Interface de usuário |
| **Build Frontend** | Vite | ^5.4.19 | Bundler e dev server |
| **Roteamento Frontend** | Wouter | ^3.3.5 | Roteamento client-side |
| **Estado Frontend** | TanStack Query (React Query) | ^5.60.5 | Gerenciamento de estado servidor |
| **UI Components** | Radix UI + shadcn/ui | v1.x-v2.x | Biblioteca de componentes |
| **Styling** | Tailwind CSS + PostCSS | ^3.4.17 | Estilo e temas |
| **Backend** | Express.js | ^4.21.2 | Web framework |
| **ORM** | Drizzle ORM | ^0.39.3 | Abstração de banco dados |
| **Database Prod** | PostgreSQL (Neon) | Serverless | Banco relacional em produção |
| **Database Dev** | SQLite (better-sqlite3) | ^12.2.0 | Banco local em desenvolvimento |
| **Autenticação** | JWT + bcrypt | - | Segurança e sessões |
| **Validação** | Zod + Drizzle-Zod | ^3.25.76 | Validação de schemas |
| **Comunicação Real-time** | WebSocket (ws) | ^8.18.0 | Notificações em tempo real |
| **Linguagem** | TypeScript | 5.6.3 | Type-safety |

### Padrão Arquitetural Identificado

**Padrão: Monolito Modular com Separação Frontend/Backend**

- **Frontend:** Arquitetura SPA (Single Page Application) baseada em componentes React
- **Backend:** Arquitetura RESTful com rotas modulares separadas por domínio (schedules, questionnaires, formations, etc.)
- **Comunicação:** JSON via HTTP (REST) + WebSocket para notificações em tempo real
- **Persistência:** ORM agnóstico (Drizzle) que suporta múltiplos bancos (PostgreSQL/SQLite)

**Características:**
- Modularização por domínio (não por camada)
- Separação clara entre código cliente e servidor
- Compartilhamento de tipos via pasta `shared/`
- Lazy loading de páginas para otimização
- Caching multi-camada (backend em memória + frontend com React Query)

---

## 2. Estrutura de Diretórios Anotada

### Raiz do Projeto

```
MESC/
├── client/                          # Frontend React (Vite)
├── server/                          # Backend Express.js
├── shared/                          # Código compartilhado (schemas, tipos, constantes)
├── public/                          # Arquivos estáticos (icons, manifest PWA)
├── scripts/                         # Scripts de utilidade (migrations, backups, análise)
├── test/                            # Testes unitários e integração (Vitest)
├── migrations/                      # Migrações de banco de dados
├── sql/                             # Scripts SQL raw para operações específicas
├── docs/                            # Documentação interna
├── package.json                     # Dependências Node.js
├── tsconfig.json                    # Configuração TypeScript
├── vite.config.ts                   # Configuração Vite (build frontend)
├── drizzle.config.ts                # Configuração Drizzle ORM
└── replit.md                        # Documentação do projeto em Replit
```

### Estrutura Detalhada por Pasta

#### **client/** – Frontend React
```
client/src/
├── pages/                           # Páginas/rotas (lazy-loaded)
│   ├── dashboard.tsx               # Dashboard principal (coordenadores/gestores)
│   ├── login.tsx                   # Login e autenticação
│   ├── register.tsx                # Registro de novo ministro
│   ├── Schedules.tsx               # Visualização e edição de escalas
│   ├── Substitutions.tsx           # Pedidos de substituição
│   ├── QuestionnaireUnified.tsx    # Questionário de disponibilidade
│   ├── AutoScheduleGeneration.tsx  # Geração automática de escalas (coordenador)
│   ├── AdorationDraw.tsx           # Sorteio para adoração eucarística
│   ├── MinistersDirectory.tsx      # Diretório de ministros
│   ├── Profile.tsx                 # Perfil do ministro
│   ├── formation.tsx               # Formação e treinamento
│   ├── Reports.tsx                 # Relatórios (coordenador/gestor)
│   ├── Metrics.tsx                 # Métricas do sistema (coordenador/gestor)
│   ├── Settings.tsx                # Configurações
│   ├── communication.tsx           # Comunicação com ministros
│   ├── approvals.tsx               # Aprovação de registros
│   ├── UserManagement.tsx          # Gestão de usuários (gestor)
│   ├── change-password.tsx         # Mudança de senha
│   └── not-found.tsx               # Página 404
├── components/                      # Componentes reutilizáveis
│   ├── ui/                         # Componentes shadcn/ui
│   ├── cached-auth-guard.tsx       # Guard para rotas autenticadas
│   ├── theme-provider.tsx          # Provider de temas (light/dark)
│   ├── pwa-update-prompt.tsx       # Prompt para atualização PWA
│   ├── SessionIndicator.tsx        # Indicador de sessão ativa
│   └── [outros componentes]
├── hooks/                           # Custom React Hooks
│   ├── useVersionCheck.ts          # Verifica atualização de versão
│   ├── useActivityMonitor.ts       # Monitora inatividade (logout automático)
│   ├── use-toast.ts                # Hook para notificações toast
│   └── [outros hooks]
├── services/                        # Serviços de API (axios wrappers)
│   ├── api.ts                      # Cliente HTTP genérico
│   └── [serviços específicos]
├── lib/                             # Utilitários
│   ├── queryClient.ts              # Configuração TanStack Query
│   ├── cacheManager.ts             # Gerenciamento de cache
│   └── [utilitários]
├── config/                          # Configurações estáticas
│   ├── routes.ts                   # Rotas da aplicação
│   └── constants.ts                # Constantes globais
├── App.tsx                          # Componente raiz (routing)
├── main.tsx                         # Entry point (cria root React)
└── index.css                        # Estilos globais e variáveis CSS
```

**Responsabilidade:** Interface gráfica interativa, roteamento cliente, gerenciamento de estado local e cache de requisições

#### **server/** – Backend Express.js
```
server/
├── routes/                          # Rotas/endpoints organizados por domínio
│   ├── auth.ts                     # Autenticação (login, logout, sessão)
│   ├── questionnaires.ts           # Endpoints de questionários
│   ├── schedules.ts                # Endpoints de escalas
│   ├── substitutions.ts            # Endpoints de substituições
│   ├── ministers.ts                # Endpoints de ministros
│   ├── dashboard.ts                # Endpoints de dashboard (estatísticas)
│   ├── formation*.ts               # Endpoints de formação
│   ├── auxiliaryPanel.ts           # Painel auxiliar durante missa
│   ├── notifications.ts            # Endpoints de notificações
│   ├── metrics.ts                  # Endpoints de métricas (gestor/coordenador)
│   ├── reports.ts                  # Endpoints de relatórios
│   ├── adoration.ts                # Endpoints de adoração eucarística
│   ├── whatsapp*.ts                # Integrações WhatsApp
│   └── [26 rotas totais]
├── services/                        # Lógica de negócio reutilizável
│   ├── scheduleGenerator.ts        # ⭐ Algoritmo de geração de escalas (fair algorithm)
│   ├── questionnaireParser.ts      # Parser de respostas de questionário
│   ├── questionnaireService.ts     # Serviço de questionários
│   ├── availabilityService.ts      # Verificação de disponibilidade
│   ├── scheduleCache.ts            # Cache em memória de escalas mensais
│   ├── reliabilityScoreService.ts  # ⭐ Sistema de pontuação adaptativo (ADAPTIVE LEARNING)
│   ├── formationService.ts         # Gerenciamento de formação
│   ├── whatsappHandler.ts          # Handler de mensagens WhatsApp
│   └── [10 serviços totais]
├── utils/                           # Utilitários e helpers
│   ├── scheduleGenerator.ts        # Gerador alternativo (possível duplicação)
│   ├── logger.ts                   # Sistema de logging (Winston)
│   ├── liturgicalCalculations.ts   # Cálculos litúrgicos (datas, ciclos)
│   ├── nameFormatter.ts            # Formatação de nomes
│   ├── csvExporter.ts              # Exportação para CSV
│   ├── encryption.ts               # Criptografia de dados sensíveis
│   ├── activityLogger.ts           # Log de atividades de usuário
│   └── [15+ utilitários]
├── middleware/                      # Middlewares Express
│   ├── csrf.ts                     # Proteção CSRF
│   ├── rateLimiter.ts              # Rate limiting por endpoint
│   ├── noCacheHeaders.ts           # Headers para desabilitar cache
│   └── auditLogger.ts              # Log de auditoria
├── db.ts                            # Configuração de banco de dados
│   └── Suporta PostgreSQL (prod) e SQLite (dev)
├── auth.ts                          # Lógica de autenticação e JWT
├── authRoutes.ts                    # Rotas de autenticação
├── passwordResetRoutes.ts           # Rotas de reset de senha
├── storage.ts                       # Camada de abstração de dados (interface)
├── routes.ts                        # Registro de todas as rotas
├── index.ts                         # Entry point (cria servidor Express)
├── websocket.ts                     # Configuração de WebSocket
├── vite.ts                          # Middleware Vite para dev
├── seedAdmin.ts                     # Seed de usuário admin
├── migrations/                      # Migrações de banco de dados
│   ├── migrateQuestionnaireResponses.ts
│   ├── standardizeQuestionnaireResponses.ts
│   └── SQL scripts
├── seeds/                           # Dados iniciais (seeds)
│   ├── formation-seed.ts          # Seed de formação
│   ├── testAccounts.ts            # Contas de teste
│   ├── liturgicalCalendar.ts      # Calendário litúrgico
│   └── saintsCalendar.ts          # Calendário de santos
├── tests/                           # Testes do backend
├── public/                          # Assets servidos estaticamente
│   ├── assets/                     # SVGs, CSS bundled
│   ├── images/                     # Icons PWA
│   ├── sw.js                       # Service Worker
│   └── manifest.json               # Manifest PWA
├── escala-alternativa/              # Implementação alternativa (possível abandono)
│   ├── controllers/
│   ├── routes/
│   └── services/
└── docs/                            # Documentação interna
```

**Responsabilidade:** API RESTful, gerenciamento de banco de dados, lógica de negócio complexa, autenticação, notificações

#### **shared/** – Código Compartilhado
```
shared/
├── schema.ts                        # ⭐ Definição de TODAS as tabelas Drizzle
│   └── 43 tabelas/enums com tipos TypeScript
├── constants.ts                     # Constantes globais
├── constants/
│   ├── massConfig.ts              # Configuração de missas
│   └── liturgicalThemes.ts        # Temas litúrgicos
├── utils/
│   ├── dateHelpers.ts             # Utilitários de data
├── validators/
│   └── questionnaireValidator.ts  # Validadores Zod
```

**Responsabilidade:** Compartilhamento de tipos TypeScript, schemas Drizzle ORM, constantes, validadores Zod

---

## 3. Arquivos Principais

### Entry Points

| Arquivo | Propósito | Tipo |
|---------|----------|------|
| `client/src/main.tsx` | Cria root React e monta em DOM | Frontend |
| `client/src/App.tsx` | Componente raiz com rotas | Frontend |
| `server/index.ts` | Cria servidor Express, Vite, WebSocket | Backend |
| `package.json` | Define scripts: `npm run dev` inicia tudo | Configuração |

### Configuração Crítica

| Arquivo | Propósito |
|---------|----------|
| `vite.config.ts` | Build frontend, aliases (@/, @shared), proxy para API |
| `tsconfig.json` | Compilação TS, aliases de imports |
| `drizzle.config.ts` | Configuração ORM, migrations |
| `server/db.ts` | Detecção de BD (PostgreSQL/SQLite), inicialização Drizzle |

### Schemas e Tipos

| Arquivo | Tabelas Definidas |
|---------|------------------|
| `shared/schema.ts` | **43 tabelas/enums**: users, questionnaires, schedules, substitutionRequests, formations, notifications, families, etc. |

---

## 4. Fluxo de Execução

### Ciclo de Vida: Do Clique à Persistência

#### **Exemplo 1: Ministro Marcando Disponibilidade no Questionário**

```
1. FRONTEND (Client-Side)
   └─ Usuário clica em "Responder Questionário" em /questionnaire
      └─ React Query executa: useQuery({ queryKey: ['/api/questionnaires/active'] })
         └─ Fetch GET /api/questionnaires/active via axios

2. BACKEND (Node.js/Express)
   └─ GET /api/questionnaires/active (autenticado)
      └─ middleware: authenticateToken (verifica JWT)
         └─ route handler: busca questionnaire ativo (status='published')
            └─ Drizzle ORM: SELECT * FROM questionnaires WHERE status='published'
               └─ PostgreSQL/SQLite executa query
                  └─ Retorna questionnaire com questions[] (JSON)

3. FRONTEND (continua)
   └─ useQuery resolve com dados
      └─ React renderiza formulário dinamicamente (ShaderCN Forms + React Hook Form)
      └─ Usuário preenche: "Sim" em 3 domingos + "Não" em weekdays
      └─ Clica "Enviar"

4. FRONTEND (Mutation)
   └─ useMutation({
       mutationFn: (data) => apiRequest('POST', '/api/questionnaire-responses', { 
         questionnaireId, responses: { format_version: '2.0', ... }
       })
     })
   └─ Valida com Zod schema (insertQuestionnaireResponseSchema)
   └─ POST /api/questionnaire-responses com payload JSON

5. BACKEND (Persistência)
   └─ POST /api/questionnaire-responses (autenticado)
      └─ middleware: validateRequest (Zod)
      └─ route handler: 
         └─ Verifica se resposta anterior existe (soft-delete ou UPSERT)
         └─ Drizzle ORM: INSERT questionnaire_responses 
            └─ SQL: INSERT INTO questionnaire_responses 
                    (user_id, questionnaire_id, responses, created_at) 
                    VALUES (?, ?, ?, NOW())
               └─ PostgreSQL/SQLite persiste

6. BACKEND (Cache Invalidation)
   └─ queryClient.invalidateQueries({ queryKey: ['/api/questionnaires'] })
   └─ Cache local React Query é limpo

7. BACKEND (Real-time Notification)
   └─ notifyQuestionnaireResponseSubmitted(userId, questionnaireId)
   └─ WebSocket broadcasts para coordenadores ouvindo em /ws

8. FRONTEND (Update UI)
   └─ Toast success: "Disponibilidade registrada com sucesso"
   └─ Router redireciona: /schedules
```

#### **Exemplo 2: Coordenador Gerando Escala com Fair Algorithm**

```
1. FRONTEND
   └─ Coordenador clica "Gerar Escala para Dezembro" em /schedules/auto-generation
   └─ POST /api/schedules/generate-smart com { month: 12, year: 2025 }

2. BACKEND
   └─ POST /api/schedules/generate-smart (requireRole: 'coordenador'|'gestor')
      └─ Busca questionário publicado do mês (Drizzle)
         └─ Busca respostas do questionário (43 ministros responderam)
            └─ Busca configuração de missas (dominicais, especiais, diárias)

3. BACKEND (Core Algorithm - scheduleGenerator.ts: 3033 linhas)
   └─ ScheduleGenerator.generate()
      └─ Carrega ministros disponíveis por:
         ├─ Respostas do questionário (v2.0 format com weekdays, masses, special_events)
         ├─ Confiabilidade (reliabilityScore adaptativo)
         ├─ Histórico de serviços (lastService, totalServices)
         └─ Preferências (preferredMassTimes, preferredPositions)
      
      └─ Fair Distribution Algorithm:
         ├─ Ordena missas por prioridade:
         │  ├─ Celebrações especiais (Natal, Finados, etc.) → máxima prioridade
         │  ├─ Domingos festivos → alta prioridade
         │  └─ Domingos regulares → normal
         │
         ├─ Para cada missa:
         │  ├─ Filtra ministros com:
         │  │  ├─ Disponibilidade marcada (do questionário)
         │  │  ├─ Horário preferido ou sem preferência
         │  │  ├─ Posição compatível
         │  │  └─ <= 4 escalas no mês (limite de rotação)
         │  │
         │  ├─ Ordena por:
         │  │  ├─ Confiabilidade (reliabilityScore descending)
         │  │  ├─ Tempo desde último serviço (maior intervalo = prioritário)
         │  │  └─ Cumprimento de preferências de horário
         │  │
         │  └─ Seleciona melhor candidato
         │
         └─ Integração com Adoração (Nov 2025):
            └─ Sorteio automático segunda-feira 22h para ministros escalados

4. BACKEND (Persistência da Escala)
   └─ Drizzle ORM: INSERT schedules (múltiplas linhas em transação)
      └─ Cada linha: { date, time, ministerId, position, status: 'draft' }
      └─ PostgreSQL/SQLite persiste atomicamente

5. BACKEND (Cache Strategy)
   └─ scheduleCache.invalidateByDate(date) para cada data afetada
      └─ Limpa cache em memória (Map com 1h TTL)
   └─ queryClient.invalidateQueries({ queryKey: ['/api/schedules'], exact: false })
      └─ Invalida React Query cache

6. FRONTEND (Real-time Update)
   └─ WebSocket notifica coordenadores: "Escala gerada"
   └─ AUTO-REFRESH de /api/schedules/by-month/:date

7. FRONTEND (Review & Publish)
   └─ Coordenador vê escala em STATUS='draft'
   └─ Pode: editar, validar, ou publicar
   └─ PUT /api/schedules/:id com changes (Drag-drop com @dnd-kit)
   └─ POST /api/schedules/publish quando validada
      └─ UPDATE schedules SET status='published'
      └─ WebSocket notifica ministros: "Sua escala para dezembro foi publicada"
```

#### **Exemplo 3: Substituição de Ministro**

```
1. FRONTEND
   └─ Ministro clica "Solicitar Substituição" em missa escalada
   └─ Modal abre: pode indicar substituto ou deixar aberto
   └─ POST /api/substitutions com { scheduleId, substituteId?, reason }

2. BACKEND
   └─ POST /api/substitutions (requireAuth)
      └─ Valida: ministro é o escalado? (schedule.ministerId === userId)
      └─ Valida: missa ainda não passou? (compara local time vs UTC FIXADO)
      └─ Calcula urgência: calculateUrgency(date, time)
         ├─ < 12h antes → "critical"
         ├─ < 24h antes → "high"
         ├─ < 72h antes → "medium"
         └─ > 72h antes → "low"
      └─ Status da solicitação:
         ├─ Se substituteId indicado → status='pending' (aguarda resposta)
         └─ Se sem indicação → status='available' (quadro público)
      └─ Drizzle: INSERT substitutionRequests

3. BACKEND (Substituto Automático - Opcional)
   └─ findAvailableSubstitute(date, time):
      ├─ Busca ministros com disponibilidade para aquela data
      ├─ Exclui quem já está escalado
      ├─ Ordena por: lastService (mais antigo primeiro)
      └─ Retorna top 1 se existir

4. BACKEND (Reliability Tracking - ADAPTIVE LEARNING)
   └─ trackSubstitutionRequest(requesterId):
      └─ Incrementa user.substitutionRequestCount
      └─ Pode decrementar reliabilityScore se muitas requisições

5. FRONTEND (Real-time)
   └─ WebSocket: coordenadores recebem notificação em tempo real
      └─ Dashboard mostra: "Pedido de substituição - CRITICAL (2h antes)"
   └─ Ministro que foi indicado recebe notificação:
      └─ "Você foi indicado para substituição em 05/12 às 10:00"

6. BACKEND (Resposta de Substituição)
   └─ POST /api/substitutions/:id/respond com { response: 'accepted'|'rejected' }
      └─ Transação ACID:
         ├─ UPDATE substitutionRequests SET status='approved'
         ├─ UPDATE schedules SET ministerId=substituteId (swap de ministros)
         └─ Tudo ou nada (atomicidade garantida)
      └─ trackSubstitutionFulfillment(substituteId) → Aumenta confiabilidade

7. FRONTEND (Notificação ao Solicitante)
   └─ WebSocket: ministro que pediu vê: "Substituição aceita por João"
```

---

## 5. Fluxo de Dados: Cliente ↔ Servidor ↔ Banco

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Pages (lazy-loaded) → Components → Hooks (useQuery)    │   │
│  │                                                          │   │
│  │ State Management:                                       │   │
│  │ • Local: useState, useContext                          │   │
│  │ • Server: TanStack Query (queryClient)                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                    HTTP REST / WebSocket
                    (JSON + JWT auth)
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│                       BACKEND (Express)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Middleware: Auth, CSRF, RateLimit, Validation         │   │
│  │                                                          │   │
│  │ Routes: /api/schedules, /api/questionnaires, etc       │   │
│  │                                                          │   │
│  │ Services:                                              │   │
│  │ • scheduleGenerator (Fair Algorithm - 3033 linhas)    │   │
│  │ • questionnaireParser, availabilityService            │   │
│  │ • reliabilityScoreService (ADAPTIVE LEARNING)         │   │
│  │ • scheduleCache (In-Memory 1h TTL)                    │   │
│  │                                                          │   │
│  │ Real-time: WebSocket notificações broadcast           │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                    Drizzle ORM (agnóstico)
                                 │
         ┌───────────────────────┴───────────────────────┐
         │                                               │
    PRODUÇÃO                                        DESENVOLVIMENTO
    ↓                                               ↓
┌────────────────────────┐              ┌────────────────────────┐
│ PostgreSQL (Neon)      │              │ SQLite (better-sqlite3)│
│ Serverless             │              │ File: local.db         │
│ (DATABASE_URL env)     │              │ (sem env: fallback)    │
│                        │              │                        │
│ Tabelas: 43            │              │ Mesma schema Drizzle   │
│ Enums: 14              │              │                        │
│ Índices: Otimizados    │              │ Dev/test rápido        │
└────────────────────────┘              └────────────────────────┘
```

---

## 6. Lógica de Negócio

### Processos Críticos

#### **A. Geração de Escalas (Fair Algorithm)**

**Arquivo Chave:** `server/utils/scheduleGenerator.ts` (3033 linhas)

**Fluxo:**
1. **Input**: Mês/ano, questionnaires respondidas, ministros ativos
2. **Processamento**:
   - Ordena missas por prioridade liturgica
   - Para cada missa: filtra ministros disponíveis
   - Aplica fair distribution (máx 4 escalas/mês por ministro)
   - Respeita preferências de horário e posição
   - Calcula confiabilidade (reliability score adaptativo)
3. **Output**: Escala em status `draft`
4. **Validação**: Coordenador pode editar antes de publicar

#### **B. Sistema de Substituições**

**Arquivo Chave:** `server/routes/substitutions.ts` (842 linhas)

**Estados:**
- `available`: Aberto para qualquer ministro responder
- `pending`: Indicação específica, aguardando resposta
- `approved`: Aceito, escala atualizada
- `rejected`: Rejeitado
- `cancelled`: Cancelado pelo solicitante
- `auto_approved`: Auto-aprovado (> 12h antes da missa)

**Urgência:**
- `critical`: < 12h antes
- `high`: < 24h
- `medium`: < 72h
- `low`: > 72h

#### **C. Questionário de Disponibilidade (v2.0)**

**Formato JSON Padronizado:**
```json
{
  "format_version": "2.0",
  "weekdays": {
    "segunda": ["Sim para missas", "Não", ...],
    "terça": [...],
    ...
  },
  "masses": {
    "2025-12-07 10:00": "Sim",
    "2025-12-14 10:00": "Não",
    ...
  },
  "special_events": {
    "custom_1763406457753": "Sim",  // Natal
    "custom_1763406270069": "Não",  // Finados
    ...
  },
  "canSubstitute": true,
  "preferredMassTimes": ["10:00", "18:30"],
  "availableSundays": ["2025-12-07 10:00", "2025-12-14 08:00"]
}
```

**Lógica de Disponibilidade:**
- As respostas do questionário são o veredicto
- Sem fallback: se não marcou, não está disponível
- Compatibilidade com formatos legados mantida para dados antigos

#### **D. Sistema Adaptativo de Confiabilidade (ADAPTIVE LEARNING)**

**Arquivo Chave:** `server/services/reliabilityScoreService.ts`

**Métrica: `reliabilityScore` (0-100)**

**Comportamentos Rastreados:**
- ✅ Cumprimento de escalas (lastService)
- ✅ Aceitação de substituições (substitutionFulfilledCount)
- ❌ Pedidos frequentes de substituição (substitutionRequestCount)
- ❌ Não-comparecimento (noShowCount)
- ❌ Remoção manual por coordenador (manualRemovalCount)

**Impacto:**
- Score > 90: Prioridade em geração de escala
- Score 50-90: Normal
- Score < 50: Reduz prioridade, mais verificações

**Privacidade:**
- Score ocultado de ministros (sanitizeUserData)
- Visível apenas para coordenadores/gestores

#### **E. Adoração Eucarística (Novembro 2025)**

**Processo:**
1. Sorteio automático: seleciona ministros para segunda-feira 22h
2. Prioridade: ministros escalados em outras missas no mês
3. Equitativo: cada ministro máx 1 adoração/mês
4. Integração: atualiza schedule automaticamente

---

## 7. Banco de Dados

### Estrutura (43 Tabelas + 14 Enums)

#### **Tabelas Principais**

| Tabela | Função |
|--------|---------|
| **users** | Ministros, coordenadores, gestores com dados pessoais e preferências |
| **questionnaires** | Formulários de disponibilidade mensal (ativo: status='published') |
| **questionnaire_responses** | Respostas do ministro ao questionário (formato v2.0 JSONB) |
| **schedules** | Escalas geradas: { date, time, ministerId, position, status } |
| **substitution_requests** | Pedidos de substituição com urgência e status |
| **families** | Agrupamento de ministros da mesma família |
| **family_relationships** | Relações familiares (spouse, parent, sibling) |
| **formations** | Cursos e trilhas de formação |
| **formation_lessons** | Lições dentro de um curso |
| **formation_progress** | Progresso do ministro em formação |
| **notifications** | Log de notificações enviadas |
| **push_subscriptions** | Subscriptions para notificações push (PWA) |
| **adoration_draws** | Sorteios para adoração eucarística |
| **adoration_draw_results** | Resultado do sorteio (ministro → segunda-feira 22h) |

#### **Enums**

```typescript
user_role: ['gestor', 'coordenador', 'ministro']
user_status: ['active', 'inactive', 'pending']
schedule_status: ['draft', 'published', 'completed']
substitution_status: ['available', 'pending', 'approved', 'rejected', 'cancelled', 'auto_approved']
urgency_level: ['low', 'medium', 'high', 'critical']
formation_status: ['not_started', 'in_progress', 'completed']
liturgical_cycle: ['A', 'B', 'C']
celebration_rank: ['SOLEMNITY', 'FEAST', 'MEMORIAL', 'OPTIONAL_MEMORIAL', 'FERIAL']
```

#### **Migrations e Scripts**

| Arquivo | Propósito |
|---------|----------|
| `server/migrations/standardizeQuestionnaireResponses.ts` | Conversão de formatos legados para v2.0 |
| `sql/production-update-finados-availability.sql` | Updates específicas de events especiais |
| `scripts/add-database-indexes.ts` | Criação de índices para performance |

#### **Índices Críticos**

```sql
-- Supostamente em db (Drizzle auto-gerencia):
IDX_session_expire (sessions.expire)
IDX_minister_questionnaire (questionnaire_responses.userId, questionnaireId)
IDX_schedule_date (schedules.date)
IDX_schedule_minister (schedules.ministerId)
IDX_substitution_status (substitutionRequests.status)
```

---

## 8. Dependências Externas

### Dependências Críticas

| Pacote | Versão | Propósito | Risco |
|--------|--------|----------|-------|
| **react** | ^18.3.1 | Framework UI | Baixo (estável) |
| **express** | ^4.21.2 | Web framework | Baixo (maduro) |
| **drizzle-orm** | ^0.39.3 | ORM | Médio (em evolução) |
| **@tanstack/react-query** | ^5.60.5 | State management servidor | Baixo |
| **zod** | ^3.25.76 | Validação runtime | Baixo |
| **jsonwebtoken** | ^9.0.2 | Auth tokens | Baixo |
| **bcrypt** | ^6.0.0 | Password hashing | Baixo |
| **ws** | ^8.18.0 | WebSocket | Médio (real-time) |
| **helmet** | ^8.1.0 | Security headers | Baixo |
| **@radix-ui/\*** | v1.x-v2.x | UI components headless | Baixo (muitas dependências) |
| **tailwindcss** | ^3.4.17 | CSS utility-first | Baixo |
| **vite** | ^5.4.19 | Build tool | Baixo |
| **sharp** | ^0.34.3 | Image processing | Médio (native bindings) |
| **openai** | ^6.5.0 | GPT integration | Médio (depends on API) |
| **web-push** | ^3.6.7 | Push notifications | Médio |

### Possíveis Problemas

- **Sharp**: Dependência nativa (C++) pode falhar em alguns ambientes
- **OpenAI**: Requer API key, não integrado completamente
- **Multer**: Upload de arquivos, necessário validar tamanhos
- **better-sqlite3**: SQLite nativa, pode falhar em ambientes restritivos

---

## 9. Dívida Técnica e Pontos de Atenção

### 🔴 Críticos

#### **1. Duplicação: scheduleGenerator**
- `server/utils/scheduleGenerator.ts` (3033 linhas) - Implementação principal
- `server/services/scheduleGenerator.ts` - Possível cópia desatualizada?
- `server/utils/scheduleGeneratorV2.ts` - Outra versão?
- **Impacto**: Confusão sobre qual usar, bugs em versões diferentes
- **Recomendação**: Auditar qual é a versão ativa e consolidar

#### **2. Estrutura Alternativa Abandonada**
- Pasta `server/escala-alternativa/` com controllers Python (`gerar_escala.py`)
- Rota `escalaAlternativaRoutes` registrada mas possivelmente não usada
- **Impacto**: Código morto, confusão de arquitetura
- **Recomendação**: Remover ou documentar status

#### **3. Lógica de Timezone Frágil**
- Mistura de `new Date()` (local) com `Date.UTC()` (UTC)
- Especialmente em `substitutions.ts`: comparações podem falhar
- **Impacto**: Erros de lógica temporal, substituições bloqueadas
- **Status**: PARCIALMENTE CORRIGIDO em 12/2025 (removido Date.UTC de substitutions)
- **Recomendação**: Auditoria completa de timezone em todo backend

#### **4. Soft-Delete Inconsistente**
- `questionnaire_responses` usa soft-delete (`is_deleted` boolean)
- Outras tabelas podem não implementar corretamente
- **Impacto**: Dados "deletados" ainda retornam em queries
- **Recomendação**: Criar middleware que automatize soft-delete

#### **5. WebSocket vs Polling Ambiguo**
- Sistema suporta WebSocket mas também tem polling fallback
- Não claro quando usar qual
- **Impacto**: Overhead de rede, latência aumentada
- **Recomendação**: Documentar estratégia de real-time (preferência por WebSocket)

### 🟡 Médios

#### **6. Cache em Memória Sem Invalidação Automática**
- `scheduleCache.ts` usa `Map` em memória com 1h TTL
- Se servidor reinicia, cache perdido
- **Impacto**: Inconsistência se múltiplas instâncias
- **Recomendação**: Considerar Redis para cache distribuído em produção

#### **7. Muitos Scripts de Análise/Debug**
- Pasta `scripts/` tem 100+ arquivos `.ts` (migrate, analyze, check, debug)
- Muitos possivelmente outdated ou de teste
- **Impacto**: Clutter, difícil manutenção
- **Recomendação**: Arquivar ou limpar scripts antigos

#### **8. Validação de Formulários Duplicada**
- Validação acontece em: frontend (Zod), middleware (Zod), schema (Drizzle)
- **Impacto**: Código repetido, inconsistências
- **Recomendação**: Centralizar em middleware reutilizável

#### **9. Error Handling Genérico**
- Muitas rotas retornam `500` sem discriminar tipo de erro
- **Impacto**: Difícil debugar, UI não pode reagir específicamente
- **Recomendação**: Usar error codes estruturados (ex: SCHEDULE_NOT_FOUND)

#### **10. Documentação de API Ausente**
- Nenhum OpenAPI/Swagger encontrado
- Documentação in-code comentários
- **Impacto**: Difícil para novos devs entender endpoints
- **Recomendação**: Gerar documentação OpenAPI automaticamente

### 🟢 Menores

#### **11. Formação Incompletamente Implementada**
- Tabelas existem mas muitos endpoints stub
- **Impacto**: Feature incompleto, possível confusão
- **Recomendação**: Completar ou remover

#### **12. Nome Inconsistente de Colunas**
- `photoUrl` vs `profileImageUrl` para fotos de usuário
- `massTime` vs `time` em diferentes contextos
- **Impacto**: Confusão no mapeamento
- **Recomendação**: Padronizar nomenclatura

#### **13. Excesso de Consoles.log**
- Muitos `console.log` com prefixos (`[Substitutions]`, etc)
- Ruído em logs
- **Recomendação**: Usar logger centralizado (Winston já disponível)

#### **14. Comments em Português e Inglês Misturados**
- Código predominantemente em PT-BR mas alguns comentários em EN
- **Impacto**: Confusão visual
- **Recomendação**: Padronizar linguagem

---

## 10. Pontos de Atenção – Riscos e Áreas Frágeis

### Áreas Críticas para Debugging

| Área | Risco | Sintoma | Debug |
|------|-------|--------|-------|
| **Timezone** | Alto | Substitições bloqueadas, datas erradas | Verificar `new Date()` vs UTC em `/substitutions.ts` |
| **Disponibilidade** | Alto | Ministros não aparecem como disponíveis | Verificar formato v2.0 em `questionnaireResponses` |
| **Cache Stale** | Médio | Dados antigos aparecem após mudança | Limpar `scheduleCache` em `/api/metrics/clear-cache` |
| **Confiabilidade** | Médio | Score não atualiza | Audit `reliabilityScoreService.ts` |
| **WebSocket** | Médio | Notificações não chegam em tempo real | Verificar `/websocket.ts` e `notifySubstitutionRequest()` |
| **Validação** | Médio | Dados inválidos persistem | Verificar middleware CSRF e Zod em `/routes.ts` |
| **Soft-Delete** | Médio | Registros deletados retornam | Adicionar `is_deleted=false` em WHERE clauses |
| **Geração de Escala** | Alto | Escala vazia ou incorreta | Audit `scheduleGenerator.ts` com logs detalhados |

### Campos Possível mente Desatualizados

- `server/escala-alternativa/` - Possível abandono
- `server/utils/scheduleGeneratorV2.ts` - Versão concorrente?
- `server/routes/testScheduleGeneration.ts` - Rota de teste?
- Muitos arquivos em `scripts/` com nomes antigos (check-eliane.ts, debug-oct-29.ts)

### Duplicações Confirmadas

1. **scheduleGenerator**: 3 versões diferentes em diretórios distintos
2. **availabilityService**: Lógica em services/ e utils/ possivelmente duplicada
3. **Rotinas de migration**: Múltiplos arquivos para mesma tarefa (migration.ts, migrateQuestionnaireResponses.ts, standardizeQuestionnaireResponses.ts)

---

## 11. Fluxo de Construção e Deploy

### Build Process

```bash
# Development
npm run dev
  ↓
NODE_ENV=development tsx server/index.ts
  ├─ Carrega Vite em dev mode
  ├─ Compila React com hot-reload
  ├─ Carrega Express com rotas
  ├─ Inicializa banco (PostgreSQL se DATABASE_URL, senão SQLite)
  └─ Server em http://localhost:5000

# Production
npm run build
  ├─ node scripts/inject-version.js (injeta versão em build)
  ├─ vite build (compila frontend para dist/public/)
  ├─ esbuild server/index.ts (bundle backend para dist/index.js)
  └─ Resultado: dist/ pronto para deploy

npm run start
  ↓
NODE_ENV=production node dist/index.js
  ├─ Serve frontend estático de dist/public/
  ├─ Express API endpoints
  └─ Produção em :5000
```

### Service Worker e PWA

- `public/sw.js` - Service Worker com cache busting por timestamp
- `public/manifest.json` - Manifest PWA (offline-first)
- Build timestamp injetado para forçar atualização de cache

### Database Migrations

```bash
npm run db:push          # Apply migrations (safe)
npm run db:push --force  # Force apply (destructive)
npm run db:studio       # Drizzle Studio para gerenciar dados visualmente
```

---

## 12. Segurança Observada

### Implementado

✅ **Autenticação JWT** - Tokens em cookies httpOnly
✅ **CSRF Protection** - Tokens CSRF em /api/csrf-token
✅ **Rate Limiting** - Limitador por endpoint (auth, login, etc)
✅ **Helmet.js** - Headers de segurança (CSP, HSTS, etc)
✅ **CORS** - Whitelist de origens
✅ **Password Hashing** - bcrypt salt rounds 10
✅ **Role-Based Access** - Middleware `requireRole` para endpoints sensíveis
✅ **Input Validation** - Zod schema antes de persistência

### Não Implementado / Gaps

⚠️ **Rate Limiting Global** - Apenas em auth, não em todos endpoints
⚠️ **Encryption at Rest** - Senhas hashed mas não criptografia BD
⚠️ **Audit Logging Completo** - Apenas atividade básica registrada
⚠️ **API Versioning** - Todos endpoints em /api sem versionamento
⚠️ **SQL Injection Prevention** - Confiado em Drizzle ORM (seguro, mas sem verificação adicional)

---

## 13. Performance Observada

### Otimizações

| Item | Status | Detalhe |
|------|--------|---------|
| **Code Splitting (Frontend)** | ✅ | Lazy-load de páginas com React.lazy() |
| **Lazy Route Loading** | ✅ | Rotas carregam sob demanda |
| **Vendor Bundling** | ✅ | Chunks separados para React, Router, Query, UI |
| **Cache Backend** | ✅ | scheduleCache (1h TTL em memória) |
| **Cache Frontend** | ✅ | React Query com staleTime config |
| **Database Indexes** | ⚠️ | Presumivelmente criados, não verificados |
| **Image Compression** | ✅ | Sharp para resize de avatares |
| **Gzip Compression** | ✅ | Vite minify + Terser |
| **Service Worker** | ✅ | Offline-first, cache de assets |

### Bottlenecks Prováveis

- **Geração de Escala**: 3033 linhas, algoritmo O(n²) em pior caso
- **Múltiplas Queries**: Sem eager loading em algumas rotas (N+1)
- **Cache Perdido**: Reinicialização = cache limpo
- **WebSocket Fan-out**: Broadcasts para muitos coordenadores podem travar

---

## Conclusão: Mapa Mental

```
MESC System
│
├── Frontend (React + Vite)
│   ├── Pages: 15+ lazy-loaded
│   ├── Components: 100+ shadcn/ui
│   ├── Hooks: useQuery, useActivityMonitor, useVersionCheck
│   ├── State: TanStack Query + localStorage
│   └── Build: Vite com code-splitting
│
├── Backend (Express + TypeScript)
│   ├── Routes: 26 módulos (~200 endpoints)
│   ├── Services: 10 lógica de negócio
│   ├── Middleware: Auth, CSRF, RateLimit, Validation
│   ├── Database: PostgreSQL (prod) / SQLite (dev)
│   ├── Real-time: WebSocket + polling fallback
│   └── Core Algo: Fair Algorithm scheduling (3033 linhas)
│
├── Database (43 Tabelas + 14 Enums)
│   ├── Users/Families: Ministros + relações
│   ├── Questionnaires: Disponibilidade mensal (v2.0 format)
│   ├── Schedules: Escalas geradas + publicadas
│   ├── Substitutions: Pedidos com urgência
│   ├── Formations: Trilhas de formação
│   ├── Notifications: Log e WebSocket pushes
│   └── Adoration: Sorteios para adoração
│
├── Dívida Técnica
│   ├── 🔴 Duplicação de scheduleGenerator (3 versões)
│   ├── 🔴 Timezone mixed (UTC + local)
│   ├── 🔴 escala-alternativa abandonada?
│   ├── 🟡 100+ scripts desorganizados
│   ├── 🟡 Soft-delete inconsistente
│   └── 🟡 Sem OpenAPI docs
│
└── Segurança
    ├── ✅ JWT + bcrypt
    ├── ✅ CSRF tokens
    ├── ✅ Rate limiting auth
    ├── ✅ Helmet headers
    ├── ✅ Zod validation
    └── ⚠️ Gaps: audit log, encryption at rest
```

---

**Fim da Documentação Técnica**

*Análise completa em modo leitura (Read-Only) conforme solicitado.*
*Nenhuma alteração de código foi realizada.*
*Documentação gerada em PT-BR com padrão Microsoft Learn.*
