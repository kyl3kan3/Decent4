/**
 * Health App Runner Script
 * 
 * This script starts the health application by running both the frontend and backend
 * components together.
 */

import { spawn } from 'child_process';
import { createRequire } from 'module';

// Use createRequire to import CommonJS modules
const require = createRequire(import.meta.url);
const colors = require('colors');
import { promises as fs, existsSync, writeFileSync, unlinkSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name using ES modules pattern
const __dirname = dirname(fileURLToPath(import.meta.url));

function log(message, color = 'reset') {
  console.log(colors[color](message));
}

function startApplication() {
  log('Starting Health Application...', 'cyan');
  
  // Check if the client and server directories exist
  if (!existsSync('./client') || !existsSync('./server')) {
    log('Error: client or server directory not found', 'red');
    process.exit(1);
  }
  
  // Create a PID file to indicate the app is running
  writeFileSync('.health-app.pid', process.pid.toString());
  
  log('Starting backend and frontend services...', 'yellow');
  
  // Start the application with npm run dev
  const appProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });
  
  // Handle process exit
  appProcess.on('close', (code) => {
    log(`Application exited with code ${code}`, code === 0 ? 'green' : 'red');
    // Clean up the PID file
    try {
      unlinkSync('.health-app.pid');
    } catch (err) {
      // Ignore errors when removing PID file
    }
  });
  
  // Handle process errors
  appProcess.on('error', (err) => {
    log(`Application error: ${err.message}`, 'red');
    // Clean up the PID file
    try {
      unlinkSync('.health-app.pid');
    } catch (err) {
      // Ignore errors when removing PID file
    }
  });
  
  // Register process termination handlers
  process.on('SIGINT', () => {
    log('Shutting down application...', 'yellow');
    appProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    log('Shutting down application...', 'yellow');
    appProcess.kill('SIGTERM');
  });
}

// Start the application
startApplication();

// Export for usage in import statements
export default startApplication;