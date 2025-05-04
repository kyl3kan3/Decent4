/**
 * Combined server starter with built-in CORS handling
 * This script starts both the server and a proxy with CORS headers
 */
import { spawn } from 'child_process';
import fs from 'fs';

console.log('Starting server with CORS handling...');

// Cleanup any old files
try {
  fs.unlinkSync('.ready');
} catch (e) {}
try {
  fs.unlinkSync('.starting');
} catch (e) {}

// Signal that we're starting
fs.writeFileSync('.starting', 'Starting servers...');

// Start the main server
console.log('Starting main server...');
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: '5001'
  }
});

// Wait for server to initialize
setTimeout(() => {
  // Start the proxy server with CORS handling
  console.log('Starting CORS proxy server...');
  const proxy = spawn('node', ['proxy-setup.js'], {
    stdio: 'inherit'
  });
  
  // Handle proxy exit
  proxy.on('close', (code) => {
    console.log(`CORS proxy process exited with code ${code}`);
    // Kill the server when proxy exits
    server.kill();
  });
  
  // Create client vite server
  console.log('Starting client development server...');
  const client = spawn('npx', ['vite', 'client', '--port', '3000'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_API_URL: 'http://localhost:8080' // Point to proxy instead of direct server
    }
  });
  
  // Handle client exit
  client.on('close', (code) => {
    console.log(`Client process exited with code ${code}`);
    // Kill the server and proxy when client exits
    proxy.kill();
    server.kill();
  });
  
  // Write ready file
  setTimeout(() => {
    fs.writeFileSync('.ready', 'Servers are ready');
    console.log('\nAll servers are now running:');
    console.log('- Main server: http://localhost:5001');
    console.log('- CORS proxy: http://localhost:8080');
    console.log('- Client development server: http://localhost:3000');
    console.log('\nIMPORTANT: Use the CORS proxy URL (http://localhost:8080) for API requests');
  }, 3000);
}, 3000);

// Handle server exit
server.on('close', (code) => {
  console.log(`Main server process exited with code ${code}`);
  try {
    fs.unlinkSync('.starting');
  } catch (e) {}
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down all servers...');
  server.kill();
  process.exit(0);
});