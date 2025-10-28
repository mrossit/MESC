# Overview

This is a comprehensive church management system called MESC (Ministros Extraordinários da Sagrada Comunhão) for the Santuário São Judas Tadeu in Sorocaba, Brazil. The system manages extraordinary ministers of Holy Communion, handling scheduling, availability tracking, formation courses, and communication between coordinators and ministers. It serves approximately 150 active ministers with different user roles (gestor, coordenador, ministro) and provides features like automated schedule generation, questionnaire-based availability collection, and ministry management.

# Recent Changes

## AudioContext Loop Prevention (October 28, 2025)
Improved AudioContext implementation to prevent potential infinite loops:
- **Problem**: Potential for AudioContext to be called multiple times in quick succession
- **Solution**: 
  - Wrapped `playSoundAlert` in `useCallback` to prevent unnecessary recreations
  - Changed `forEach` to `some()` in `onAlertUpdate` to prevent multiple simultaneous calls
  - Added additional logging for sound state tracking
- **Files changed**: `client/src/pages/dashboard.tsx`
- **Impact**: AudioContext now properly memoized and called only once per alert event
- **Technical Note**: useCallback ensures stable function reference across re-renders

## User Management Page Freeze Fix (October 28, 2025)
Fixed critical bug causing page freeze when coordinators reset user passwords:
- **Problem**: Page would freeze/hang when coordinator used "Reset Password" feature on user management page
- **Root Cause**: Mutations were calling `queryClient.invalidateQueries({ queryKey: ["/api/users"] })` but page wasn't using TanStack Query for user data - it used local state with `useState` and manual `fetchUsers()`
- **Solution**: 
  - Moved `fetchUsers` declaration before mutations using `useCallback`
  - Replaced all `queryClient.invalidateQueries({ queryKey: ["/api/users"] })` calls with direct `await fetchUsers()` invocations
  - Applied fix to `resetPasswordMutation` (and identified same pattern in other mutations for consistency)
- **Files changed**: `client/src/pages/UserManagement.tsx`
- **Impact**: Password resets now work smoothly without page freeze, maintaining consistent state management pattern
- **Technical Note**: Mixed state management (useState + queryClient invalidation for non-existent query) was causing the freeze

## Push Notifications System Fix (October 27, 2025)
Fixed critical issues preventing push notifications from working:
- **Problem 1**: Table `push_subscriptions` did not exist in database, causing 500 errors on unsubscribe
- **Problem 2**: Settings page not using `usePushNotifications` hook, causing state persistence issues
- **Solution 1**: Created `push_subscriptions` table with proper schema and indexes
- **Solution 2**: Integrated `usePushNotifications` hook into Settings page for proper state management
- **Files changed**: 
  - Database: Created `push_subscriptions` table via SQL
  - `client/src/pages/Settings.tsx`: Integrated push notifications hook
- **Impact**: Users can now properly enable/disable push notifications via bell icon or settings, and state persists correctly
- **Features**: Full push notification support with VAPID keys, Service Worker integration, and automatic cleanup of expired subscriptions

## Substitution History Fix - Show Who Accepted (October 27, 2025)
Fixed missing substitute information in substitution history:
- **Problem**: Old substitutions (approved/auto_approved) showed requester but not who accepted the substitution
- **Root Cause**: Backend endpoint `/api/substitutions` was not populating `substituteUser` field despite data existing in database
- **Solution**: Enhanced API endpoint to fetch and include substitute minister details for all approved substitutions
- **Files changed**: `server/routes/substitutions.ts` (GET endpoint enrichment logic)
- **Impact**: Historical substitutions now retroactively display who accepted each request without database changes
- **Technical Note**: Uses Promise.all for efficient parallel lookups of substitute information

## Substitution System Enhancement (October 27, 2025)
Improved substitution workflow and user experience:
- **Position Display**: Changed format from "Velas 1 (Posição 5)" to "Posição 5 (Velas 1)" for clarity
- **Autonomous Substitutions**: Removed coordinator approval requirement - ministers can accept substitutions directly
- **Files changed**: 
  - `client/src/pages/Substitutions.tsx`: Updated UI format and removed approval messages
  - `server/routes/substitutions.ts`: Removed coordinator authorization check
- **Impact**: Faster, more autonomous substitution process without coordinator bottleneck

## WhatsApp API Extension - Substitutions (October 26, 2025)
Extended WhatsApp API with substitution management:
- **New Endpoints**: 7 total endpoints (3 new for substitutions)
- **Routes**: `/api/whatsapp/substituicoes-abertas`, `/api/whatsapp/aceitar-substituicao`, `/api/whatsapp/minhas-substituicoes`
- **Features**: List open substitutions, accept substitutions via WhatsApp, view minister's substitution history
- **Documentation**: Updated `docs/WHATSAPP_API.md` with full examples

## Schedule Calendar Fix (October 26, 2025)
Fixed calendar day click behavior:
- **Problem**: Clicking calendar days opened insertion dialog instead of view/edit
- **Solution**: Changed onClick handler to always call fetchScheduleForDate() for both published and draft schedules
- **Impact**: Coordinators can now properly view/edit existing schedules by clicking days
- **File**: `client/src/pages/Schedules.tsx`

## WhatsApp API Integration (October 26, 2025)
Added REST API for WhatsApp integration via Make (Integromat) + OpenAI:
- **Feature**: Schedule query endpoints using phone number as identifier
- **Routes**: `/api/whatsapp/escala`, `/api/whatsapp/proximas`, `/api/whatsapp/colegas`
- **Security**: API key authentication (no CSRF needed, stateless)
- **Files**: `server/routes/whatsapp-api.ts`, `docs/WHATSAPP_API.md`
- **Environment**: Requires `WHATSAPP_API_KEY` secret to be configured
- **Use Case**: Allows ministers to query schedules via WhatsApp chatbot

