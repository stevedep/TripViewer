# Deployment Guide

This project can be deployed as a static website since it makes direct API calls to the NS API from the frontend.

## Environment Variables

Before deploying, make sure to set up the following environment variable:

- `VITE_NS_API_KEY`: Your NS API subscription key

## Build Process

To build for static deployment:

```bash
node build-static.js
```

This will:
1. Build the frontend with Vite
2. Move files from `dist/public` to `dist` root
3. Clean up server files
4. Create a static deployment-ready structure

## Vercel Deployment

### Method 1: Using vercel.json (Recommended)

The project includes a `vercel.json` configuration file that handles the deployment automatically:

1. Connect your repository to Vercel
2. Set the environment variable `VITE_NS_API_KEY` in the Vercel project settings
3. Deploy - Vercel will use the custom build command from `vercel.json`

### Method 2: Manual Configuration

If needed, you can configure Vercel manually:

1. Framework Preset: Vite
2. Build Command: `node build-static.js`
3. Output Directory: `dist`
4. Install Command: `npm install`
5. Environment Variables: `VITE_NS_API_KEY`

## Other Static Hosts

The built files in `dist/` can be deployed to any static hosting service:
- Netlify
- GitHub Pages
- Cloudflare Pages
- Firebase Hosting
- AWS S3 + CloudFront

Make sure to:
1. Use `node build-static.js` as the build command
2. Set the `VITE_NS_API_KEY` environment variable during build
3. Configure proper redirects for client-side routing (SPA mode)

## Troubleshooting

### Issue: Vercel shows server code instead of the app

This happens when Vercel tries to serve the Express.js files instead of the static frontend. Make sure:

1. The `vercel.json` file is present in the root directory
2. The build command is set to `node build-static.js`
3. The output directory is set to `dist`
4. The `VITE_NS_API_KEY` environment variable is properly configured

### Issue: API calls fail in production

Make sure the `VITE_NS_API_KEY` environment variable is set in your hosting platform's project settings.

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