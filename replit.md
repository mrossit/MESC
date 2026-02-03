# MESC - Ministros Extraordinários da Sagrada Comunhão

## Overview

MESC is a full-stack web application for managing Extraordinary Ministers of Holy Communion at a Catholic parish (Santuário São Judas Tadeu). The system handles minister scheduling, questionnaire management for availability, formation/training modules, and real-time coordination between coordinators and ministers.

The application is built as a Progressive Web App (PWA) with offline support, real-time updates via WebSocket, and mobile-first responsive design. It supports three user roles: ministro (minister), coordenador (coordinator), and gestor (manager).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom plugins for service worker timestamp injection
- **Routing**: Wouter (lightweight router)
- **State Management**: TanStack React Query for server state caching
- **UI Components**: shadcn/ui (Radix UI primitives) with Tailwind CSS
- **Drag & Drop**: @dnd-kit for schedule editing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Style**: RESTful JSON API
- **Authentication**: JWT tokens with cookie-based sessions
- **Real-time**: WebSocket for live updates (with polling fallback)
- **Build**: esbuild for production bundling with `--packages=external` flag for native modules

### Data Storage
- **Primary Database**: PostgreSQL via Neon (serverless)
- **ORM**: Drizzle ORM with typed schema
- **Local Development**: SQLite option available via separate drizzle config
- **Schema Location**: `shared/schema.ts` (shared between client and server)

### Key Design Patterns
- **Feature-based organization**: Complex pages like Schedules are broken into `features/schedules/` with separate components, hooks, utils, and types
- **Compatibility layer**: Questionnaire responses have version detection to handle format changes across months without database modifications
- **Service worker caching**: Strategic cache invalidation with static versioning based on package.json version

### Authentication & Authorization
- JWT-based authentication with role-based access control
- Three roles: ministro, coordenador, gestor
- CSRF protection middleware
- Rate limiting on sensitive endpoints

### Schedule Generation Algorithm
- Fair distribution algorithm with configurable limits (max 4 assignments per month)
- Respects minister preferences and availability from questionnaires
- Priority system for special masses (solemnities, feast days)
- Compatibility layer for reading different questionnaire formats across months

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless Postgres database (`@neondatabase/serverless`)
- Connection via `DATABASE_URL` environment variable with SSL

### AI Integration
- **Anthropic Claude**: `@anthropic-ai/sdk` for AI-powered features

### Development Tools
- **BMad Method**: Agile AI-driven planning workflow in `.bmad-core/`
- **shadcn MCP**: Component installation via `.mcp.json`
- **Drizzle Kit**: Database migrations and studio

### Build & Deploy
- **Vite**: Frontend bundling with React plugin
- **esbuild**: Server bundling (requires `--packages=external` for native modules like bcrypt, better-sqlite3)
- **Service Worker**: Custom PWA with cache busting based on version

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default 5000)
- `NODE_ENV`: development/production
- `VERIFY_TOKEN`: WhatsApp webhook verification (if using appwa.js)