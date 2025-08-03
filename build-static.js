#!/usr/bin/env node

import { execSync } from 'child_process';
import { mkdirSync, cpSync, rmSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

console.log('Building static website...');

try {
  // Clean previous build
  if (existsSync('dist')) {
    rmSync('dist', { recursive: true, force: true });
  }

  // Build frontend with Vite
  console.log('Building frontend...');
  execSync('vite build', { 
    stdio: 'inherit'
  });

  // Move files from dist/public to dist root for static deployment
  console.log('Restructuring for static deployment...');
  
  const publicDir = join('dist', 'public');
  if (existsSync(publicDir)) {
    // Get all files and directories from dist/public
    const items = readdirSync(publicDir);
    
    items.forEach(item => {
      const srcPath = join(publicDir, item);
      const destPath = join('dist', item);
      
      if (existsSync(srcPath)) {
        cpSync(srcPath, destPath, { recursive: true });
        console.log(`Moved ${item} to dist root`);
      }
    });
    
    // Remove the public directory
    rmSync(publicDir, { recursive: true, force: true });
    console.log('Removed public directory');
    
    // Remove any server files if they exist
    const serverFiles = ['index.js', 'routes.js', 'server.js'];
    serverFiles.forEach(file => {
      const serverFile = join('dist', file);
      if (existsSync(serverFile)) {
        rmSync(serverFile, { force: true });
        console.log(`Removed server file: ${file}`);
      }
    });
    
    console.log('Cleaned up build structure');
  }

  console.log('Static build completed successfully!');
  console.log('Ready for static deployment!');

} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}