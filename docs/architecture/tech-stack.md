# Tech Stack - Sistema MESC

## Visão Geral

Sistema de gerenciamento de escalas para ministros da Eucaristia, desenvolvido com stack moderno full-stack TypeScript.

## Frontend

### Framework & UI
- **React 18** - Biblioteca UI com hooks
- **TypeScript** - Type safety
- **Vite** - Build tool e dev server rápido
- **TanStack Query (React Query)** - Data fetching e cache
- **React Router DOM** - Roteamento client-side

### UI Components & Styling
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Componentes acessíveis headless:
  - Accordion, Alert Dialog, Avatar, Checkbox
  - Dialog, Dropdown Menu, Label, Popover
  - Progress, Radio Group, Scroll Area
  - Select, Separator, Slider, Switch
  - Tabs, Toast, Tooltip
- **Lucide React** - Ícones SVG
- **shadcn/ui** - Componentes pre-construídos com Radix + Tailwind

### Forms & Validation
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Schema validation (compartilhado com backend)
- **@hookform/resolvers** - Integração Zod + React Hook Form

### Utilitários
- **date-fns** - Manipulação de datas
- **clsx** - Composição de classes CSS
- **tailwind-merge** - Merge inteligente de classes Tailwind

## Backend

### Runtime & Framework
- **Node.js 20+** - Runtime JavaScript
- **Express.js** - Framework web minimalista
- **TypeScript** - Type safety no servidor

### Database & ORM
- **PostgreSQL** - Banco de dados relacional (via Neon)
- **Drizzle ORM** - Type-safe SQL ORM
- **@neondatabase/serverless** - Driver PostgreSQL serverless

### Autenticação & Segurança
- **JWT (jsonwebtoken)** - Tokens de autenticação
- **bcryptjs** - Hash de senhas
- **cookie-parser** - Parsing de cookies
- **helmet** - Security headers HTTP

### Storage & Upload
- **Multer** - Upload de arquivos multipart/form-data
- **Sharp** - Processamento de imagens (resize, crop)

### Email & Comunicação
- **Nodemailer** - Envio de emails
- **Mailgun Transport** - Provider de email

### Utilitários Backend
- **uuid** - Geração de UUIDs
- **zod** - Validação de schemas (compartilhado com frontend)
- **dotenv** - Variáveis de ambiente

## Build & Dev Tools

### Compilação
- **esbuild** - Bundler super rápido para backend
- **Vite** - Build tool para frontend
- **TypeScript Compiler (tsc)** - Type checking

### Desenvolvimento
- **tsx** - Execute TypeScript diretamente
- **Drizzle Kit** - Migrations e schema management
- **Concurrently** - Run múltiplos scripts em paralelo

## Database Schema Management

### Drizzle ORM Features
- Type-safe queries
- Schema definition em TypeScript
- Migrations automáticas
- Support para PostgreSQL types avançados (jsonb, arrays, etc)

## Deployment & Infrastructure

### Platform
- **Replit** - Hosting e desenvolvimento
- **Neon Database** - PostgreSQL serverless gerenciado

### Environment
- **Production**: Node.js runtime
- **Development**: Vite dev server + tsx watch mode

## Padrões de Código

### Arquitetura
- **Monorepo** - Frontend e backend no mesmo repositório
- **Shared Types** - Schemas e tipos compartilhados via `/shared`
- **RESTful API** - Endpoints organizados por recurso

### Estrutura de Pastas
```
/
├── client/          # Frontend React
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── lib/
├── server/          # Backend Express
│   ├── routes/      # API routes
│   ├── auth.ts      # Autenticação
│   ├── db.ts        # Database connection
│   └── storage.ts   # Data access layer
├── shared/          # Código compartilhado
│   ├── schema.ts    # Drizzle schema + Zod
│   └── constants.ts
└── public/          # Assets estáticos
```

## Versões Principais

- Node.js: 20+
- TypeScript: 5.x
- React: 18.x
- Express: 4.x
- Drizzle ORM: Latest
- PostgreSQL: 15+

## Integrations & Services

### Agentes AI (BMad Method)
- Framework de planejamento e desenvolvimento agêntico
- Agentes especializados (Analyst, PM, Architect, Dev, QA)
- Localização: `.bmad-core/`

### Component Library (shadcn)
- MCP Server para componentes UI
- Configurado em `.claude/settings.local.json`

## Performance Optimizations

- **React Query** - Caching automático de API calls
- **Vite HMR** - Hot Module Replacement rápido
- **esbuild** - Build de produção extremamente rápido
- **Sharp** - Otimização de imagens server-side
- **PostgreSQL Indexes** - Queries otimizadas

## Security Features

- Helmet middleware (security headers)
- Bcrypt password hashing
- JWT token authentication
- CORS configurado
- Cookie-based sessions
- SQL injection protection (Drizzle ORM prepared statements)
- XSS protection (React auto-escaping)

## Monitoring & Logging

- Console logging estruturado
- Request/Response logging middleware
- Error handling centralizado
- Activity logs (user actions tracking)
