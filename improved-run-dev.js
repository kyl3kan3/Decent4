/**
 * Enhanced Run-Dev Script for Main Workflow
 * 
 * This script adds persistence features from VitalGradient Persistent directly to 
 * the main application without requiring a separate workflow.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Starting enhanced development environment...');

// Add database optimization environment variables
const enhancedEnv = {
  ...process.env,
  DB_RETRY_COUNT: '5',
  DB_RETRY_DELAY: '2000',
  DB_CONNECT_TIMEOUT: '10',
  DB_KEEP_ALIVE: '60',
  // Standard environment variables
  NODE_ENV: 'development',
  USE_MOCK_DATA: 'false', // Ensure mock data is disabled
  USE_REAL_API: 'true'    // Ensure real API is used
};

// Start client process with optimized settings
console.log('Starting client with enhanced settings...');
const clientProcess = spawn('npm', ['run', 'dev', '--', '--host', '0.0.0.0'], {
  stdio: 'inherit',
  env: {
    ...enhancedEnv,
    VITE_API_URL: 'http://0.0.0.0:3001',
    VITE_USE_MOCKS: 'false' // Ensure mocks are disabled
  }
});

// Start server process with optimized settings
console.log('Starting server with enhanced settings...');
const serverProcess = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  env: {
    ...enhancedEnv,
    PORT: '3001'
  }
});

// Record PIDs for monitoring
const pidData = {
  client: clientProcess.pid,
  server: serverProcess.pid,
  parent: process.pid,
  timestamp: new Date().toISOString()
};

// Write PID files for tracking
fs.writeFileSync('.client.pid', clientProcess.pid?.toString() || '0');
fs.writeFileSync('.server.pid', serverProcess.pid?.toString() || '0');
fs.writeFileSync('.dev-server.pid', process.pid.toString());
fs.writeFileSync('.process-info.json', JSON.stringify(pidData, null, 2));

// Monitoring function to check if processes are still running
let healthCheckInterval;
const performHealthCheck = () => {
  let clientRunning = true;
  let serverRunning = true;
  
  // Check if client is still running
  try {
    if (clientProcess.pid) {
      process.kill(clientProcess.pid, 0); // This will throw an error if process doesn't exist
    } else {
      clientRunning = false;
    }
  } catch (e) {
    clientRunning = false;
  }
  
  // Check if server is still running
  try {
    if (serverProcess.pid) {
      process.kill(serverProcess.pid, 0); // This will throw an error if process doesn't exist
    } else {
      serverRunning = false;
    }
  } catch (e) {
    serverRunning = false;
  }
  
  // If either process died, restart it
  if (!clientRunning && !serverRunning) {
    console.log('Both client and server processes have died, restarting everything...');
    clearInterval(healthCheckInterval);
    
    // Exit this process, let the process manager restart us
    process.exit(1);
  } else if (!clientRunning) {
    console.log('Client process died, restarting...');
    try {
      const newClientProcess = spawn('npm', ['run', 'dev', '--', '--host', '0.0.0.0'], {
        stdio: 'inherit',
        env: {
          ...enhancedEnv,
          VITE_API_URL: 'http://0.0.0.0:3001',
          VITE_USE_MOCKS: 'false'
        }
      });
      
      if (newClientProcess.pid) {
        clientProcess.pid = newClientProcess.pid;
        fs.writeFileSync('.client.pid', newClientProcess.pid.toString());
        console.log(`New client process started with PID ${newClientProcess.pid}`);
      }
    } catch (error) {
      console.error('Failed to restart client process:', error);
    }
  } else if (!serverRunning) {
    console.log('Server process died, restarting...');
    try {
      const newServerProcess = spawn('node', ['server/index.js'], {
        stdio: 'inherit',
        env: {
          ...enhancedEnv,
          PORT: '3001'
        }
      });
      
      if (newServerProcess.pid) {
        serverProcess.pid = newServerProcess.pid;
        fs.writeFileSync('.server.pid', newServerProcess.pid.toString());
        console.log(`New server process started with PID ${newServerProcess.pid}`);
      }
    } catch (error) {
      console.error('Failed to restart server process:', error);
    }
  }
};

// Start health monitoring after a short delay
setTimeout(() => {
  console.log('Starting health monitoring...');
  healthCheckInterval = setInterval(performHealthCheck, 10000); // Check every 10 seconds
}, 15000); // Start checking after 15 seconds to give processes time to initialize

// Handle graceful shutdown
const performGracefulShutdown = () => {
  console.log('Shutting down enhanced development server...');
  
  // Clear interval first to prevent concurrent shutdowns
  clearInterval(healthCheckInterval);
  
  // Clean up PID files
  try {
    fs.unlinkSync('.client.pid');
    fs.unlinkSync('.server.pid');
    fs.unlinkSync('.dev-server.pid');
    fs.unlinkSync('.process-info.json');
    fs.unlinkSync('.ready');
  } catch (e) {
    // Ignore errors if files don't exist
  }
  
  // Kill child processes
  clientProcess.kill();
  serverProcess.kill();
  
  // Exit after a short delay to ensure everything has time to clean up
  setTimeout(() => {
    process.exit(0);
  }, 1000);
};

// Register shutdown handlers
process.on('SIGINT', performGracefulShutdown);
process.on('SIGTERM', performGracefulShutdown);
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  performGracefulShutdown();
});

// Write signal file for testing
setTimeout(() => {
  fs.writeFileSync('.ready', 'Server is ready');
  console.log('Server should be ready now');
}, 5000);

console.log('Enhanced development server started');
console.log('Server running at http://0.0.0.0:3001');
console.log('Client running at http://0.0.0.0:5173');

// Add a watchdog to check on parent health
setInterval(() => {
  // Just being alive keeps the watchdog happy
  try {
    const timestamp = new Date().toISOString();
    fs.writeFileSync('.heartbeat', timestamp);
  } catch (e) {
    console.warn('Failed to write heartbeat file:', e);
  }
}, 30000);