# Overview

This project is MESC (Ministros Extraordinários da Sagrada Comunhão), a comprehensive church management system for Santuário São Judas Tadeu in Sorocaba, Brazil. Its purpose is to manage extraordinary ministers of Holy Communion, handling scheduling, availability tracking, formation courses, and communication. It supports approximately 150 ministers with various user roles (gestor, coordenador, ministro) and provides features such as automated schedule generation, questionnaire-based availability collection, and ministry management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend uses React 18+ with TypeScript, built with Vite. UI is developed with Tailwind CSS and Shadcn/UI components via MCP. State management is handled by TanStack Query for server state and Wouter for client-side routing. The design system uses a liturgical color palette with neutral tones.

## Backend Architecture
The backend is built with Node.js, Express, and TypeScript. It features JWT-based authentication with bcrypt password hashing. The API adheres to RESTful conventions, utilizing middleware for authentication and role-based authorization, with modularized routes.

## Database Design
The system uses PostgreSQL (Neon) with Drizzle ORM for type-safe operations. The schema supports user management with role-based permissions, scheduling with liturgical positions, a questionnaire system for availability, formation modules, notifications, and family relationship management. Database migrations are managed via Drizzle Kit.

## Authentication & Authorization
A custom JWT-based system provides role-based permissions for Gestor (full admin), Coordenador (operational management), and Ministro (personal data). Session management uses secure HTTP-only cookies.

## PWA Implementation
The application is configured as a Progressive Web App with a service worker for offline functionality, a manifest.json for installation, and update prompts for new versions. It features a responsive design optimized for mobile use.

## Cache Management & Auto-Update System
An automatic cache invalidation and version control system ensures users always access the latest version. This includes a service worker (disabled in Replit preview, enabled in production) with network-first strategy for critical data and cache-first for static assets, automatic cache cleanup, and a version detection system that triggers a cache clear and reload upon new version deployment.

## Scheduling System
The system includes intelligent schedule generation using AI-assisted questionnaire analysis, supporting liturgical positions, mass time management, and automated minister assignment based on availability and experience.

### Special Placeholder Ministers
The system uses special minister accounts that function as placeholders in schedules:
- **VACANTE**: Represented by `ministerId = null` in the database. Used for empty positions that need to be filled.
- **Ministro SM**: A real minister account (ID: `4cf55562-038f-4a0e-a8e4-9b98169f1339`) used as a placeholder for specific purposes. Email: `sm@placeholder.mesc`
- **Ministro SJME**: A real minister account (ID: `817bf5fd-3df3-412b-acb8-d633927bd308`) used as a placeholder for specific purposes. Email: `sjme@placeholder.mesc`

These special ministers can be assigned to schedule positions like regular ministers but serve as visual markers for positions requiring special attention or coordination.

# External Dependencies

## Core Infrastructure
- **Neon Database**: PostgreSQL hosting
- **Replit**: Hosting and deployment

## Frontend Libraries
- **React 18+**: UI framework
- **TanStack Query**: Server state management
- **Wouter**: Client-side routing
- **Tailwind CSS**: CSS framework
- **Shadcn/UI**: Component library
- **Lucide React**: Icon library

## Backend Services
- **Express**: Web application framework
- **Drizzle ORM**: Database operations
- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT authentication
- **cookie-parser**: HTTP cookie parsing

## Additional Integrations
- **QRCode**: QR code generation
- **date-fns**: Date manipulation
- **WhatsApp API**: Integration via Make (Integromat) + OpenAI for schedule queries and substitution management.