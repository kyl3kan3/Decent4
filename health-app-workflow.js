/**
 * Health App Workflow Script
 * 
 * This script runs the health-app-server.js for integrating the main server
 * with the AI context test server.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Start the health app server with port 3002
const healthApp = spawn('node', ['health-app-server.js'], {
  stdio: ['inherit', 'inherit', 'inherit'],
  env: { ...process.env, PORT: '3002' }
});

// Log process start
console.log('Health app workflow started');

// Handle process exit
healthApp.on('close', (code) => {
  console.log(`Health app process exited with code ${code}`);
});

// Handle errors
healthApp.on('error', (err) => {
  console.error('Failed to start health app:', err);
});

// Ensure the process is terminated on script exit
process.on('SIGINT', () => {
  healthApp.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  healthApp.kill();
  process.exit();
});
