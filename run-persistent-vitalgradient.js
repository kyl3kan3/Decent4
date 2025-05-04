/**
 * VitalGradient Persistent Server Launcher
 * 
 * This script launches the VitalGradient health dashboard with improved
 * persistence and reliability features.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Launching VitalGradient Health Dashboard with persistence...');

// Script paths
const PERSISTENT_SCRIPT = path.join(__dirname, 'persistent-server.mjs');
const STARTUP_SCRIPT = path.join(__dirname, 'start-persistent.sh');

// Use the shell script which handles environment setup and process cleanup
const server = spawn('bash', [STARTUP_SCRIPT], {
  stdio: 'inherit',
  shell: true
});

// Handle server process exit
server.on('exit', (code) => {
  console.log(`VitalGradient server process exited with code ${code}`);
  
  if (code !== 0) {
    console.error('VitalGradient server terminated unexpectedly');
    
    // Create a marker file to indicate an unexpected shutdown
    fs.writeFileSync(
      '.server-crash.log', 
      `Server crashed at ${new Date().toISOString()} with exit code ${code}`
    );
  }
  
  // Exit with the same code
  process.exit(code);
});

// Handle termination signals
process.on('SIGINT', () => {
  console.log('Shutdown signal received, forwarding to server process...');
  server.kill('SIGINT');
  
  // Give it some time, then force exit
  setTimeout(() => {
    console.log('Forcing exit after timeout');
    process.exit(1);
  }, 5000);
});

process.on('SIGTERM', () => {
  console.log('Termination signal received, forwarding to server process...');
  server.kill('SIGTERM');
  
  // Give it some time, then force exit
  setTimeout(() => {
    console.log('Forcing exit after timeout');
    process.exit(1);
  }, 5000);
});

console.log('VitalGradient launcher initialized and running');

// Write a PID file for this launcher
fs.writeFileSync('.vitalgradient-launcher.pid', process.pid.toString());