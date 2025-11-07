# 📁 Estrutura do Projeto - Sistema MESC

## 🎯 Visão Geral
Este documento descreve a estrutura organizacional do projeto MESC (Ministério Extraordinário da Sagrada Comunhão), facilitando a navegação e manutenção do código.

## 🏗️ Arquitetura

```
mesc-system/
├── client/                 # Frontend React + TypeScript
├── server/                 # Backend Node.js + Express
├── shared/                 # Código compartilhado
└── migrations/            # Migrações do banco de dados
```

## 📱 Frontend (client/)

### 📂 Estrutura de Pastas

```
client/src/
├── components/            # Componentes React organizados
│   ├── auth/             # Componentes de autenticação
│   ├── common/           # Componentes reutilizáveis
│   ├── dashboard/        # Componentes do dashboard
│   ├── layout/           # Layout e navegação
│   ├── minister/         # Gestão de ministros
│   ├── questionnaire/    # Sistema de questionários
│   ├── schedule/         # Sistema de escalas
│   ├── ui/              # Componentes UI base (shadcn)
│   └── ui-custom/        # Componentes UI customizados
│
├── pages/                # Páginas/Views da aplicação
│   ├── dashboard.tsx     # Dashboard principal
│   ├── login.tsx         # Tela de login
│   ├── Ministers.tsx     # Gestão de ministros
│   ├── Settings.tsx      # Configurações
│   └── ...              # Outras páginas
│
├── services/            # Camada de serviços/API
│   ├── api.ts          # Cliente API base
│   ├── auth.service.ts  # Serviço de autenticação
│   ├── schedule.service.ts # Serviço de escalas
│   └── ...             # Outros serviços
│
├── config/             # Configurações
│   ├── routes.tsx      # Configuração de rotas centralizada
│   └── constants.ts    # Constantes da aplicação
│
├── types/              # TypeScript types/interfaces
│   └── index.ts        # Tipos centralizados
│
├── hooks/              # React hooks customizados
├── lib/                # Bibliotecas e utilitários
├── utils/              # Funções utilitárias
└── assets/             # Imagens, fontes, etc.
```

### 🔑 Principais Componentes

#### Autenticação (`components/auth/`)
- `AuthGuard`: Proteção de rotas
- `LoginForm`: Formulário de login
- `RegisterForm`: Formulário de cadastro

#### Dashboard (`components/dashboard/`)
- `DashboardStats`: Estatísticas
- `RecentActivity`: Atividades recentes
- `QuickActions`: Ações rápidas

#### Escalas (`components/schedule/`)
- `ScheduleCard`: Card de escala
- `ScheduleCalendar`: Calendário de escalas
- `ScheduleGenerator`: Gerador automático

## 🖥️ Backend (server/)

### 📂 Estrutura de Pastas

```
server/
├── routes/              # Rotas da API
│   ├── auth.ts         # Autenticação
│   ├── ministers.ts    # Ministros
│   ├── schedules.ts    # Escalas
│   └── questionnaires.ts # Questionários
│
├── config/             # Configurações
│   └── database.ts     # Configuração do banco
│
├── types/              # TypeScript types
├── utils/              # Utilitários
│   └── questionnaireGenerator.ts
│
├── auth.ts            # Lógica de autenticação
├── authRoutes.ts      # Rotas de autenticação
├── db.ts              # Conexão com banco
├── index.ts           # Entry point
└── storage.ts         # Camada de persistência
```

### 🔌 Principais Endpoints

#### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Cadastro
- `GET /api/auth/me` - Dados do usuário atual
- `POST /api/auth/change-password` - Alterar senha

#### Ministros
- `GET /api/ministers` - Listar ministros
- `POST /api/ministers` - Criar ministro
- `PUT /api/ministers/:id` - Atualizar ministro
- `DELETE /api/ministers/:id` - Remover ministro

#### Escalas
- `GET /api/schedules` - Listar escalas
- `POST /api/schedules` - Criar escala
- `POST /api/schedules/generate` - Gerar escalas automáticas

#### Questionários
- `GET /api/questionnaires/templates/:year/:month` - Obter template
- `POST /api/questionnaires/responses` - Enviar respostas

## 🗄️ Banco de Dados

### Tabelas Principais

- **users** - Usuários do sistema
- **schedules** - Escalas de missas
- **questionnaires** - Templates de questionários
- **questionnaireResponses** - Respostas dos questionários
- **notifications** - Sistema de notificações

## 🚀 Fluxos Principais

### 1. Autenticação
```
Login → Token JWT → Armazenamento → Rotas Protegidas
```

### 2. Gestão de Escalas
```
Questionário → Respostas → Geração Automática → Revisão → Publicação
```

### 3. Permissões (Roles)
- **gestor** (Reitor): Acesso total
- **coordenador**: Gestão de escalas e ministros
- **ministro**: Acesso às próprias informações

## 📝 Convenções de Código

### Nomenclatura
- **Componentes**: PascalCase (`ScheduleCard.tsx`)
- **Funções/Hooks**: camelCase (`useAuth.ts`)
- **Constantes**: UPPER_SNAKE_CASE (`API_URL`)
- **Types/Interfaces**: PascalCase com prefixo (`IUser`, `TSchedule`)

### Estrutura de Componentes
```tsx
// 1. Imports
import React from 'react';

// 2. Types/Interfaces
interface ComponentProps {
  // ...
}

// 3. Component
export function Component({ props }: ComponentProps) {
  // 4. Hooks
  // 5. State
  // 6. Effects
  // 7. Handlers
  // 8. Render
  return <div>...</div>;
}
```

## 🔧 Pontos de Ajuste Comuns

### Frontend
- **Rotas**: `client/src/config/routes.tsx`
- **Tipos**: `client/src/types/index.ts`
- **API Base**: `client/src/services/api.ts`
- **Autenticação**: `client/src/services/auth.service.ts`

### Backend
- **Rotas API**: `server/routes.ts`
- **Autenticação**: `server/auth.ts`
- **Banco de Dados**: `server/db.ts`
- **Schema**: `shared/schema.ts`

## 🛠️ Scripts Úteis

```bash
# Frontend
npm run dev          # Desenvolvimento
npm run build        # Build de produção
npm run preview      # Preview do build

# Backend
npm run dev          # Desenvolvimento com hot-reload
npm run build        # Build TypeScript
npm start           # Produção

# Database
npm run db:migrate   # Executar migrações
npm run db:seed      # Popular banco
```

## 📚 Tecnologias Principais

### Frontend
- React 18
- TypeScript
- Vite
- TanStack Query
- Tailwind CSS
- shadcn/ui
- Wouter (routing)

### Backend
- Node.js
- Express
- TypeScript
- Drizzle ORM
- PostgreSQL/SQLite
- JWT Authentication

## 🔐 Segurança

- Autenticação JWT
- Bcrypt para hash de senhas
- CORS configurado
- Rate limiting
- Validação com Zod

## 📱 Progressive Web App

- Service Worker configurado
- Manifest.json
- Instalável
- Funciona offline (parcial)
- Push notifications (preparado)

---

📅 **Última atualização**: Janeiro 2025
🔗 **Repositório**: [Link do GitHub]
📧 **Contato**: [Email do responsável]