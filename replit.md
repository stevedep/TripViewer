# Overview

This is a Dutch train trip planner web application that provides comprehensive journey information using the NS API. The application has been converted to a **static website** deployment approach, making direct API calls from the frontend to the NS (Nederlandse Spoorwegen) API.

**Current Status**: Fully functional material type filtering system with static website deployment (August 1, 2025)

Key features:
- Real-time trip search with flexible datetime selection
- Advanced trip result display with dynamic loading
- Comprehensive NS transportation data integration
- **Material type filtering** - filter trips by exact train types (IC, ICD, ICNG, VIRM, DDZ, Flirt, SNG, SPR)
- **Transfer filtering** - filter by number of transfers (0, 2, 3+)
- **Combined filtering** - use both transfer and material type filters simultaneously
- Responsive and user-friendly trip information interface
- **Static deployment ready** - no server-side components required

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side is built using React with TypeScript and utilizes modern React patterns including hooks and functional components. The UI framework is built on shadcn/ui components with Radix UI primitives, providing a comprehensive set of accessible and customizable UI elements. The styling is handled through Tailwind CSS with custom design tokens that follow NS branding guidelines (blue and orange color scheme).

State management is handled through React Query (TanStack Query) for server state and local React state for UI interactions. The application uses Wouter for client-side routing, providing a lightweight alternative to React Router.

Form handling is implemented using React Hook Form with Zod for validation, ensuring type-safe form processing and robust error handling.

## Static Website Architecture (Current)
The application now operates as a static website with all API calls made directly from the frontend. The previous Express.js backend has been replaced with frontend-only services that interact directly with the NS API.

**Key Changes Made (August 1, 2025):**
- Removed server-side proxy pattern
- Created `client/src/lib/nsApi.ts` for direct NS API integration
- Updated query client to use frontend services instead of backend routes
- Built static deployment configuration with proper file structure
- **Material Type Filtering System**: Comprehensive filtering by train types using Virtual Train API
- **Enhanced Trip Display**: Shows exact train types (ICD, ICNG, VIRM, DDZ, Flirt, SNG) in trip headers
- **Combined Filter Logic**: Parent component handles both transfer and material type filtering
- **ICD Train Support**: Special handling for ICD trains (NS API category "IC" → Virtual Train API type "ICD")

## Data Storage Solutions
The application currently uses in-memory storage for user data through a custom storage interface that could be easily swapped for a database implementation. Drizzle ORM is configured for PostgreSQL integration, indicating plans for persistent data storage.

Session management is implemented using connect-pg-simple for PostgreSQL-backed sessions, though the current implementation may be using memory storage in development.

## Authentication and Authorization
The codebase includes basic user management structures with interfaces for user creation and retrieval. The storage layer supports user authentication patterns, though the current implementation appears to be simplified for development purposes.

## External Service Integrations
The primary external integration is with the NS (Nederlandse Spoorwegen) API for real-time train schedule data. The application now makes direct calls from the frontend using CORS-enabled requests.

**Static Deployment Integration:**
- Direct frontend calls to `gateway.apiportal.ns.nl`
- Proper headers and API key configuration
- CORS error handling with user-friendly fallbacks
- Schema validation using Zod for API response validation

**Build Process:**
- Created `build-static.js` for static deployment preparation
- Moves files from `dist/public/` to `dist/` root for proper static hosting
- Removes server-side components during build process

# External Dependencies

## Core Framework Dependencies
- **React 18** - Frontend framework with TypeScript support
- **Express.js** - Backend web framework
- **Vite** - Build tool and development server with React plugin
- **TypeScript** - Type safety across the entire stack

## UI and Styling
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library built on Radix UI primitives
- **Radix UI** - Comprehensive collection of accessible UI components
- **Lucide React** - Icon library for consistent iconography

## Data Management
- **TanStack React Query** - Server state management and caching
- **React Hook Form** - Form handling and validation
- **Zod** - Schema validation for TypeScript
- **Drizzle ORM** - Type-safe ORM for PostgreSQL

## Database and Session Management
- **PostgreSQL** - Primary database (via Neon serverless)
- **connect-pg-simple** - PostgreSQL session store for Express

## Development and Build Tools
- **ESBuild** - Fast JavaScript bundler for production builds
- **PostCSS** - CSS processing with Autoprefixer
- **Wouter** - Lightweight client-side routing

## External APIs
- **NS API** - Nederlandse Spoorwegen (Dutch Railways) API for real-time train data and trip planning