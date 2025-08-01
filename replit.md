# Overview

This is a full-stack web application that provides a trip planning interface for the Netherlands railway system (NS). The application allows users to search for train routes between stations and displays detailed trip information including transfers, delays, and real-time status updates. It integrates with the NS API to fetch live train schedule data and presents it through a modern, responsive user interface.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client-side is built using React with TypeScript and utilizes modern React patterns including hooks and functional components. The UI framework is built on shadcn/ui components with Radix UI primitives, providing a comprehensive set of accessible and customizable UI elements. The styling is handled through Tailwind CSS with custom design tokens that follow NS branding guidelines (blue and orange color scheme).

State management is handled through React Query (TanStack Query) for server state and local React state for UI interactions. The application uses Wouter for client-side routing, providing a lightweight alternative to React Router.

Form handling is implemented using React Hook Form with Zod for validation, ensuring type-safe form processing and robust error handling.

## Backend Architecture
The server is built with Express.js using TypeScript and follows a RESTful API design. The main entry point sets up middleware for JSON parsing, request logging, and error handling. The server architecture is modular with separate route handling and utilities.

The application uses a proxy pattern to interact with the NS (Nederlandse Spoorwegen) API, handling authentication and request formatting while providing a simplified interface to the frontend.

## Data Storage Solutions
The application currently uses in-memory storage for user data through a custom storage interface that could be easily swapped for a database implementation. Drizzle ORM is configured for PostgreSQL integration, indicating plans for persistent data storage.

Session management is implemented using connect-pg-simple for PostgreSQL-backed sessions, though the current implementation may be using memory storage in development.

## Authentication and Authorization
The codebase includes basic user management structures with interfaces for user creation and retrieval. The storage layer supports user authentication patterns, though the current implementation appears to be simplified for development purposes.

## External Service Integrations
The primary external integration is with the NS (Nederlandse Spoorwegen) API for real-time train schedule data. The application handles API authentication using subscription keys and formats requests according to NS API specifications.

The integration includes comprehensive error handling and request formatting, ensuring reliable data fetching from the Dutch railway system's official API endpoints.

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