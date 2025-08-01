# Static Deployment Guide

This Dutch train trip planner has been converted to work as a static website.

## Deployment Configuration

**Update your Replit deployment settings to:**

```
Deployment Target: Static
Build Command: node build-static.js
Public Directory: dist
```

## Build Process

The `build-static.js` script will:
1. Build the frontend using Vite
2. Move files from `dist/public/` to `dist/` root
3. Remove server-side components
4. Create a proper static deployment structure

## API Integration

The application now makes direct calls to the NS API from the browser:
- **NS Trips API**: `gateway.apiportal.ns.nl/reisinformatie-api/api/v3/trips`
- **NS Virtual Train API**: `gateway.apiportal.ns.nl/virtual-train-api/api/v1/trein`

## File Structure After Build

```
dist/
├── index.html          # Main entry point
└── assets/            # CSS, JS, and other assets
    ├── index-[hash].css
    └── index-[hash].js
```

## Important Notes

- The application uses direct API calls to NS services
- CORS errors may occur in some hosting environments
- All functionality is client-side only
- No server-side components are required

## Testing

To test the static build locally:
```bash
node build-static.js
# Serve the dist/ directory with any static file server
```