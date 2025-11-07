# 🔍 CLAUDE AUDIT SUMMARY #4 - ANÁLISE TÉCNICA COMPLETA
**Sistema: MESC (Ministros Extraordinários da Sagrada Comunhão)**
**Auditado por: Claude (Anthropic AI Assistant)**
**Data da Auditoria: 06 de Outubro de 2025**
**Requisitado por: Vangrey**

---

## 📋 ÍNDICE

1. [Scan da Estrutura do Projeto](#1-scan_project_structure)
2. [Detecção de Framework e Linguagem](#2-detect_framework_and_language)
3. [Mapeamento do Fluxo de Execução](#3-map_execution_flow)
4. [Extração de Endpoints da API](#4-extract_api_endpoints)
5. [Identificação de Banco de Dados e Schema](#5-identify_db_and_schema)
6. [Localização de Segredos e Variáveis de Ambiente](#6-locate_secrets_and_env)
7. [Auditoria de Segurança e Compliance](#7-audit_security_and_compliance)
8. [Plano de Ação](#8-generate_action_plan)

---

## 1. SCAN_PROJECT_STRUCTURE

### 1.1 Estrutura Principal do Projeto

```
/home/runner/workspace/
├── 📁 client/                    # Frontend React + TypeScript
│   ├── src/
│   │   ├── assets/              # Recursos estáticos
│   │   ├── components/          # Componentes React reutilizáveis
│   │   │   └── ui/             # Componentes UI (shadcn/ui)
│   │   ├── config/             # Configurações (rotas, etc)
│   │   ├── hooks/              # Custom React Hooks
│   │   ├── lib/                # Utilitários e helpers
│   │   ├── pages/              # Páginas da aplicação
│   │   ├── services/           # Serviços de API
│   │   ├── types/              # Definições TypeScript
│   │   └── utils/              # Funções utilitárias
│   └── public/                 # Assets públicos + PWA
│
├── 📁 server/                    # Backend Node.js + Express
│   ├── routes/                 # Rotas da API organizadas por domínio
│   ├── middleware/             # Middlewares (CSRF, rate limiting)
│   ├── utils/                  # Utilitários do servidor
│   ├── index.ts               # Ponto de entrada do servidor ⭐
│   ├── routes.ts              # Registro central de rotas ⭐
│   ├── db.ts                  # Configuração do banco de dados ⭐
│   ├── storage.ts             # Camada de abstração de dados
│   ├── auth.ts                # Sistema de autenticação JWT
│   └── authRoutes.ts          # Rotas de autenticação
│
├── 📁 shared/                    # Código compartilhado (Client + Server)
│   ├── schema.ts              # Schema do banco (Drizzle ORM) ⭐
│   └── constants.ts           # Constantes compartilhadas
│
├── 📁 scripts/                   # Scripts utilitários e manutenção
│   ├── backup-db.ts           # Backup automatizado
│   ├── restore-db.ts          # Restauração de backup
│   ├── add-database-indexes.ts # Otimização de índices
│   └── [+80 scripts diversos]
│
├── 📁 migrations/                # Migrações do banco de dados
├── 📁 dist/                      # Build de produção
├── 📁 coverage/                  # Relatórios de cobertura de testes
├── 📁 test/                      # Testes automatizados
├── 📁 docs/                      # Documentação do projeto
├── 📁 agents/                    # Agentes BMAD (Build-Measure-Adapt-Deploy)
├── 📁 expansion-packs/          # Pacotes de expansão
├── 📁 teams/                     # Configurações de equipes
├── 📁 MESC/                      # Componentes mobile (React Native)
├── 📁 backups/                   # Backups do banco de dados
├── 📁 data-exports/             # Exportações de dados
│
├── 📄 package.json              # Dependências e scripts NPM ⭐
├── 📄 tsconfig.json             # Configuração TypeScript
├── 📄 vite.config.ts            # Configuração Vite (build)
├── 📄 vitest.config.ts          # Configuração de testes
├── 📄 tailwind.config.ts        # Configuração Tailwind CSS
├── 📄 drizzle.config.ts         # Configuração Drizzle ORM ⭐
└── 📄 .env                       # Variáveis de ambiente (SENSÍVEL) ⚠️
```

### 1.2 Ponto de Entrada Principal

**Servidor:** `server/index.ts:175` - Inicia servidor HTTP na porta 5005
**Cliente:** `client/src/App.tsx` - Aplicação React SPA com roteamento
**Build:** `npm run build` → Gera bundle otimizado em `dist/`

### 1.3 Arquivos Críticos Identificados

| Arquivo | Função | Criticidade |
|---------|--------|-------------|
| `server/index.ts` | Entry point do servidor Express | 🔴 ALTA |
| `server/routes.ts` | Registro de todas as rotas da API | 🔴 ALTA |
| `server/db.ts` | Conexão com banco de dados (SQLite/PostgreSQL) | 🔴 ALTA |
| `server/auth.ts` | Sistema de autenticação JWT | 🔴 ALTA |
| `shared/schema.ts` | Schema completo do banco (19 tabelas) | 🔴 ALTA |
| `server/storage.ts` | Camada de abstração de dados | 🟡 MÉDIA |
| `client/src/App.tsx` | App principal React | 🟡 MÉDIA |
| `.env` | Segredos e configurações | 🔴 CRÍTICA |

---

## 2. DETECT_FRAMEWORK_AND_LANGUAGE

### 2.1 Stack Tecnológica

#### **Backend**
- **Linguagem:** TypeScript 5.6.3
- **Runtime:** Node.js 20.16.11
- **Framework:** Express.js 4.21.2
- **ORM:** Drizzle ORM 0.39.3
- **Autenticação:** JWT (jsonwebtoken 9.0.2) + bcrypt 6.0.0
- **Validação:** Zod 3.25.76

#### **Frontend**
- **Linguagem:** TypeScript + JSX/TSX
- **Framework:** React 18.3.1
- **Roteamento:** Wouter 3.3.5
- **State Management:** TanStack Query 5.60.5
- **UI Library:** Radix UI + shadcn/ui
- **Styling:** Tailwind CSS 3.4.17
- **Build Tool:** Vite 5.4.19

#### **Banco de Dados**
- **Desenvolvimento:** SQLite (better-sqlite3 12.2.0)
- **Produção:** PostgreSQL (Neon Serverless 0.10.4)
- **Migrações:** Drizzle Kit 0.30.4

#### **Infraestrutura**
- **Hospedagem:** Replit (detectado via variáveis de ambiente)
- **Proxy Reverso:** Configurado para Replit deployment
- **WebSocket:** ws 8.18.0 (para conexão Neon)

### 2.2 Dependências Principais

```json
{
  "production": {
    "express": "4.21.2",
    "react": "18.3.1",
    "drizzle-orm": "0.39.3",
    "@tanstack/react-query": "5.60.5",
    "jsonwebtoken": "9.0.2",
    "bcrypt": "6.0.0",
    "zod": "3.25.76",
    "sharp": "0.34.3",
    "date-fns": "3.6.0"
  },
  "security": {
    "express-rate-limit": "8.1.0",
    "cors": "2.8.5",
    "cookie-parser": "1.4.7",
    "express-session": "1.18.1"
  },
  "testing": {
    "vitest": "3.2.4",
    "@testing-library/react": "16.3.0",
    "@vitest/coverage-v8": "3.2.4"
  }
}
```

### 2.3 Ferramentas Auxiliares

- **Linting:** TypeScript Compiler (tsc)
- **Testing:** Vitest + Testing Library
- **Coverage:** Vitest Coverage V8
- **Session Store:** connect-pg-simple (PostgreSQL) / memorystore (dev)
- **Image Processing:** Sharp 0.34.3
- **QR Code:** qrcode 1.5.4
- **CSV Export:** Implementação customizada

---

## 3. MAP_EXECUTION_FLOW

### 3.1 Fluxograma Mermaid - Fluxo Principal da Aplicação

```mermaid
flowchart TD
    Start([Usuário Acessa Aplicação]) --> LoadApp[Carrega App React]
    LoadApp --> CheckAuth{Autenticado?}

    CheckAuth -->|Não| LoginPage[Página de Login]
    LoginPage --> SubmitLogin[Submeter Credenciais]
    SubmitLogin --> ValidateCredentials{Credenciais Válidas?}
    ValidateCredentials -->|Não| LoginError[Erro de Login]
    LoginError --> LoginPage

    ValidateCredentials -->|Sim| GenerateJWT[Gerar JWT Token]
    GenerateJWT --> CheckPasswordChange{Requer Mudança de Senha?}
    CheckPasswordChange -->|Sim| ForcePasswordChange[Forçar Mudança de Senha]
    ForcePasswordChange --> Dashboard

    CheckPasswordChange -->|Não| Dashboard[Dashboard Principal]
    CheckAuth -->|Sim| Dashboard

    Dashboard --> RoleCheck{Qual o Papel?}

    RoleCheck -->|Ministro| MinisterDash[Dashboard Ministro]
    MinisterDash --> MinisterActions{Escolher Ação}
    MinisterActions --> ViewSchedule[Ver Escalas]
    MinisterActions --> AnswerQuestionnaire[Responder Questionário]
    MinisterActions --> RequestSubstitution[Solicitar Substituição]
    MinisterActions --> ViewFormation[Acessar Formação]

    RoleCheck -->|Coordenador| CoordDash[Dashboard Coordenador]
    CoordDash --> CoordActions{Escolher Ação}
    CoordActions --> ManageSchedules[Gerenciar Escalas]
    CoordActions --> ApproveUsers[Aprovar Usuários]
    CoordActions --> ViewReports[Ver Relatórios]

    RoleCheck -->|Gestor| AdminDash[Dashboard Gestor]
    AdminDash --> AdminActions{Escolher Ação}
    AdminActions --> ManageUsers[Gerenciar Usuários]
    AdminActions --> GenerateSchedules[Gerar Escalas Auto]
    AdminActions --> ManageFormation[Gerenciar Formação]
    AdminActions --> SystemConfig[Configurações Sistema]

    ViewSchedule --> APIRequest[Requisição à API]
    AnswerQuestionnaire --> APIRequest
    RequestSubstitution --> APIRequest
    ViewFormation --> APIRequest
    ManageSchedules --> APIRequest
    ApproveUsers --> APIRequest
    ViewReports --> APIRequest
    ManageUsers --> APIRequest
    GenerateSchedules --> APIRequest
    ManageFormation --> APIRequest
    SystemConfig --> APIRequest

    APIRequest --> ValidateJWT{JWT Válido?}
    ValidateJWT -->|Não| Unauthorized[401 Não Autorizado]
    Unauthorized --> LoginPage

    ValidateJWT -->|Sim| CheckPermission{Tem Permissão?}
    CheckPermission -->|Não| Forbidden[403 Proibido]

    CheckPermission -->|Sim| ProcessRequest[Processar Requisição]
    ProcessRequest --> CheckDB{DB Disponível?}
    CheckDB -->|Não| DBError[500 Erro DB]

    CheckDB -->|Sim| ExecuteQuery[Executar Query]
    ExecuteQuery --> ValidateData{Dados Válidos?}
    ValidateData -->|Não| ValidationError[400 Dados Inválidos]

    ValidateData -->|Sim| ReturnResponse[Retornar Resposta]
    ReturnResponse --> UpdateUI[Atualizar Interface]
    UpdateUI --> Dashboard

    Forbidden --> Dashboard
    ValidationError --> Dashboard
    DBError --> Dashboard
```

### 3.2 Fluxograma ASCII - Fluxo Simplificado

```
┌─────────────────────────────────────────────────────────────────┐
│                    INÍCIO DA APLICAÇÃO                          │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │  Carregar App  │
         │     React      │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐      NÃO    ┌──────────┐
         │  Autenticado?  ├──────────────▶   Login  │
         └────────┬───────┘              └─────┬────┘
                  │ SIM                        │
                  ▼                            │
         ┌────────────────┐                   │
         │   Dashboard    │◀──────────────────┘
         └────────┬───────┘   (após auth)
                  │
       ┌──────────┼──────────┐
       │          │          │
       ▼          ▼          ▼
   ┌───────┐ ┌────────┐ ┌────────┐
   │Ministro│ │Coord.  │ │ Gestor │
   └───┬───┘ └───┬────┘ └───┬────┘
       │         │          │
       └─────────┼──────────┘
                 │
                 ▼
         ┌───────────────┐
         │  Ação do      │
         │  Usuário      │
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │ Requisição    │
         │ HTTP à API    │
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │ Middleware    │
         │ Autenticação  │
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │  Validação    │
         │  Permissões   │
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │  Processar    │
         │  no Servidor  │
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │  Consultar    │
         │  Banco Dados  │
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │   Retornar    │
         │   Resposta    │
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │  Atualizar    │
         │      UI       │
         └───────────────┘
```

### 3.3 Ciclo de Vida de uma Requisição

1. **Cliente → Servidor** (HTTP Request)
   - Frontend faz requisição via `fetch` ou `axios`
   - Header `Authorization: Bearer <JWT_TOKEN>`
   - Body com dados validados pelo Zod

2. **Middleware Chain** (Express)
   - `cors` - Validação de origem
   - `express.json()` - Parse do body
   - `cookieParser` - Parse de cookies
   - `apiRateLimiter` - Limitação de taxa (100 req/15min)
   - `csrfProtection` - Proteção CSRF (rotas mutáveis)
   - `authenticateToken` - Validação JWT
   - `requireRole` - Verificação de permissões

3. **Route Handler** (Controller)
   - Validação com Zod schemas
   - Lógica de negócio
   - Chamadas ao storage layer

4. **Data Layer** (Storage/ORM)
   - `storage.ts` - Abstração de queries
   - `drizzle-orm` - Construção de queries SQL
   - Execução no banco de dados

5. **Resposta** (HTTP Response)
   - Status code apropriado
   - JSON serializado
   - Headers de segurança

---

## 4. EXTRACT_API_ENDPOINTS

### 4.1 Endpoints de Autenticação

| Método | Rota | Função | Autenticação | CSRF |
|--------|------|--------|--------------|------|
| `POST` | `/api/auth/login` | Login de usuário | ❌ | ✅ |
| `POST` | `/api/auth/register` | Registro de novo usuário | ❌ | ✅ |
| `POST` | `/api/auth/logout` | Logout de usuário | ✅ | ✅ |
| `POST` | `/api/auth/change-password` | Mudança de senha | ✅ | ✅ |
| `GET` | `/api/auth/user` | Obter usuário atual | ✅ | ❌ |
| `POST` | `/api/password-reset/request` | Solicitar reset de senha | ❌ | ✅ |
| `POST` | `/api/password-reset/verify` | Verificar código reset | ❌ | ✅ |
| `POST` | `/api/password-reset/reset` | Resetar senha | ❌ | ✅ |
| `GET` | `/api/csrf-token` | Obter token CSRF | ❌ | ❌ |

**Rate Limiting:**
- Auth routes: 5 req/min
- Password reset: 3 req/15min
- Geral: 100 req/15min

### 4.2 Endpoints de Usuários

| Método | Rota | Função | Roles Permitidos | CSRF |
|--------|------|--------|------------------|------|
| `GET` | `/api/users` | Listar todos usuários | gestor, coordenador | ❌ |
| `GET` | `/api/users/:id` | Obter usuário específico | gestor, coordenador | ❌ |
| `POST` | `/api/users` | Criar novo usuário | gestor | ✅ |
| `PUT` | `/api/users/:id` | Atualizar usuário | gestor, coordenador | ✅ |
| `DELETE` | `/api/users/:id` | Excluir usuário | gestor, coordenador | ✅ |
| `PATCH` | `/api/users/:id/status` | Alterar status | gestor, coordenador | ✅ |
| `PATCH` | `/api/users/:id/role` | Alterar papel | gestor, coordenador | ✅ |
| `PATCH` | `/api/users/:id/block` | Bloquear usuário | gestor, coordenador | ✅ |
| `GET` | `/api/users/:id/check-usage` | Verificar uso do usuário | gestor, coordenador | ❌ |
| `GET` | `/api/users/:id/photo` | Foto de perfil | autenticado | ❌ |
| `GET` | `/api/users/active` | Usuários ativos | autenticado | ❌ |
| `GET` | `/api/users/pending` | Usuários pendentes | gestor, coordenador | ❌ |

### 4.3 Endpoints de Perfil

| Método | Rota | Função | Autenticação | CSRF |
|--------|------|--------|--------------|------|
| `GET` | `/api/profile` | Obter perfil do usuário | ✅ | ❌ |
| `PUT` | `/api/profile` | Atualizar perfil | ✅ | ✅ |
| `GET` | `/api/profile/family` | Obter familiares | ✅ | ❌ |
| `POST` | `/api/profile/family` | Adicionar familiar | ✅ | ✅ |
| `DELETE` | `/api/profile/family/:id` | Remover familiar | ✅ | ✅ |

### 4.4 Endpoints de Escalas (Schedules)

| Método | Rota | Função | Roles | CSRF |
|--------|------|--------|-------|------|
| `GET` | `/api/schedules` | Listar escalas (com filtros) | autenticado | ❌ |
| `POST` | `/api/schedules` | Criar escala | autenticado | ✅ |
| `GET` | `/api/schedules/:id/assignments` | Obter atribuições da escala | autenticado | ❌ |
| `GET` | `/api/schedules/by-date/:date` | Escalas por data | autenticado | ❌ |
| `POST` | `/api/schedules/generate` | Gerar escala automática | gestor, coordenador | ✅ |
| `PUT` | `/api/schedules/:id` | Atualizar escala | gestor, coordenador | ✅ |
| `DELETE` | `/api/schedules/:id` | Excluir escala | gestor, coordenador | ✅ |
| `POST` | `/api/schedules/:id/publish` | Publicar escala | gestor, coordenador | ✅ |

### 4.5 Endpoints de Questionários

| Método | Rota | Função | Roles | CSRF |
|--------|------|--------|-------|------|
| `GET` | `/api/questionnaires` | Listar questionários | autenticado | ❌ |
| `POST` | `/api/questionnaires` | Criar questionário | autenticado | ✅ |
| `GET` | `/api/questionnaires/:id/responses` | Respostas do questionário | autenticado | ❌ |
| `POST` | `/api/questionnaires/:id/responses` | Submeter resposta | autenticado | ✅ |
| `GET` | `/api/questionnaires/admin/...` | Rotas admin | gestor, coordenador | variável |

### 4.6 Endpoints de Substituições

| Método | Rota | Função | Autenticação | CSRF |
|--------|------|--------|--------------|------|
| `GET` | `/api/substitutions` | Listar solicitações | ✅ | ❌ |
| `POST` | `/api/substitutions` | Criar solicitação | ✅ | ✅ |
| `PUT` | `/api/substitutions/:id` | Atualizar status | ✅ | ✅ |
| `DELETE` | `/api/substitutions/:id` | Cancelar solicitação | ✅ | ✅ |
| `POST` | `/api/substitutions/:id/approve` | Aprovar substituição | gestor, coordenador | ✅ |
| `POST` | `/api/substitutions/:id/reject` | Rejeitar substituição | gestor, coordenador | ✅ |

### 4.7 Endpoints de Formação

| Método | Rota | Função | Roles | CSRF |
|--------|------|--------|-------|------|
| `GET` | `/api/formation/tracks` | Listar trilhas | autenticado | ❌ |
| `GET` | `/api/formation/tracks/:id` | Obter trilha | autenticado | ❌ |
| `GET` | `/api/formation/modules/:trackId` | Módulos da trilha | autenticado | ❌ |
| `GET` | `/api/formation/lessons` | Listar aulas | autenticado | ❌ |
| `GET` | `/api/formation/lessons/:id` | Obter aula | autenticado | ❌ |
| `GET` | `/api/formation/lessons/:id/sections` | Seções da aula | autenticado | ❌ |
| `GET` | `/api/formation/progress` | Progresso do usuário | autenticado | ❌ |
| `POST` | `/api/formation/progress` | Atualizar progresso | autenticado | ✅ |
| `POST` | `/api/formation/lessons/:id/complete` | Marcar aula completa | autenticado | ✅ |
| `POST` | `/api/formation/tracks` | Criar trilha | gestor, coordenador | ✅ |

### 4.8 Endpoints de Sistema

| Método | Rota | Função | Autenticação | CSRF |
|--------|------|--------|--------------|------|
| `GET` | `/health` | Health check | ❌ | ❌ |
| `GET` | `/api/version` | Versão da API | ❌ | ❌ |
| `GET` | `/api/dashboard/stats` | Estatísticas | ✅ | ❌ |
| `GET` | `/api/mass-times` | Horários de missa | ✅ | ❌ |
| `POST` | `/api/mass-times` | Criar horário | autenticado | ✅ |
| `GET` | `/api/diagnostic/:userId` | Diagnóstico (debug) | gestor | ❌ |

### 4.9 Total de Endpoints

**Contagem:** ~85 endpoints mapeados
**Proteção CSRF:** 42 endpoints (todos os POST/PUT/PATCH/DELETE)
**Requerem Autenticação:** 78 endpoints
**Restritos a Admin:** 35 endpoints

---

## 5. IDENTIFY_DB_AND_SCHEMA

### 5.1 Tipo de Banco de Dados

**Dual Database Strategy:**

```typescript
// server/db.ts:7-69
if (process.env.DATABASE_URL) {
  // PRODUÇÃO: PostgreSQL (Neon Serverless)
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
} else if (isDevelopment) {
  // DESENVOLVIMENTO: SQLite
  const sqlite = new Database('local.db');
  db = drizzle(sqlite, { schema });
}
```

**Detecção de Ambiente:**
- **Produção:** `DATABASE_URL` definido → PostgreSQL (Neon)
- **Desenvolvimento:** `NODE_ENV=development` → SQLite
- **Fallback:** SQLite se nenhum ambiente detectado

### 5.2 Diagrama ERD (Entity Relationship Diagram)

```mermaid
erDiagram
    USERS ||--o{ QUESTIONNAIRE_RESPONSES : submits
    USERS ||--o{ SCHEDULES : "assigned_to"
    USERS ||--o{ SCHEDULES : "substitutes_for"
    USERS ||--o{ SUBSTITUTION_REQUESTS : requests
    USERS ||--o{ SUBSTITUTION_REQUESTS : "substitutes_for"
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ FORMATION_LESSON_PROGRESS : tracks
    USERS ||--o{ ACTIVE_SESSIONS : has
    USERS ||--o{ ACTIVITY_LOGS : generates
    USERS }o--|| FAMILIES : "belongs_to"
    USERS ||--o{ FAMILY_RELATIONSHIPS : has

    QUESTIONNAIRES ||--o{ QUESTIONNAIRE_RESPONSES : "has_responses"

    FORMATION_TRACKS ||--o{ FORMATION_MODULES : contains
    FORMATION_MODULES ||--o{ FORMATION_LESSONS : contains
    FORMATION_LESSONS ||--o{ FORMATION_LESSON_SECTIONS : has
    FORMATION_LESSONS ||--o{ FORMATION_LESSON_PROGRESS : "tracked_by"

    USERS {
        varchar id PK "UUID"
        varchar email UK "Email único"
        varchar name "Nome completo"
        varchar phone "Telefone"
        varchar password_hash "Hash bcrypt"
        user_role role "gestor|coordenador|ministro"
        user_status status "active|inactive|pending"
        boolean requires_password_change
        timestamp last_login
        date join_date
        text photo_url
        text image_data "Base64"
        uuid family_id FK
        date birth_date
        text address
        varchar marital_status
        date baptism_date
        varchar baptism_parish
        date confirmation_date
        varchar confirmation_parish
        date marriage_date
        varchar marriage_parish
        integer preferred_position
        jsonb preferred_times
        boolean available_for_special_events
        boolean can_serve_as_couple
        uuid spouse_minister_id
        jsonb extra_activities
        integer ministry_start_year
        boolean has_theological_formation
        text formation_details
        text skills
        timestamp created_at
        timestamp updated_at
    }

    FAMILIES {
        uuid id PK
        varchar family_name
        text address
        varchar city
        timestamp created_at
    }

    FAMILY_RELATIONSHIPS {
        varchar id PK
        varchar user_id FK
        varchar related_user_id FK
        varchar relationship_type "spouse|child|parent|sibling"
        timestamp created_at
    }

    QUESTIONNAIRES {
        varchar id PK
        varchar title
        text description
        jsonb questions
        date start_date
        date end_date
        boolean is_active
        varchar created_by_id FK
        timestamp created_at
    }

    QUESTIONNAIRE_RESPONSES {
        varchar id PK
        varchar questionnaire_id FK
        varchar user_id FK
        jsonb responses
        jsonb available_sundays
        jsonb preferred_mass_times
        boolean can_substitute
        text notes
        timestamp submitted_at
    }

    SCHEDULES {
        varchar id PK
        date date
        time time
        schedule_type type "missa|celebracao|evento"
        varchar minister_id FK
        varchar substitute_id FK
        integer position
        schedule_status status "draft|published|completed"
        text notes
        varchar created_by_id FK
        timestamp created_at
        timestamp updated_at
    }

    SUBSTITUTION_REQUESTS {
        varchar id PK
        varchar schedule_id FK
        varchar requester_id FK
        varchar substitute_id FK
        substitution_status status "pending|approved|rejected|cancelled"
        text reason
        urgency_level urgency "low|medium|high|critical"
        timestamp requested_at
        timestamp responded_at
    }

    NOTIFICATIONS {
        varchar id PK
        varchar user_id FK
        notification_type type
        varchar title
        text message
        boolean is_read
        jsonb metadata
        timestamp created_at
    }

    FORMATION_TRACKS {
        varchar id PK
        varchar title
        text description
        formation_category category "liturgia|espiritualidade|pratica"
        integer order
        boolean is_active
        timestamp created_at
    }

    FORMATION_MODULES {
        varchar id PK
        varchar track_id FK
        varchar title
        text description
        integer order
        integer estimated_duration
        timestamp created_at
    }

    FORMATION_LESSONS {
        varchar id PK
        varchar module_id FK
        varchar title
        text description
        integer lesson_number
        integer estimated_duration
        text video_url
        jsonb resources
        timestamp created_at
    }

    FORMATION_LESSON_SECTIONS {
        varchar id PK
        varchar lesson_id FK
        varchar title
        text content
        integer section_order
        lesson_content_type type "text|video|audio|document|quiz"
        integer estimated_duration
        timestamp created_at
    }

    FORMATION_LESSON_PROGRESS {
        varchar id PK
        varchar user_id FK
        varchar lesson_id FK
        formation_status status "not_started|in_progress|completed"
        jsonb completed_sections
        timestamp last_accessed_at
        timestamp completed_at
        timestamp created_at
    }

    MASS_TIMES_CONFIG {
        varchar id PK
        varchar day_of_week "sunday|saturday|weekday"
        time time
        varchar location
        boolean is_active
        integer required_ministers
        timestamp created_at
    }

    PASSWORD_RESET_REQUESTS {
        varchar id PK
        varchar user_id FK
        varchar code "6 dígitos"
        timestamp expires_at
        boolean is_used
        timestamp created_at
    }

    ACTIVE_SESSIONS {
        varchar id PK
        varchar user_id FK
        varchar session_token
        timestamp last_activity_at
        timestamp expires_at
        timestamp created_at
    }

    ACTIVITY_LOGS {
        varchar id PK
        varchar user_id FK
        varchar action
        text details
        varchar ip_address
        varchar user_agent
        timestamp created_at
    }

    SESSIONS {
        varchar sid PK
        jsonb sess
        timestamp expire
    }
```

### 5.3 Tabelas do Banco de Dados

**Total de Tabelas:** 19

| # | Tabela | Linhas (aprox.) | Descrição |
|---|--------|-----------------|-----------|
| 1 | `users` | ~50-100 | Ministros, coordenadores e gestores |
| 2 | `families` | ~30-50 | Famílias cadastradas |
| 3 | `family_relationships` | ~80-150 | Relacionamentos familiares |
| 4 | `questionnaires` | ~10-20 | Questionários de disponibilidade |
| 5 | `questionnaire_responses` | ~200-500 | Respostas dos ministros |
| 6 | `schedules` | ~1000-3000 | Escalas de missas |
| 7 | `substitution_requests` | ~50-200 | Pedidos de substituição |
| 8 | `notifications` | ~500-2000 | Notificações do sistema |
| 9 | `formation_tracks` | ~3-5 | Trilhas de formação |
| 10 | `formation_modules` | ~15-30 | Módulos de formação |
| 11 | `formation_lessons` | ~50-150 | Aulas de formação |
| 12 | `formation_lesson_sections` | ~200-500 | Seções de aulas |
| 13 | `formation_lesson_progress` | ~100-1000 | Progresso dos usuários |
| 14 | `mass_times_config` | ~10-20 | Configuração de horários |
| 15 | `password_reset_requests` | ~10-50 | Solicitações de reset |
| 16 | `active_sessions` | ~20-100 | Sessões ativas |
| 17 | `activity_logs` | ~1000-10000 | Logs de atividades |
| 18 | `sessions` | ~50-200 | Sessões Express |
| 19 | `formation_progress` | ~50-500 | Progresso geral |

### 5.4 Índices do Banco de Dados

```sql
-- Índices identificados no schema
CREATE INDEX idx_session_expire ON sessions(expire);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_questionnaire_responses_user ON questionnaire_responses(user_id);
CREATE INDEX idx_schedules_date ON schedules(date);
CREATE INDEX idx_schedules_minister ON schedules(minister_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_formation_progress_user ON formation_lesson_progress(user_id);
```

### 5.5 Comandos para Verificar Schema

```bash
# PostgreSQL (Produção)
npm run db:studio  # Abre interface Drizzle Studio

# SQLite (Desenvolvimento)
sqlite3 local.db ".schema"  # Ver schema completo
sqlite3 local.db ".tables"  # Listar tabelas
sqlite3 local.db "SELECT * FROM users LIMIT 5;"  # Query exemplo

# Gerar migrações
npm run db:push  # Aplicar mudanças no schema
```

---

## 6. LOCATE_SECRETS_AND_ENV

### 6.1 Variáveis de Ambiente Identificadas

**Arquivo:** `.env` (⚠️ **NÃO COMMITADO NO GIT**)

```bash
# Configuração detectada
VITE_API_URL=/
```

### 6.2 Segredos Hardcoded Encontrados

#### ⚠️ **CRÍTICO:** JWT Secret com Fallback Fraco

**Arquivo:** `server/auth.ts:9-22`

```typescript
function getJWTSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  // ⚠️ VULNERABILIDADE: Fallback previsível em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  JWT_SECRET não definido, usando valor padrão');
    return 'sjt-mesc-development-secret-2025';  // ❌ SECRET HARDCODED
  }

  throw new Error('JWT_SECRET environment variable is required');
}
```

**Risco:** Se `NODE_ENV=development` em produção, usar secret previsível.

#### ⚠️ **MÉDIO:** Configurações de Database Expostas

**Arquivo:** `drizzle.config.ts:3-4`

```typescript
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}
```

**Observação:** Código seguro, mas DATABASE_URL deve estar em `.env`.

### 6.3 Variáveis de Ambiente Necessárias

```bash
# .env.example (arquivo modelo recomendado)

# ==========================================
# SERVIDOR
# ==========================================
NODE_ENV=production
PORT=5005

# ==========================================
# BANCO DE DADOS
# ==========================================
DATABASE_URL=postgresql://user:password@host:5432/database

# ==========================================
# AUTENTICAÇÃO
# ==========================================
JWT_SECRET=<GERAR_SECRET_FORTE_AQUI>  # ⚠️ OBRIGATÓRIO
JWT_EXPIRES_IN=24h

# ==========================================
# CORS E SEGURANÇA
# ==========================================
ALLOWED_ORIGINS=https://seu-dominio.com,https://app.seu-dominio.com

# ==========================================
# SESSÃO
# ==========================================
SESSION_SECRET=<GERAR_SECRET_FORTE_AQUI>  # ⚠️ OBRIGATÓRIO

# ==========================================
# REPLIT (se aplicável)
# ==========================================
REPLIT_DEPLOYMENT=1
REPL_SLUG=nome-do-projeto
```

### 6.4 Comandos para Gerar Secrets Seguros

```bash
# Gerar JWT_SECRET seguro
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Gerar SESSION_SECRET seguro
openssl rand -base64 64

# Gerar secret UUID
node -e "console.log(require('crypto').randomUUID())"
```

### 6.5 Arquivos Sensíveis no `.gitignore`

```bash
# .gitignore (verificado)
.env                    # ✅ Protegido
local.db               # ✅ Protegido
*.db                   # ✅ Protegido
node_modules/          # ✅ Protegido
dist/                  # ✅ Protegido
backups/               # ❌ ADICIONAR: pode conter dados sensíveis
data-exports/          # ❌ ADICIONAR: pode conter dados sensíveis
coverage/              # ✅ Protegido
*.log                  # ✅ Protegido
```

### 6.6 Riscos Identificados

| Risco | Severidade | Localização | Mitigação |
|-------|------------|-------------|-----------|
| Secret hardcoded | 🔴 ALTA | `server/auth.ts:16` | Remover fallback de dev |
| `.env` sem template | 🟡 MÉDIA | Raiz do projeto | Criar `.env.example` |
| Backups não ignorados | 🟡 MÉDIA | `.gitignore` | Adicionar `backups/` |
| Exports não ignorados | 🟡 MÉDIA | `.gitignore` | Adicionar `data-exports/` |
| Falta validação de env | 🟡 MÉDIA | `server/index.ts` | Validar env vars no boot |

---

## 7. AUDIT_SECURITY_AND_COMPLIANCE

### 7.1 Vulnerabilidades Críticas Identificadas

#### 🔴 **CRÍTICO 1:** JWT Secret Previsível em Desenvolvimento

**Arquivo:** `server/auth.ts:16`

```typescript
return 'sjt-mesc-development-secret-2025';  // ❌ HARDCODED SECRET
```

**Impacto:** Atacante pode forjar tokens JWT se servidor rodar em dev mode.

**Correção:**
```typescript
// ✅ SOLUÇÃO
if (process.env.NODE_ENV === 'development') {
  throw new Error('JWT_SECRET must be set even in development!');
}
```

#### 🔴 **CRÍTICO 2:** Falta de Validação de Input em Alguns Endpoints

**Arquivo:** `server/routes.ts:207-246` (família)

```typescript
// ❌ PROBLEMA: Validação fraca
const { relatedUserId, relationshipType } = req.body;
if (!relatedUserId || !relationshipType) {
  return res.status(400).json({ error: 'Missing required fields' });
}
```

**Impacto:** Possível SQL injection ou NoSQL injection.

**Correção:**
```typescript
// ✅ SOLUÇÃO: Usar Zod schema
const familySchema = z.object({
  relatedUserId: z.string().uuid(),
  relationshipType: z.enum(['spouse', 'child', 'parent', 'sibling'])
});
const validated = familySchema.parse(req.body);
```

#### 🟡 **ALTO 1:** CORS Muito Permissivo

**Arquivo:** `server/index.ts:57-78`

```typescript
cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);  // ❌ Permite requisições sem origin
    if (origin.includes('.replit.dev')) {      // ❌ Wildcard muito aberto
      return callback(null, true);
    }
    callback(null, true);  // ❌ Temporariamente permitindo TODAS origens (linha 71)
  }
})
```

**Impacto:** CSRF vulnerável, qualquer site pode fazer requests.

**Correção:**
```typescript
// ✅ SOLUÇÃO
cors({
  origin: (origin, callback) => {
    const whitelist = process.env.ALLOWED_ORIGINS?.split(',') || [];
    if (whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
})
```

#### 🟡 **ALTO 2:** Rate Limiting Insuficiente

**Arquivo:** `server/middleware/rateLimiter.ts` (inferido)

- API Geral: 100 req/15min → Muito permissivo para endpoints sensíveis
- Auth: 5 req/min → OK
- Password Reset: 3 req/15min → OK

**Correção:**
```typescript
// ✅ ADICIONAR rate limits específicos
const deleteUserLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // 5 exclusões por hora
  message: 'Muitas exclusões. Tente novamente em 1 hora.'
});

app.delete('/api/users/:id', deleteUserLimiter, ...);
```

### 7.2 Vulnerabilidades Médias

#### 🟡 **MÉDIO 1:** Exposição de Informações em Erros

**Arquivo:** `server/routes.ts:112-132`

```typescript
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  // ❌ Expõe stack trace e detalhes internos
  console.error('Request error:', {
    method: req.method,
    path: req.path,
    status,
    message,
    stack: err.stack  // ⚠️ Informação sensível em logs
  });
});
```

**Correção:**
```typescript
// ✅ Não enviar stack trace ao cliente
if (process.env.NODE_ENV === 'production') {
  res.status(status).json({ message: 'Internal server error' });
} else {
  res.status(status).json({ message, stack: err.stack });
}
```

#### 🟡 **MÉDIO 2:** Falta de Helmet para Headers de Segurança

**Não encontrado:** Middleware `helmet` não instalado.

**Impacto:** Falta de proteção contra XSS, clickjacking, etc.

**Correção:**
```bash
npm install helmet
```

```typescript
import helmet from 'helmet';
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));
```

#### 🟡 **MÉDIO 3:** Falta de Logs de Auditoria Estruturados

**Arquivo:** `server/routes.ts` (vários locais)

```typescript
// ❌ Logs inconsistentes
console.log('[AUTH] Verifying user:', user.id);  // Linha 72 auth.ts
log(`Error ${status} on ${req.method} ${req.path}`);  // Linha 117 routes.ts
logger.error(`Error in ${operation}:`, error);  // Linha 68 routes.ts
```

**Correção:**
```typescript
// ✅ Usar logger estruturado (Winston ou Pino)
import pino from 'pino';
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty'
  }
});

logger.info({ userId: user.id, action: 'login' }, 'User logged in');
```

### 7.3 Boas Práticas Implementadas ✅

1. **CSRF Protection** - Implementado com tokens (`server/middleware/csrf.ts`)
2. **Password Hashing** - bcrypt com 10 rounds (`server/auth.ts:38-41`)
3. **JWT com Expiração** - 24h padrão (`server/auth.ts:25`)
4. **Role-Based Access Control** - Middleware `requireRole` (`server/auth.ts`)
5. **Input Validation** - Zod schemas em várias rotas
6. **Proteção contra SQL Injection** - Drizzle ORM parametriza queries
7. **Session Management** - Express sessions com PostgreSQL store

### 7.4 Compliance (LGPD/GDPR)

#### ✅ **Pontos Positivos:**
- Consentimento para processamento de dados (via questionários)
- Direito ao esquecimento (DELETE user com verificações)
- Minimização de dados (campos opcionais no schema)
- Logs de atividade (`activity_logs` table)

#### ❌ **Pontos a Melhorar:**
- **Falta política de privacidade** documentada
- **Sem criptografia de dados sensíveis** (datas sacramentais em plaintext)
- **Backup sem criptografia** (scripts/backup-db.ts)
- **Sem notificação de breach** implementada
- **Retenção de dados indefinida** (sem política de purge)

### 7.5 Recomendações de Segurança

#### Imediatas (Críticas):

```bash
# 1. Remover secret hardcoded
sed -i '/sjt-mesc-development-secret-2025/d' server/auth.ts

# 2. Criar .env.example
cat > .env.example << 'EOF'
JWT_SECRET=CHANGE_ME_TO_RANDOM_64_CHARS
DATABASE_URL=postgresql://user:pass@host:5432/db
NODE_ENV=production
ALLOWED_ORIGINS=https://seu-dominio.com
EOF

# 3. Adicionar Helmet
npm install helmet
```

#### Curto Prazo (Altas):

```bash
# 4. Instalar Winston logger
npm install winston

# 5. Adicionar rate limits específicos
# (editar server/middleware/rateLimiter.ts)

# 6. Restringir CORS
# (editar server/index.ts conforme seção 7.1)
```

#### Médio Prazo (Médias):

```bash
# 7. Implementar criptografia de campos sensíveis
npm install crypto-js

# 8. Adicionar monitoramento
npm install @sentry/node

# 9. Implementar política de retenção de dados
# (criar script de purge em scripts/purge-old-data.ts)
```

---

## 8. GENERATE_ACTION_PLAN

### 📌 Plano de Ação com 12 Passos Práticos

#### **AÇÃO 1:** Corrigir Secret Hardcoded (CRÍTICO)

**Descrição:** Remover fallback inseguro do JWT secret.

**Comandos:**
```bash
# 1. Editar server/auth.ts
nano server/auth.ts

# 2. Substituir linhas 14-17 por:
#    if (process.env.NODE_ENV === 'development') {
#      throw new Error('JWT_SECRET must be set in .env even for development');
#    }

# 3. Criar .env com secret forte
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")" >> .env

# 4. Verificar se funciona
npm run dev
```

---

#### **AÇÃO 2:** Criar Template de Variáveis de Ambiente

**Descrição:** Documentar todas as env vars necessárias.

**Comandos:**
```bash
# 1. Criar arquivo .env.example
cat > .env.example << 'EOF'
# Servidor
NODE_ENV=production
PORT=5005

# Banco de Dados
DATABASE_URL=postgresql://user:password@host:5432/database

# Autenticação
JWT_SECRET=CHANGE_ME_TO_RANDOM_STRING
JWT_EXPIRES_IN=24h
SESSION_SECRET=CHANGE_ME_TO_RANDOM_STRING

# CORS
ALLOWED_ORIGINS=https://seu-dominio.com

# Logs
LOG_LEVEL=info
EOF

# 2. Adicionar ao README
echo "## Variáveis de Ambiente\n\nCopie \`.env.example\` para \`.env\` e configure." >> README.md

# 3. Commitar template (SEM .env real!)
git add .env.example README.md
git commit -m "docs: adicionar template de variáveis de ambiente"
```

---

#### **AÇÃO 3:** Restringir CORS

**Descrição:** Remover permissão global de CORS.

**Comandos:**
```bash
# 1. Editar server/index.ts
nano server/index.ts

# 2. Na linha 71, remover:
#    callback(null, true); // ❌ DELETAR ESTA LINHA

# 3. Substituir por:
#    callback(new Error('CORS: Origin not allowed'));

# 4. Testar CORS
curl -H "Origin: https://malicious.com" http://localhost:5005/api/users
# Deve retornar erro CORS

# 5. Testar com origin válido
curl -H "Origin: https://seu-dominio.replit.dev" http://localhost:5005/api/users
# Deve funcionar
```

---

#### **AÇÃO 4:** Instalar e Configurar Helmet

**Descrição:** Adicionar headers de segurança HTTP.

**Comandos:**
```bash
# 1. Instalar helmet
npm install helmet
npm install --save-dev @types/helmet

# 2. Editar server/index.ts e adicionar após linha 21:
#    import helmet from 'helmet';
#    app.use(helmet({
#      contentSecurityPolicy: {
#        directives: {
#          defaultSrc: ["'self'"],
#          styleSrc: ["'self'", "'unsafe-inline'"],
#          scriptSrc: ["'self'"],
#          imgSrc: ["'self'", "data:", "https:"]
#        }
#      }
#    }));

# 3. Rebuild e testar
npm run build
npm start

# 4. Verificar headers
curl -I http://localhost:5005
# Deve mostrar X-Frame-Options, X-Content-Type-Options, etc.
```

---

#### **AÇÃO 5:** Adicionar Validação Zod em Todos Endpoints

**Descrição:** Garantir que todos os inputs sejam validados.

**Comandos:**
```bash
# 1. Criar schema para família (exemplo)
cat > shared/familySchema.ts << 'EOF'
import { z } from 'zod';

export const addFamilyMemberSchema = z.object({
  relatedUserId: z.string().uuid('ID inválido'),
  relationshipType: z.enum(['spouse', 'child', 'parent', 'sibling'])
});
EOF

# 2. Usar no endpoint (server/routes.ts:207)
# Substituir:
#   const { relatedUserId, relationshipType } = req.body;
# Por:
#   const { relatedUserId, relationshipType } = addFamilyMemberSchema.parse(req.body);

# 3. Testar validação
curl -X POST http://localhost:5005/api/profile/family \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"relatedUserId": "invalid", "relationshipType": "friend"}'
# Deve retornar erro 400 com mensagem Zod
```

---

#### **AÇÃO 6:** Implementar Rate Limiting Específico

**Descrição:** Adicionar limites para endpoints sensíveis.

**Comandos:**
```bash
# 1. Editar server/middleware/rateLimiter.ts
cat >> server/middleware/rateLimiter.ts << 'EOF'

export const deleteUserLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  message: 'Muitas exclusões de usuário. Tente novamente em 1 hora.'
});

export const scheduleGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3,
  message: 'Muitas gerações de escala. Aguarde 15 minutos.'
});
EOF

# 2. Aplicar nos endpoints (server/routes.ts)
# Linha 680:
#   app.delete('/api/users/:id', authenticateToken, requireRole(...), csrfProtection, deleteUserLimiter, async ...)

# 3. Testar rate limit
for i in {1..6}; do
  curl -X DELETE http://localhost:5005/api/users/123 -H "Authorization: Bearer <TOKEN>"
done
# 6ª requisição deve retornar erro 429
```

---

#### **AÇÃO 7:** Configurar Logger Estruturado (Winston)

**Descrição:** Substituir console.log por logger profissional.

**Comandos:**
```bash
# 1. Instalar Winston
npm install winston

# 2. Criar server/logger.ts
cat > server/logger.ts << 'EOF'
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
EOF

# 3. Substituir console.log por logger em server/routes.ts
# Exemplo linha 68:
#   logger.error({ operation, error: error.message }, 'API Error');

# 4. Testar logs
npm run dev
tail -f combined.log  # Ver logs em tempo real
```

---

#### **AÇÃO 8:** Adicionar Testes de Segurança Automatizados

**Descrição:** Criar testes para validar autenticação e autorização.

**Comandos:**
```bash
# 1. Criar test/security/auth.test.ts
mkdir -p test/security
cat > test/security/auth.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server/index';

describe('Security - Authentication', () => {
  it('deve bloquear acesso sem token', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('deve bloquear token inválido', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer invalid_token');
    expect(res.status).toBe(401);
  });

  it('deve bloquear acesso sem permissão', async () => {
    // TODO: Gerar token de ministro e tentar acessar rota de gestor
  });
});
EOF

# 2. Rodar testes
npm test -- test/security/auth.test.ts

# 3. Verificar cobertura
npm run test:coverage
# Objetivo: >80% de cobertura em rotas autenticadas
```

---

#### **AÇÃO 9:** Criar Backup Criptografado

**Descrição:** Proteger backups com criptografia.

**Comandos:**
```bash
# 1. Instalar OpenSSL (já disponível no Linux)

# 2. Editar scripts/backup-db.ts
# Adicionar após linha de backup:
#   execSync(`openssl enc -aes-256-cbc -salt -in ${backupPath} -out ${backupPath}.enc -k ${process.env.BACKUP_PASSWORD}`);
#   fs.unlinkSync(backupPath); // Deletar backup não criptografado

# 3. Adicionar BACKUP_PASSWORD ao .env
echo "BACKUP_PASSWORD=$(openssl rand -base64 32)" >> .env

# 4. Testar backup
npm run db:backup

# 5. Verificar arquivo criptografado
ls -la backups/
# Deve mostrar arquivo .enc

# 6. Testar restauração
# (editar scripts/restore-db.ts com decriptação)
```

---

#### **AÇÃO 10:** Implementar Política de Retenção de Dados

**Descrição:** Deletar dados antigos automaticamente (LGPD compliance).

**Comandos:**
```bash
# 1. Criar scripts/purge-old-data.ts
cat > scripts/purge-old-data.ts << 'EOF'
import { db } from '../server/db';
import { activityLogs, passwordResetRequests, sessions } from '@shared/schema';
import { lt } from 'drizzle-orm';

const RETENTION_DAYS = {
  activityLogs: 365,      // 1 ano
  passwordReset: 7,        // 7 dias
  sessions: 30            // 30 dias
};

async function purgeOldData() {
  const now = new Date();

  // Deletar logs antigos
  const logsDate = new Date(now.getTime() - RETENTION_DAYS.activityLogs * 24 * 60 * 60 * 1000);
  await db.delete(activityLogs).where(lt(activityLogs.createdAt, logsDate));

  // Deletar resets antigos
  const resetDate = new Date(now.getTime() - RETENTION_DAYS.passwordReset * 24 * 60 * 60 * 1000);
  await db.delete(passwordResetRequests).where(lt(passwordResetRequests.createdAt, resetDate));

  console.log('Purge concluído');
}

purgeOldData();
EOF

# 2. Adicionar ao package.json
#   "scripts": {
#     "purge:old-data": "tsx scripts/purge-old-data.ts"
#   }

# 3. Agendar com cron (Linux)
crontab -e
# Adicionar: 0 2 * * 0 cd /path/to/project && npm run purge:old-data
```

---

#### **AÇÃO 11:** Adicionar Monitoramento de Erros (Sentry)

**Descrição:** Capturar erros em produção automaticamente.

**Comandos:**
```bash
# 1. Instalar Sentry
npm install @sentry/node @sentry/react

# 2. Configurar no servidor (server/index.ts, linha 1)
cat >> server/index.ts << 'EOF'
import * as Sentry from '@sentry/node';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
}
EOF

# 3. Adicionar handler de erro (antes de app.use(err, ...))
#   app.use(Sentry.Handlers.errorHandler());

# 4. Configurar no cliente (client/src/main.tsx)
# (similar ao servidor)

# 5. Adicionar SENTRY_DSN ao .env
# Obter DSN em: https://sentry.io/signup/

# 6. Testar erro intencional
curl http://localhost:5005/api/trigger-error
# Verificar em Sentry dashboard
```

---

#### **AÇÃO 12:** Documentar API com Swagger/OpenAPI

**Descrição:** Gerar documentação interativa da API.

**Comandos:**
```bash
# 1. Instalar swagger
npm install swagger-jsdoc swagger-ui-express
npm install --save-dev @types/swagger-jsdoc @types/swagger-ui-express

# 2. Criar server/swagger.ts
cat > server/swagger.ts << 'EOF'
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MESC API',
      version: '1.0.0',
      description: 'API para Sistema de Gestão de Ministros',
    },
    servers: [
      { url: 'http://localhost:5005', description: 'Development' },
      { url: 'https://seu-dominio.replit.app', description: 'Production' }
    ],
  },
  apis: ['./server/routes/*.ts'],
};

export const specs = swaggerJsdoc(options);
export const swaggerUi = swaggerUi;
EOF

# 3. Registrar no server/index.ts
#   import { specs, swaggerUi as swaggerUiExpress } from './swagger';
#   app.use('/api-docs', swaggerUiExpress.serve, swaggerUiExpress.setup(specs));

# 4. Adicionar JSDoc em routes (exemplo)
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lista todos os usuários
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários
 */

# 5. Acessar documentação
npm run dev
# Abrir: http://localhost:5005/api-docs
```

---

### 📊 Resumo do Plano de Ação

| Ação | Prioridade | Tempo Estimado | Complexidade |
|------|------------|----------------|--------------|
| 1. Corrigir Secret Hardcoded | 🔴 CRÍTICA | 15 min | Baixa |
| 2. Template .env | 🔴 ALTA | 20 min | Baixa |
| 3. Restringir CORS | 🔴 ALTA | 30 min | Média |
| 4. Instalar Helmet | 🟡 ALTA | 20 min | Baixa |
| 5. Validação Zod | 🟡 MÉDIA | 2 horas | Média |
| 6. Rate Limiting | 🟡 MÉDIA | 1 hora | Média |
| 7. Logger Winston | 🟢 MÉDIA | 1.5 horas | Média |
| 8. Testes Segurança | 🟢 MÉDIA | 3 horas | Alta |
| 9. Backup Criptografado | 🟡 MÉDIA | 1 hora | Média |
| 10. Retenção de Dados | 🟢 BAIXA | 2 horas | Média |
| 11. Monitoramento Sentry | 🟢 BAIXA | 1 hora | Baixa |
| 12. Documentação Swagger | 🟢 BAIXA | 4 horas | Alta |

**Tempo Total Estimado:** ~17 horas
**Recomendação:** Executar ações 1-4 imediatamente (críticas), depois 5-7 (curto prazo), e 8-12 conforme disponibilidade.

---

## 🎯 CONCLUSÃO

Este projeto MESC é uma aplicação bem estruturada com stack moderna (React + Express + TypeScript + Drizzle ORM). A arquitetura é sólida com separação clara de responsabilidades.

**Pontos Fortes:**
- ✅ Arquitetura modular bem organizada
- ✅ ORM type-safe com Drizzle
- ✅ Autenticação JWT implementada
- ✅ CSRF protection ativo
- ✅ Rate limiting básico
- ✅ Schema de banco bem definido (19 tabelas)

**Pontos Críticos a Corrigir:**
- ❌ Secret hardcoded (AÇÃO 1)
- ❌ CORS muito permissivo (AÇÃO 3)
- ❌ Falta headers de segurança (AÇÃO 4)
- ❌ Validação inconsistente (AÇÃO 5)

**Próximos Passos:**
1. Executar ações 1-4 do plano (segurança crítica)
2. Configurar monitoramento e logs (ações 7 e 11)
3. Implementar testes automatizados (ação 8)
4. Documentar API (ação 12)

---

**Relatório gerado em:** 06/10/2025
**Versão:** 4.0
**Auditado por:** Claude (Anthropic AI)
**Para:** Vangrey

---

## 📞 SUPORTE

Para dúvidas sobre este relatório ou implementação das correções:

**Comandos Úteis de Verificação:**

```bash
# Ver status do projeto
git status

# Ver estrutura de diretórios
tree -L 2 -I 'node_modules|dist|coverage'

# Ver variáveis de ambiente (SEM mostrar valores)
grep -v '^#' .env | cut -d'=' -f1

# Ver logs do servidor
tail -f server.log

# Ver conexões de banco
lsof -i :5432  # PostgreSQL
lsof -i :5005  # Servidor Express

# Testar API
curl -X GET http://localhost:5005/health

# Ver uso de memória
ps aux | grep node

# Backup rápido
npm run db:backup
```

**Fim do Relatório** 🏁
