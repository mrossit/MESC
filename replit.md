# Overview

This is a comprehensive church management system called MESC (Ministros Extraordinários da Sagrada Comunhão) for the Santuário São Judas Tadeu in Sorocaba, Brazil. The system manages extraordinary ministers of Holy Communion, handling scheduling, availability tracking, formation courses, and communication between coordinators and ministers. It serves approximately 150 active ministers with different user roles (gestor, coordenador, ministro) and provides features like automated schedule generation, questionnaire-based availability collection, and ministry management.

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