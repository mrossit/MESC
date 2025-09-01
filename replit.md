# MESC System - Ministros Extraordinários da Sagrada Comunhão

## Overview

The MESC (Ministros Extraordinários da Sagrada Comunhão) System is a comprehensive web application designed for the Santuário São Judas Tadeu in Sorocaba/SP to manage their 200+ Extraordinary Ministers of Sacred Communion across 15 weekly masses. The system automates schedule creation, manages availability through configurable questionnaires, facilitates substitutions between ministers, centralizes communications, and tracks continuous formation activities.

The application serves three main user types: 1 Reitor (Pe. Flávio Júnior as general supervisor), 2 Coordinators (Marco Rossit for technical management, Priscila Machado and Ana Paula for operational and liturgical management), and 200+ Ministers (active ministry members).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application uses a modern React-based frontend with TypeScript, built on Vite for development and bundling. The UI is constructed using shadcn/ui components with Radix UI primitives, providing a consistent and accessible design system. Styling is implemented through Tailwind CSS with a custom São Judas purple theme, supporting both light and dark modes. The routing is handled by Wouter for client-side navigation, and state management utilizes TanStack Query for server state and React hooks for local state.

### Backend Architecture  
The server-side is built with Express.js and TypeScript, following a RESTful API design pattern. The application uses a modular approach with separate route handlers, storage layer abstraction, and middleware for authentication and request logging. The backend serves both API endpoints and static assets, with Vite integration for development hot-reloading.

### Database Design
The system uses PostgreSQL as the primary database with Drizzle ORM for type-safe database operations and migrations. The schema includes comprehensive tables for users, questionnaires, questionnaire responses, schedules, schedule assignments, notifications, and mass time configurations. Enums are used for user roles (reitor, coordenador, ministro), user status (active, inactive, pending), schedule status (draft, published, completed), and notification types.

### Authentication and Authorization
Authentication is implemented using Replit's OpenID Connect integration with Passport.js for session management. Sessions are stored in PostgreSQL using connect-pg-simple, with a 7-day TTL and secure cookie configuration. The system includes role-based access control with different permission levels for each user type.

### UI/UX Design System
The interface follows a cohesive design system with the São Judas purple theme (#8B5CF6) as the primary color. The system includes comprehensive component library with cards, buttons, forms, tables, dialogs, and navigation elements. Typography uses Inter for body text and Poppins for headings, with responsive breakpoints from mobile to 5K displays.

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL database hosting with connection pooling
- **Drizzle ORM**: Type-safe database operations and schema management
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### Authentication Services  
- **Replit Auth**: OpenID Connect authentication provider
- **Passport.js**: Authentication middleware for Node.js
- **openid-client**: OpenID Connect client implementation

### UI Framework and Components
- **React**: Frontend JavaScript library with TypeScript support
- **Radix UI**: Headless component primitives for accessibility
- **shadcn/ui**: Pre-built component library based on Radix UI
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide React**: Icon library for consistent iconography

### Development and Build Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Static type checking for JavaScript
- **TanStack Query**: Data fetching and caching library
- **Wouter**: Lightweight client-side routing
- **PostCSS**: CSS processing with Autoprefixer

### Communication and Notifications
The system is designed to integrate with WhatsApp and email services for sending questionnaires and notifications to ministers, though specific providers are not yet implemented in the current codebase.

### Production Deployment
The application is configured for deployment on Replit with environment-specific configurations for development and production modes, including proper static file serving and API route handling.