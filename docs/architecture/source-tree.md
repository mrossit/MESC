# Source Tree - Sistema MESC

## Estrutura de Diretórios

```
/home/runner/workspace/
├── .bmad-core/                    # BMad Method - Agentes AI
│   ├── agents/                    # Agentes especializados
│   ├── templates/                 # Templates de documentos
│   └── workflows/                 # Workflows de desenvolvimento
│
├── .bmad-creative-writing/        # Expansion pack: escrita criativa
├── .bmad-infrastructure-devops/   # Expansion pack: DevOps
│
├── .claude/                       # Configuração Claude Code
│   └── settings.local.json        # Settings e permissions
│
├── client/                        # 🎨 FRONTEND - React Application
│   ├── src/
│   │   ├── components/           # Componentes React reutilizáveis
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── pending-approvals.tsx
│   │   │   └── ...
│   │   │
│   │   ├── pages/               # Páginas principais da aplicação
│   │   │   ├── Dashboard.tsx    # Dashboard principal
│   │   │   ├── Substitutions.tsx # Sistema de substituições
│   │   │   ├── Schedule.tsx     # Visualização de escalas
│   │   │   ├── Formation.tsx    # Sistema de formação
│   │   │   ├── Profile.tsx      # Perfil do usuário
│   │   │   ├── Reports.tsx      # Relatórios
│   │   │   └── ...
│   │   │
│   │   ├── hooks/               # Custom React hooks
│   │   │   └── use-toast.ts
│   │   │
│   │   ├── lib/                 # Utilitários
│   │   │   └── utils.ts         # Helpers (cn, etc)
│   │   │
│   │   ├── main.tsx             # Entry point React
│   │   └── App.tsx              # Root component
│   │
│   └── index.html               # HTML template
│
├── server/                        # 🔧 BACKEND - Express API
│   ├── routes/                   # API Routes organizadas por recurso
│   │   ├── questionnaires.ts    # Questionários
│   │   ├── questionnaireAdmin.ts
│   │   ├── schedules.ts         # Escalas
│   │   ├── scheduleGeneration.ts
│   │   ├── substitutions.ts     # Sistema de substituições
│   │   ├── mass-pendencies.ts   # Pendências de missas
│   │   ├── ministers.ts         # Gestão de ministros
│   │   ├── notifications.ts     # Sistema de notificações
│   │   ├── reports.ts           # Relatórios
│   │   ├── profile.ts           # Perfil de usuário
│   │   ├── session.ts           # Sessões e atividade
│   │   └── upload.ts            # Upload de arquivos
│   │
│   ├── auth.ts                   # 🔐 Sistema de autenticação JWT
│   ├── authRoutes.ts             # Routes de auth (login, register)
│   ├── passwordResetRoutes.ts    # Reset de senha
│   │
│   ├── db.ts                     # 💾 Database connection (Drizzle)
│   ├── storage.ts                # Data access layer
│   │
│   ├── routes.ts                 # 🛤️ Registro central de rotas
│   ├── index.ts                  # Entry point do servidor
│   ├── vite.ts                   # Vite integration
│   │
│   ├── seedAdmin.ts              # Seed de usuário admin inicial
│   │
│   └── utils/                    # Utilitários backend
│       └── logger.ts             # Sistema de logging
│
├── shared/                        # 🔄 CÓDIGO COMPARTILHADO
│   ├── schema.ts                 # Drizzle schema + Zod validation
│   └── constants.ts              # Constantes compartilhadas
│
├── scripts/                       # 📜 Scripts utilitários
│   ├── check-time-field.ts       # Verificação de campos
│   ├── test-pendencies.ts        # Teste de pendências
│   └── test-auto-substitute.ts   # Teste auto-substituição
│
├── docs/                          # 📚 DOCUMENTAÇÃO (BMad)
│   ├── architecture/             # Documentação de arquitetura
│   │   ├── tech-stack.md        # Stack tecnológico
│   │   ├── source-tree.md       # Este arquivo
│   │   ├── coding-standards.md  # Padrões de código
│   │   └── architecture.md      # Arquitetura do sistema
│   │
│   ├── prd/                      # Product Requirements (sharded)
│   ├── stories/                  # User stories detalhadas
│   ├── qa/                       # Documentação de testes
│   ├── prd.md                    # PRD principal
│   └── architecture.md           # Arquitetura principal
│
├── public/                        # 📁 Assets estáticos
│   └── (arquivos públicos)
│
├── uploads/                       # 📤 Uploads de usuários
│   └── (fotos de perfil, etc)
│
├── attached_assets/               # 📎 Assets anexados
│   └── (capturas de tela, docs)
│
├── dist/                          # 🏗️ Build de produção
│   └── (gerado pelo build)
│
├── drizzle/                       # 🗄️ Migrations database
│   └── (migrations Drizzle)
│
└── node_modules/                  # 📦 Dependências

## Arquivos de Configuração (Root)

```
├── package.json                   # Dependencies e scripts npm
├── package-lock.json              # Lock file
├── tsconfig.json                  # TypeScript config global
├── vite.config.ts                 # Vite config
├── tailwind.config.ts             # Tailwind CSS config
├── postcss.config.js              # PostCSS config
├── drizzle.config.ts              # Drizzle ORM config
├── components.json                # shadcn/ui config
├── .env                           # Variáveis de ambiente
└── .gitignore                     # Git ignore rules
```

## Principais Endpoints da API

### Autenticação
- `POST /api/auth/register` - Registro de novo usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/user` - Usuário atual
- `POST /api/password-reset/request` - Solicitar reset
- `POST /api/password-reset/reset` - Resetar senha

