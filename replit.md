# Overview

This is a Dutch train trip planner web application that provides comprehensive journey information using the NS API. The application has been converted to a **static website** deployment approach, making direct API calls from the frontend to the NS (Nederlandse Spoorwegen) API.

**Current Status**: Fully functional material type filtering system with static website deployment, comprehensive delay information display, clickable time search modals, "Now" button for datetime picker, enhanced material type formatting with styled blue containers, and travel time drag slider filtering - NS API key configured for production deployment with proper Vercel configuration (August 3, 2025)

Key features:
- Real-time trip search with flexible datetime selection
- Advanced trip result display with dynamic loading
- Comprehensive NS transportation data integration
- **Material type filtering** - filter trips by exact train types (IC, ICD, ICNG, VIRM, DDZ, Flirt, SNG, SPR)
- **Transfer filtering** - filter by number of transfers (0, 2, 3+)
- **Combined filtering** - use both transfer and material type filters simultaneously
- **Delay information display** - shows exact delay minutes in red text (+X min) for delayed trains
- **Detailed trip headers** - format: "x transfers - [station code] - (waiting minutes : platform) - material code"
- **Clickable time search** - click departure/arrival times to search additional trips from any point in journey with popup modal
- **Final destination display** - shows train final destinations with arrow notation (→) in transport headers
- **Compact header display in alternative trips** - shows detailed journey breakdown in header-style format
- **"Now" button for datetime picker** - quickly set current time with one click
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

**Key Changes Made (August 3, 2025):**
- **Travel Time Drag Slider**: Replaced button-based travel time filter with smooth drag slider interface
- **Slider Range Optimization**: Starts from 0 minutes with 15-minute increments and extends 15 minutes beyond max trip duration
- **Material Information Fix**: Enhanced fallback display to show basic train types immediately while detailed Virtual Train API data loads
- **Real-time Filter Updates**: Travel time filtering updates instantly as user drags the slider
- **Delay Detection Fix**: Fixed false "Delayed" status when planned and actual times are identical - now only shows delayed when there's an actual time difference in minutes
- **Station Dropdown Cleanup**: Removed NIBC from popular stations dropdown list
- **Vercel Deployment Fix**: Created vercel.json configuration and updated build-static.js to properly structure static deployment
- **Build Process Enhancement**: Improved static build script to move all files from dist/public to dist root automatically
- **Swap Button Feature**: Added station swap button between From and To fields with smooth ArrowUpDown icon
- **Collapsible Trip Cards**: Trip card details now collapsed by default with triangle toggle button between delay status and journey time
- **Arrival Time Sorting**: Trip results now automatically sorted by arrival time with earliest arriving trips displayed first

**Previous Changes (August 2, 2025):**
- **Clickable Time Search Modal**: Created in-window popup for searching additional trips from any departure/arrival time
- **Final Destination Display**: Added destination postfix with arrow notation (→) in transport headers
- **Enhanced Trip Navigation**: All departure and arrival times are now clickable with hover effects
- **Alternative Trips Header Format**: Created TripCompactHeader component showing detailed journey breakdown in header style
- **"Now" Button**: Added convenient "Now" button to datetime picker for setting current time instantly
- **Enhanced Material Type Formatting**: Updated both main trip cards and alternative trips modal to display material information (e.g., "DDZ (106 : 439) - VIRM (120 : 425)") in styled blue containers with consistent design

**Previous Changes (August 1, 2025):**
- Removed server-side proxy pattern for true static deployment
- Created `client/src/lib/nsApi.ts` for direct NS API integration
- Updated trip cards to use direct Virtual Train API calls from browser
- Built static deployment configuration with proper file structure
- **Material Type Filtering System**: Comprehensive filtering by train types using Virtual Train API
- **Enhanced Trip Display**: Shows exact train types (ICD, ICNG, VIRM, DDZ, Flirt, SNG) in trip headers
- **Combined Filter Logic**: Parent component handles both transfer and material type filtering
- **ICD Train Support**: Special handling for ICD trains (NS API category "IC" → Virtual Train API type "ICD")
- **Production Ready**: NS API key configured as VITE_NS_API_KEY for deployed version

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