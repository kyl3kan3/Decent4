#!/usr/bin/env node

/**
 * Health App Deployment Runner
 * 
 * This script serves as the main entry point for deployment on Replit.
 * It automatically determines which server implementation to run based on 
 * available files and environment.
 */

// Set production environment
process.env.NODE_ENV = 'production';

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

// Logging helper
function log(message) {
  console.log(`[Deploy Runner] ${message}`);
}

// Check for CommonJS deploy fix script
if (fs.existsSync(path.join(process.cwd(), 'deploy-fix.cjs'))) {
  log('Running deployment fixes...');
  try {
    // Make executable if needed
    execSync('chmod +x deploy-fix.cjs');
    execSync('node deploy-fix.cjs', { stdio: 'inherit' });
    log('Deployment fixes applied successfully');
  } catch (err) {
    log(`Warning: Error applying deployment fixes: ${err.message}`);
    log('Continuing with deployment...');
  }
}

// Define server options in order of preference
const serverOptions = [
  { path: './dist/server/index.js', type: 'compiled' },
  { path: './server/index.js', type: 'source' },
  { path: './optimized-server.cjs', type: 'optimized' },
  { path: './server.mjs', type: 'esm' },
  { path: './server.js', type: 'default' }
];

// Find the first available server option
let selectedOption = null;
for (const option of serverOptions) {
  if (fs.existsSync(path.join(process.cwd(), option.path))) {
    selectedOption = option;
    break;
  }
}

if (!selectedOption) {
  log('No suitable server found. Creating fallback server...');
  // Create a minimal fallback server
  const fallbackServer = `
  const express = require('express');
  const app = express();
  const PORT = process.env.PORT || 5000;
  
  app.get('/', (req, res) => {
    res.send('Health App - Fallback Server');
  });
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(\`Fallback server running on port \${PORT}\`);
  });
  `;
  
  fs.writeFileSync('fallback-server.js', fallbackServer);
  selectedOption = { path: './fallback-server.js', type: 'fallback' };
}

// Start the selected server
log(`Starting server: ${selectedOption.path} (${selectedOption.type})`);

// Use the shell start script if available
if (fs.existsSync(path.join(process.cwd(), 'start.sh'))) {
  log('Using start.sh script...');
  try {
    execSync('chmod +x start.sh', { stdio: 'inherit' });
    const startScript = spawn('./start.sh', [], { stdio: 'inherit' });
    
    startScript.on('error', (err) => {
      log(`Error running start.sh: ${err.message}`);
      log('Falling back to direct server execution...');
      executeServer();
    });
  } catch (err) {
    log(`Error with start.sh: ${err.message}`);
    executeServer();
  }
} else {
  executeServer();
}

function executeServer() {
  const serverProcess = spawn('node', [selectedOption.path], { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: process.env.PORT || 5000
    }
  });
  
  serverProcess.on('error', (err) => {
    log(`Failed to start server: ${err.message}`);
    process.exit(1);
  });
  
  serverProcess.on('exit', (code) => {
    if (code !== 0) {
      log(`Server exited with code ${code}`);
      process.exit(code);
    }
  });
}

// Handle process termination signals
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => {
    log(`Received ${signal}, shutting down gracefully`);
    process.exit(0);
  });
});