# Recent Critical Fixes

## Version 5.4.2 - Force Cache Clear (October 23, 2025)
Fixed blank screen (tela preta) issue reported by multiple users:
- **Problem**: Users seeing blank screen due to stale browser cache
- **Solution**: Incremented version from 5.4.1 to 5.4.2 to trigger automatic cache clear
- **Files changed**: `server/routes/version.ts`
- **Impact**: All users will see update notification and be prompted to refresh, clearing cache automatically
- **Mechanism**: `useVersionCheck` hook detects version change every 2 minutes, shows update banner, clears all caches on user confirmation

## Schedule Editing Permissions Fix (October 23, 2025)
Extended editing permissions for coordinators and auxiliary ministers:
- **Problem**: Only gestores could edit schedules after 3 hours post-mass
- **Solution**: Coordinators and Auxiliares 1 & 2 can now edit anytime
- **Files changed**: `server/routes/schedule-assignments.ts`
- **Impact**: Coordinators and auxiliary ministers can now edit published schedules without time restrictions

## Email Authentication Fix (October 20, 2025)
Fixed critical authentication issue where users couldn't login after name formatting updates:
- **Problem**: Email lookup was case-sensitive, causing login failures when users entered emails in different case formats
- **Solution**: All emails now normalized to lowercase in login, registration, and password reset
- **Migration**: Run `tsx scripts/normalize-emails.ts` in production to normalize existing emails
- **Files changed**: `server/auth.ts` (login, register, resetPassword functions)
- **Impact**: All existing and new users can now login with any email case variation

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The application uses a modern React 18+ frontend with TypeScript, built with Vite as the bundler. The UI is constructed using Tailwind CSS with Shadcn/UI components accessed via MCP (Model Context Protocol). State management is handled through TanStack Query for server state and Wouter for client-side routing. The design system follows a liturgical color palette with neutral tones (beige, bronze, gold) appropriate for church usage.

## Backend Architecture
The backend is built on Node.js with Express and TypeScript. It implements JWT-based authentication with bcrypt password hashing. The API follows RESTful conventions with middleware for authentication and role-based authorization. Routes are modularized by feature area (auth, schedules, ministers, notifications).

## Database Design
Uses PostgreSQL (hosted on Neon) with Drizzle ORM for type-safe database operations. The schema includes comprehensive user management with role-based permissions, scheduling with liturgical positions, questionnaire system for availability tracking, formation modules, notifications, and family relationship management between ministers. Database migrations are managed through Drizzle Kit.

## Authentication & Authorization
Custom JWT-based authentication system with role-based permissions:
- **Gestor**: Full system administration
- **Coordenador**: Operational management and reporting
- **Ministro**: Personal data management and availability reporting
Session management uses HTTP-only cookies for security.

## PWA Implementation
Configured as a Progressive Web App with service worker for offline functionality, manifest.json for installation, and update prompts for new versions. Includes responsive design optimized for mobile usage by ministers.

## Cache Management & Auto-Update System
Implemented automatic cache invalidation and version control to ensure users always see the latest changes without manual intervention:

### Service Worker (v5.4.0+)
- **DISABLED in Replit Preview**: Service Worker is completely disabled in Replit preview environment to prevent cache-related connection issues. Automatically unregisters any existing service workers.
- **ENABLED in Production/External Browsers**: Full PWA functionality with offline support
- **Network-First Strategy for Critical APIs**: Schedule and minister data always fetched fresh from server (never cached)
- **Cache-First for Static Assets**: Images, fonts, and icons cached for offline access
- **Automatic Cache Cleanup**: Old cache versions deleted automatically on activation
- Location: `client/public/sw.js`, detection logic in `client/index.html`

### Version Detection
- **Endpoint**: `/api/version` returns current system version (5.4.2) and build timestamp
- **Auto-Check Hook**: `useVersionCheck` hook checks version every 2 minutes in production
- **Automatic Update**: When new version detected:
  1. Clears all browser caches (Cache API and Service Worker)
  2. Unregisters old service workers
  3. Forces page reload with cache bust
- No manual cache clearing needed by users

### Update Flow
1. Developer increments VERSION in `server/routes/version.ts`
2. Deploy triggers new build with timestamp
3. Clients detect version change within 2 minutes
4. Automatic cache clear and reload happens seamlessly
5. User sees latest changes immediately

### Key Files
- Service Worker: `client/public/sw.js`
- Version Check Hook: `client/src/hooks/useVersionCheck.tsx`
- Version Endpoint: `server/routes/version.ts`
- PWA Update Prompt: `client/src/components/pwa-update-prompt.tsx`

## Scheduling System
Intelligent schedule generation using AI-assisted questionnaire analysis. Supports liturgical positions mapping, mass time management by day of week, and automated minister assignment based on availability and experience.

# External Dependencies

## Core Infrastructure
- **Neon Database**: PostgreSQL hosting with connection pooling
- **Replit**: Primary hosting and deployment platform

## Frontend Libraries
- **React 18+**: UI framework with hooks and context
- **TanStack Query**: Server state management and caching
- **Wouter**: Lightweight client-side routing
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/UI**: Component library accessed via MCP
- **Lucide React**: Icon library

## Backend Services
- **Express**: Web application framework
- **Drizzle ORM**: Type-safe database operations
- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT authentication
- **cookie-parser**: HTTP cookie parsing

## Additional Integrations
- **QRCode**: QR code generation for app sharing
- **date-fns**: Date manipulation with Portuguese locale support
- **Sharp**: Image processing for profile photos (planned)
- **Multer**: File upload handling (planned)

## Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety across the stack
- **ESBuild**: Production bundling
- **PostCSS**: CSS processing with Tailwind