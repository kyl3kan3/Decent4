/**
 * Direct Server Script
 * 
 * This script starts both the client and server
 * without trying to modify any Replit-specific files
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Start the server
async function startServer() {
  console.log('Starting server...');
  
  // Start the server with tsx
  const server = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: '3001',
      HOST: '0.0.0.0'
    }
  });
  
  // Log server events
  server.on('error', (error) => {
    console.error('Server process error:', error);
  });
  
  server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
  
  // Wait for server to initialize
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Start the client
  console.log('Starting client...');
  const client = spawn('npx', ['vite', 'client', '--port', '5173', '--host'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_API_URL: 'http://0.0.0.0:3001'
    }
  });
  
  // Log client events
  client.on('error', (error) => {
    console.error('Client process error:', error);
  });
  
  client.on('close', (code) => {
    console.log(`Client process exited with code ${code}`);
    server.kill(); // Kill server when client exits
  });
  
  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down...');
    client.kill();
    server.kill();
  });
  
  process.on('SIGTERM', () => {
    console.log('Shutting down...');
    client.kill();
    server.kill();
  });
  
  console.log('\nApplication should be running:');
  console.log('- Server: http://0.0.0.0:3001');
  console.log('- Client: http://0.0.0.0:5173');
}

// Start the application
startServer().catch(error => {
  console.error('Failed to start application:', error);
});
