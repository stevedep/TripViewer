#!/usr/bin/env node

import { execSync } from 'child_process';
import { mkdirSync, cpSync, rmSync, existsSync } from 'fs';
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
    // Copy all files from dist/public to dist root
    const files = ['index.html', 'assets'];
    
    files.forEach(file => {
      const srcPath = join(publicDir, file);
      const destPath = join('dist', file);
      
      if (existsSync(srcPath)) {
        cpSync(srcPath, destPath, { recursive: true });
        console.log(`Moved ${file} to dist root`);
      }
    });
    
    // Remove the public directory and server files
    rmSync(publicDir, { recursive: true, force: true });
    
    // Remove server files if they exist
    const serverFile = join('dist', 'index.js');
    if (existsSync(serverFile)) {
      rmSync(serverFile, { force: true });
    }
    
    console.log('Cleaned up build structure');
  }

  console.log('Static build completed successfully!');
  console.log('Ready for static deployment!');

} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}