### Usuários/Ministros
- `GET /api/users` - Listar usuários
- `GET /api/users/:id` - Buscar usuário
- `POST /api/users` - Criar usuário
- `PUT /api/users/:id` - Atualizar usuário
- `DELETE /api/users/:id` - Deletar usuário
- `PATCH /api/users/:id/status` - Alterar status
- `PATCH /api/users/:id/role` - Alterar papel
- `GET /api/ministers` - Listar ministros ativos

### Perfil
- `GET /api/profile` - Perfil do usuário
- `PUT /api/profile` - Atualizar perfil
- `GET /api/profile/family` - Familiares
- `POST /api/profile/family` - Adicionar familiar
- `DELETE /api/profile/family/:id` - Remover familiar

### Questionários
- `GET /api/questionnaires` - Listar questionários
- `POST /api/questionnaires` - Criar questionário
- `GET /api/questionnaires/:id/responses` - Respostas
- `POST /api/questionnaires/:id/responses` - Enviar resposta

### Escalas
- `GET /api/schedules` - Buscar escalas
- `POST /api/schedules` - Criar escala
- `GET /api/schedules/:id/assignments` - Escalações
- `POST /api/schedules/generate` - Gerar escala automática

### Substituições
- `GET /api/substitutions` - Listar substituições
- `POST /api/substitutions` - Criar solicitação
- `PATCH /api/substitutions/:id/respond` - Responder
- `DELETE /api/substitutions/:id` - Cancelar

### Pendências de Missas (🆕)
- `GET /api/mass-pendencies` - Listar missas com desfalques

### Horários de Missa
- `GET /api/mass-times` - Listar horários
- `POST /api/mass-times` - Criar horário
- `PUT /api/mass-times/:id` - Atualizar horário
- `DELETE /api/mass-times/:id` - Deletar horário

### Formação
- `GET /api/formation/tracks` - Trilhas de formação
- `GET /api/formation/lessons` - Lições
- `GET /api/formation/progress` - Progresso do usuário
- `POST /api/formation/progress` - Atualizar progresso

### Notificações
- `GET /api/notifications` - Listar notificações
- `POST /api/notifications` - Criar notificação
- `PATCH /api/notifications/:id/read` - Marcar como lida

### Relatórios
- `GET /api/reports/statistics` - Estatísticas gerais
- `GET /api/reports/attendance` - Relatório de presença

### Upload
- `POST /api/upload/profile-photo` - Upload de foto

### Dashboard
- `GET /api/dashboard/stats` - Estatísticas dashboard

### Sessão/Atividade
- `POST /api/session/activity` - Registrar atividade
- `GET /api/session/check` - Verificar sessão

## Fluxo de Dados

### Autenticação
1. Login → JWT gerado → Armazenado em cookie
2. Requests subsequentes → Cookie enviado → Middleware valida → User em `req.user`

### Questionário → Escala
1. Admin cria questionário
2. Ministros respondem (disponibilidade)
3. Sistema gera escala automática baseada em respostas
4. Escalas são publicadas

### Substituições (com Auto-Escalação 🆕)
1. Ministro solicita substituição
2. Sistema busca **automaticamente** suplentes disponíveis
3. Critérios: não escalado + respondeu questionário + disponível
4. Suplente é atribuído automaticamente
5. Aguarda confirmação do suplente

## Tecnologias por Camada

### Frontend (client/)
- React + TypeScript
- TanStack Query (data fetching)
- React Hook Form + Zod (forms)
- Tailwind + Radix UI (UI)

### Backend (server/)
- Express + TypeScript
- Drizzle ORM (database)
- JWT (auth)
- Multer + Sharp (uploads)

### Database
- PostgreSQL (Neon)
- Drizzle migrations
- JSONB para dados complexos

### Development Tools
- Vite (dev server)
- tsx (TS execution)
- esbuild (production build)
- BMad Method (planning/docs)
