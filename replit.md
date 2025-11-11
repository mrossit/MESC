# MESC - Ministros Extraordinários da Sagrada Comunhão

## Overview

MESC is a comprehensive web application designed for managing Extraordinary Ministers of Holy Communion at São Judas Tadeu Parish. The system handles minister scheduling, availability tracking, formation courses, and administrative workflows. Built as a full-stack Progressive Web Application (PWA), it provides both desktop and mobile experiences with offline capabilities.

**Core Purpose:**
- Automated mass schedule generation based on minister availability
- Monthly questionnaire system for gathering liturgical availability
- Formation and training management for ministers
- Real-time notifications and communication
- Administrative tools for coordinators and managers

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** React 18 with TypeScript
**Build Tool:** Vite 5.4.19
**State Management:** 
- React Query (TanStack Query) for server state
- React Hooks for local state
**UI Framework:** Radix UI + shadcn/ui components with Tailwind CSS
**Routing:** Wouter (lightweight client-side routing)
**PWA:** Service Worker with aggressive cache busting strategy

**Key Design Decisions:**
- **Component-based architecture** organized by feature domains (schedules, ministers, questionnaires, formation)
- **Custom hooks pattern** for data fetching and business logic separation
- **Drag-and-drop capabilities** using @dnd-kit for schedule management
- **Responsive design** with mobile-first approach and separate mobile/desktop views
- **Real-time updates** via WebSocket with polling fallback
- **Offline-first** with service worker caching for critical resources

**Folder Structure:**
```
client/src/
├── components/        # Reusable UI components
├── features/          # Feature-specific modules (schedules, etc.)
├── pages/            # Route pages
├── hooks/            # Custom React hooks
├── services/         # API client services
├── config/           # Configuration (routes, constants)
└── lib/              # Utilities and helpers
```

### Backend Architecture

**Runtime:** Node.js with Express.js
**Language:** TypeScript with ES modules
**Database ORM:** Drizzle ORM
**Authentication:** JWT-based with bcrypt password hashing
**API Design:** RESTful with organized route modules

**Key Design Decisions:**
- **Modular route organization** - Routes separated by domain (ministers, schedules, questionnaires, etc.)
- **Middleware-based security** - Authentication, CSRF protection, rate limiting
- **Service layer pattern** - Business logic separated from route handlers
- **Database abstraction** - Storage layer wrapping Drizzle ORM operations
- **Real-time communication** - WebSocket support for live updates

**Folder Structure:**
```
server/
├── routes/           # API endpoint definitions by domain
├── middleware/       # Authentication, CSRF, rate limiting
├── utils/            # Business logic (schedule generator, questionnaire service)
├── services/         # External service integrations
├── db.ts            # Database configuration
├── storage.ts       # Data access layer
└── auth.ts          # Authentication logic
```

**Critical Algorithm - Schedule Generator:**
The core scheduling algorithm (`server/utils/scheduleGenerator.ts`) implements a fair distribution system:
- **Priority-based mass ordering** (special celebrations → regular masses)
- **Availability filtering** from monthly questionnaires
- **Fair rotation** - Limits assignments per minister (max 4/month)
- **Conflict prevention** - No duplicate assignments on same day
- **Position preferences** - Respects minister's preferred roles
- **Family coordination** - Can group or separate married ministers

**Performance Optimization - Two-Tier Caching Strategy:**

**Backend Cache Layer** (`server/services/scheduleCache.ts`):
- **Purpose:** Reduce PostgreSQL database load for frequently accessed monthly schedules
- **Cache Strategy:** Read-through caching with 1-hour TTL fallback
- **Cache Key:** Month-based (`${year}-${month}`) for efficient monthly views
- **Invalidation:** Automatic cache clearing on all schedule/substitution mutations
- **Invalidation Points:**
  - Schedule CRUD operations (create, update, delete, publish, unpublish)
  - Bulk operations (save-generated, emergency-save)
  - Substitution workflows (create, respond, claim, cancel)
- **Benefits:** Reduces database load for frequently accessed monthly schedules
- **Monitoring:** Built-in stats tracking (hits, misses, size)

**Frontend Cache Layer** (React Query):
- **Purpose:** Optimize HTTP requests and provide instant UI updates
- **Cache Strategy:** TanStack Query with hierarchical queryKey invalidation
- **Invalidation Pattern:** Uses `exact: false` to enable broad invalidations
- **Key Pattern:**
  ```typescript
  // Invalidates all schedule-related queries (current and future hierarchical keys)
  queryClient.invalidateQueries({ queryKey: ["/api/schedules"], exact: false });
  // Maintains specific invalidations for queries with different prefixes
  queryClient.invalidateQueries({ queryKey: ["/api/schedules/minister/upcoming"] });
  ```
- **Benefits:** 
  - Supports future hierarchical queryKeys (e.g., `['/api/schedules', { year, month }]`)
  - Automatic cache synchronization between related data (substitutions → schedules)
  - Better UX with instant data updates after mutations
- **Implementation:** All mutation points in schedules and substitutions invalidate both layers

### Data Storage Solutions

