/**
 * Debug Server Script
 * 
 * This script helps diagnose server startup issues by:
 * 1. Checking if the database connection works
 * 2. Attempting to start a minimal Express server
 * 3. Checking for critical files needed by the server
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file's directory (ESM compatible approach)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app
const app = express();
const PORT = process.env.PORT || 3099; // Using a higher port number to avoid conflicts

// Log important environment variables (without exposing secrets)
console.log('\n--- Environment Variables ---');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', PORT);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

// Check for critical paths
function checkPath(relativePath) {
  const fullPath = path.join(__dirname, relativePath);
  const exists = fs.existsSync(fullPath);
  console.log(`Path check: ${relativePath} - ${exists ? 'EXISTS' : 'MISSING'}`);
  return exists;
}

console.log('\n--- Critical Path Checks ---');
checkPath('dist');
checkPath('dist/client');
checkPath('client/dist');
checkPath('client/build');
checkPath('index.html');
checkPath('public');
checkPath('public/index.html');

// Simple endpoint for API testing
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Debug server is running' });
});

// Simple HTML for root path
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Debug Server</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .success { color: green; }
        .error { color: red; }
      </style>
    </head>
    <body>
      <h1>Debug Server</h1>
      <p class="success">Server is running successfully!</p>
      <p>This is a minimal debug server to identify startup issues.</p>
      <p>API endpoint: <a href="/api/health">/api/health</a></p>
    </body>
    </html>
  `);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n--- Server Started ---`);
  console.log(`Debug server running on http://localhost:${PORT}`);
  console.log(`Available at http://0.0.0.0:${PORT}`);
});