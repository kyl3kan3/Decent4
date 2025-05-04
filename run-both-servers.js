/**
 * Script to run both main server and proxy server
 * This script is used to start both servers in parallel for local development
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Log with timestamp
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  
  // Also append to log file
  fs.appendFileSync('combined-server.log', `[${timestamp}] ${message}\n`);
}

// Ensure log directory
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

log('Starting both main server and proxy server...');

// Start main server with CORS enabled
const serverProcess = spawn('npx', ['tsx', 'server-cors.js'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env }
});

// Create a write stream for server logs
const serverLogStream = fs.createWriteStream('logs/server.log', { flags: 'a' });

// Pipe server output to log file and console
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  serverLogStream.write(output);
  console.log('[SERVER]', output.trim());
});

serverProcess.stderr.on('data', (data) => {
  const output = data.toString();
  serverLogStream.write(output);
  console.error('[SERVER ERROR]', output.trim());
});

// Start proxy server
const proxyProcess = spawn('node', ['proxy-setup.js'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env }
});

// Create a write stream for proxy logs
const proxyLogStream = fs.createWriteStream('logs/proxy.log', { flags: 'a' });

// Pipe proxy output to log file and console
proxyProcess.stdout.on('data', (data) => {
  const output = data.toString();
  proxyLogStream.write(output);
  console.log('[PROXY]', output.trim());
});

proxyProcess.stderr.on('data', (data) => {
  const output = data.toString();
  proxyLogStream.write(output);
  console.error('[PROXY ERROR]', output.trim());
});

// Handle process termination
process.on('SIGINT', () => {
  log('Shutting down both servers...');
  serverProcess.kill();
  proxyProcess.kill();
  process.exit(0);
});

// Write process IDs to files for easier management
fs.writeFileSync('.server.pid', serverProcess.pid.toString());
fs.writeFileSync('.proxy.pid', proxyProcess.pid.toString());

log(`Server PID: ${serverProcess.pid}, Proxy PID: ${proxyProcess.pid}`);
log('Both servers started successfully. Press Ctrl+C to exit.');