**Primary Database:** PostgreSQL (via Neon serverless)
**Development Fallback:** SQLite (better-sqlite3)
**ORM:** Drizzle ORM with both PostgreSQL and SQLite dialects

**Schema Organization:**
```
shared/schema.ts - Centralized schema definition
├── users              # Authentication and profiles
├── ministers          # Minister information and preferences
├── questionnaires     # Monthly availability surveys
├── questionnaire_responses  # Minister responses
├── schedules          # Generated mass schedules
├── schedule_assignments    # Minister-to-mass assignments
├── formations         # Training courses and lessons
├── notifications      # System notifications
└── activity_logs      # Audit trail
```

**Key Design Decisions:**
- **JSONB fields** for flexible data (responses, preferences, liturgical info)
- **Standardized response format** (v2.0) for questionnaires with explicit yes/no per mass
- **Compatibility layer** for reading different questionnaire formats across months
- **Automatic migrations** via Drizzle Kit
- **Backup system** with automated database dumps

### Authentication & Authorization

**Strategy:** JWT (JSON Web Tokens) with httpOnly cookies
**Password Security:** bcrypt with salt rounds (10)
**Roles:** Three-tier hierarchy
- `ministro` - Basic minister access (own data, questionnaires, schedules)
- `coordenador` - Coordinator access (schedule management, reports)
- `gestor` - Manager access (full system administration)

**Security Features:**
- CSRF protection via tokens
- Rate limiting on authentication endpoints
- Helmet.js security headers
- CORS restrictions (whitelist-based)
- Session management with automatic expiration
- Role-based route protection

**Key Design Decisions:**
- **Stateless authentication** - JWT allows horizontal scaling
- **Secure cookie storage** - Prevents XSS attacks on tokens
- **Role-based middleware** - Reusable authorization checks
- **Development mode role switcher** - Fast testing across roles

### API Structure

**Pattern:** RESTful with domain-based organization
**Format:** JSON request/response
**Error Handling:** Consistent error response format with proper HTTP status codes

**Main API Domains:**
```
/api/auth/*              # Authentication (login, logout, session)
/api/ministers/*         # Minister CRUD and management
/api/questionnaires/*    # Questionnaire generation and responses
/api/schedules/*         # Schedule generation, viewing, editing
/api/formations/*        # Training courses and progress
/api/dashboard/*         # Dashboard statistics and alerts
/api/notifications/*     # Real-time notifications
/api/auxiliary/*         # Auxiliary leader panel (pre/during/post-mass)
```

**Key Endpoints:**
- `POST /api/schedules/generate-smart` - Fair algorithm schedule generation
- `POST /api/questionnaires/generate` - Liturgically-aware questionnaire creation
- `PUT /api/schedules/manual-adjustment` - Drag-drop minister adjustments
- `GET /api/dashboard/ministry-stats` - Real-time dashboard metrics

## External Dependencies

### Third-Party Services

**Database Hosting:** Neon (PostgreSQL serverless)
- Serverless PostgreSQL with automatic scaling
- Connection pooling via `@neondatabase/serverless`
- Environment variable: `DATABASE_URL`

**Email Service:** Not currently implemented (placeholder in code)
- Future integration point for notifications
- SMTP configuration ready in environment variables

**WhatsApp Integration:** Placeholder endpoint (`appwa.js`)
- Webhook for future WhatsApp Business API integration
- Currently used for manual communication

### Key NPM Packages

**Frontend:**
- `react` & `react-dom` (^18.3.1) - UI framework
- `@tanstack/react-query` (^5.60.5) - Server state management
- `wouter` (^3.3.5) - Lightweight routing
- `@radix-ui/*` - Headless UI components
- `@dnd-kit/*` - Drag-and-drop functionality
- `jspdf` & `jspdf-autotable` - PDF generation
- `xlsx` - Excel export
- `date-fns` - Date manipulation

**Backend:**
- `express` (^4.21.1) - Web framework
- `drizzle-orm` (^0.38.3) - Database ORM
- `bcrypt` (^6.0.0) - Password hashing
- `jsonwebtoken` (^9.0.2) - JWT authentication
- `cookie-parser` (^1.4.7) - Cookie handling
- `helmet` (^8.0.0) - Security headers
- `ws` (^8.18.0) - WebSocket support

**Development:**
- `typescript` (^5.6.3) - Type safety
- `vite` (^5.4.19) - Build tool
- `vitest` (^2.1.4) - Testing framework
- `tsx` (^4.19.2) - TypeScript execution

### Build & Deployment

**Build Process:**
1. Version injection (`scripts/inject-version.js`)
2. Vite frontend build → `dist/public/`
3. esbuild server bundle → `dist/index.js`
4. Service worker with build timestamp

**Cache Strategy:**
- Static versioning based on `package.json` version
- Build-time timestamp injection for cache busting
- Aggressive old cache deletion on service worker activation

**Environment Variables Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT signing (required, no default)
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `ALLOWED_ORIGINS` - CORS whitelist (production)

**Deployment Target:** Replit (with adaptability for other platforms)