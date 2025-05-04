/**
 * Health App Workflow Runner
 * 
 * This script starts both client and server components with
 * proper configuration for a Replit workflow.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Constants
const SERVER_PORT = 3001;
const CLIENT_PORT = 5173;

// Remove any PID files that might exist from previous runs
try {
  ['server.pid', '.client.pid', '.health-app.pid'].forEach(pidFile => {
    if (fs.existsSync(pidFile)) {
      fs.unlinkSync(pidFile);
    }
  });
} catch (e) {}

fs.writeFileSync('.health-app.pid', process.pid.toString());

// Start server process
console.log('Starting health server on port', SERVER_PORT);
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: SERVER_PORT.toString(),
    HOST: '0.0.0.0',
    CORS_ENABLED: 'true'
  }
});

server.on('error', err => {
  console.error('Server error:', err);
});

server.on('close', code => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});

// Start client process after a delay
setTimeout(() => {
  console.log('Starting client on port', CLIENT_PORT);
  const client = spawn('npx', ['vite', 'client', '--port', CLIENT_PORT.toString(), '--host'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_API_URL: `http://0.0.0.0:${SERVER_PORT}`
    }
  });

  client.on('error', err => {
    console.error('Client error:', err);
  });

  client.on('close', code => {
    console.log(`Client exited with code ${code}`);
    server.kill();
    process.exit(code);
  });

  // Handle termination
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down...');
    client.kill();
    server.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    client.kill();
    server.kill();
    process.exit(0);
  });

  // Log URLs
  console.log('\nApplication is running:');
  console.log(`- Server API: http://0.0.0.0:${SERVER_PORT}`);
  console.log(`- Client UI: http://0.0.0.0:${CLIENT_PORT}`);
  console.log('The client UI should be visible in the webview.');
}, 5000);
