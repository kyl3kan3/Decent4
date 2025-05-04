/**
 * Enhanced Development Server with Advanced Features
 * 
 * This script provides a robust development environment with all of
 * the advanced server features:
 * 
 * - Enhanced database connection with pooling
 * - Advanced logging with file rotation
 * - Auto-recovery and process monitoring
 * - Rate limiting
 * - Graceful shutdown handling
 * - Health monitoring
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import os from 'os';

// Configuration
const CONFIG = {
  server: {
    port: process.env.PORT || 3001,
    host: '0.0.0.0',
    maxRestarts: 10,
    restartDelay: 3000, // 3 seconds
    healthCheckInterval: 15000, // 15 seconds
    gracefulShutdownTimeout: 10000, // 10 seconds
  },
  database: {
    retryCount: process.env.DB_RETRY_COUNT || '5',
    retryDelay: process.env.DB_RETRY_DELAY || '2000',
    connectTimeout: process.env.DB_CONNECT_TIMEOUT || '10',
    keepAlive: process.env.DB_KEEP_ALIVE || '60',
    maxConnections: '10'
  },
  logging: {
    dir: './logs',
    retention: 7, // days
    logLevel: process.env.LOG_LEVEL || 'info'
  }
};

// State tracking
let clientProcess = null;
let serverProcess = null;
let restartCount = 0;
let lastRestartTime = 0;
let healthCheckTimer = null;
let shutdownRequested = false;

// Make sure log directory exists
if (!fs.existsSync(CONFIG.logging.dir)) {
  fs.mkdirSync(CONFIG.logging.dir, { recursive: true });
}

// Log with timestamp and level
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  console.log(logMessage);
  
  // Also log to file
  const logFile = path.join(CONFIG.logging.dir, `server-${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFileSync(logFile, logMessage + '\n');
  
  // For errors, log to separate error file
  if (level === 'ERROR') {
    const errorLogFile = path.join(CONFIG.logging.dir, `error-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(errorLogFile, logMessage + '\n');
  }
}

// Create enhanced environment variables
function createEnhancedEnv() {
  const db = CONFIG.database;
  
  return {
    ...process.env,
    // Database optimization variables
    DB_RETRY_COUNT: db.retryCount,
    DB_RETRY_DELAY: db.retryDelay,
    DB_CONNECT_TIMEOUT: db.connectTimeout,
    DB_KEEP_ALIVE: db.keepAlive,
    DB_MAX_CONNECTIONS: db.maxConnections,
    // Application variables
    NODE_ENV: 'development',
    ENABLE_RATE_LIMITING: 'true',
    ENABLE_MONITORING: 'true',
    ENABLE_AUTO_RECOVERY: 'true',
    LOG_LEVEL: CONFIG.logging.logLevel,
    PORT: CONFIG.server.port
  };
}

// Start the client process
function startClientProcess() {
  log('Starting client process...');
  
  const enhancedEnv = {
    ...createEnhancedEnv(),
    VITE_API_URL: `http://${CONFIG.server.host}:${CONFIG.server.port}`,
    VITE_USE_MOCKS: 'false',
    VITE_ENABLE_MONITORING: 'true'
  };
  
  clientProcess = spawn('npm', ['run', 'dev', '--', '--host', CONFIG.server.host], {
    stdio: 'inherit',
    env: enhancedEnv
  });
  
  if (clientProcess.pid) {
    log(`Client process started with PID ${clientProcess.pid}`);
    fs.writeFileSync('.client.pid', clientProcess.pid.toString());
    
    clientProcess.on('exit', (code, signal) => {
      log(`Client process exited with code ${code} and signal ${signal}`, code ? 'ERROR' : 'INFO');
      
      if (!shutdownRequested) {
        log('Restarting client process...', 'WARN');
        setTimeout(startClientProcess, 2000);
      }
    });
  } else {
    log('Failed to start client process', 'ERROR');
  }
}

// Start the server process
function startServerProcess() {
  // Check restart limits
  const now = Date.now();
  if (now - lastRestartTime < 10000) { // Less than 10 seconds since last restart
    // If we restart too quickly, slow down
    if (restartCount > 3) {
      const cooldownTime = 5000 * (restartCount - 2);
      log(`Too many rapid restarts, cooling down for ${cooldownTime/1000} seconds...`, 'WARN');
      setTimeout(startServerProcess, cooldownTime);
      return;
    }
  }
  
  if (restartCount >= CONFIG.server.maxRestarts) {
    log(`Maximum restart limit (${CONFIG.server.maxRestarts}) reached. Stopping.`, 'ERROR');
    process.exit(1);
  }
  
  lastRestartTime = now;
  restartCount++;
  
  log(`Starting server process (attempt ${restartCount}/${CONFIG.server.maxRestarts})...`);
  
  const enhancedEnv = createEnhancedEnv();
  
  serverProcess = spawn('node', ['server/index.js'], {
    stdio: 'pipe',
    env: enhancedEnv
  });
  
  if (serverProcess.pid) {
    log(`Server process started with PID ${serverProcess.pid}`);
    fs.writeFileSync('.server.pid', serverProcess.pid.toString());
    
    // Handle stdout
    serverProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
      
      // Check for success indicators
      const output = data.toString();
      if (output.includes('Server started') || 
          output.includes('running at http') ||
          output.includes('server is listening')) {
        log('Server started successfully ✅');
        
        // After a successful start that stays up for a while, reduce the restart count
        setTimeout(() => {
          if (serverProcess && !shutdownRequested) {
            restartCount = Math.max(0, restartCount - 1);
            log(`Server stable, reducing restart counter to ${restartCount}`);
          }
        }, 60000); // 1 minute
      }
    });
    
    // Handle stderr
    serverProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
      
      // Log database errors specifically
      const errorOutput = data.toString();
      if (errorOutput.includes('database') || errorOutput.includes('pg') || errorOutput.includes('sql')) {
        log(`Database error detected: ${errorOutput.trim()}`, 'ERROR');
      }
    });
    
    // Handle server exit
    serverProcess.on('exit', (code, signal) => {
      log(`Server process exited with code ${code} and signal ${signal}`, code ? 'ERROR' : 'INFO');
      
      if (!shutdownRequested) {
        log('Restarting server process...', 'WARN');
        setTimeout(startServerProcess, CONFIG.server.restartDelay);
      }
    });
  } else {
    log('Failed to start server process', 'ERROR');
    
    // Try again after a delay
    setTimeout(startServerProcess, CONFIG.server.restartDelay);
  }
}

// Perform a health check on the server and client
async function performHealthCheck() {
  if (shutdownRequested) return;
  
  log('Performing health check...');
  
  let serverRunning = false;
  let clientRunning = false;
  
  // Check if server process is running
  if (serverProcess && serverProcess.pid) {
    try {
      process.kill(serverProcess.pid, 0); // This will throw if process doesn't exist
      serverRunning = true;
      
      // Actually check if the server is responding
      try {
        const serverResponse = await fetch(`http://${CONFIG.server.host}:${CONFIG.server.port}/api/health`)
          .then(res => res.ok)
          .catch(() => false);
        
        if (!serverResponse) {
          log('Server process is running but not responding to HTTP requests', 'WARN');
          serverRunning = false;
        }
      } catch (error) {
        log(`Server health check error: ${error.message}`, 'WARN');
        serverRunning = false;
      }
    } catch (e) {
      log('Server process is not running', 'WARN');
      serverRunning = false;
    }
  } else {
    log('No server process found', 'WARN');
    serverRunning = false;
  }
  
  // Check if client process is running
  if (clientProcess && clientProcess.pid) {
    try {
      process.kill(clientProcess.pid, 0); // This will throw if process doesn't exist
      clientRunning = true;
      
      // Actually check if the client dev server is responding
      try {
        const clientResponse = await fetch('http://localhost:5173/')
          .then(res => res.ok)
          .catch(() => false);
        
        if (!clientResponse) {
          log('Client process is running but not responding to HTTP requests', 'WARN');
          clientRunning = false;
        }
      } catch (error) {
        // Client may still be starting up, so just log a warning
        log(`Client health check error: ${error.message}`, 'WARN');
      }
    } catch (e) {
      log('Client process is not running', 'WARN');
      clientRunning = false;
    }
  } else {
    log('No client process found', 'WARN');
    clientRunning = false;
  }
  
  // If either process is not running, restart it
  if (!serverRunning) {
    log('Server is not responding, restarting...', 'WARN');
    if (serverProcess) {
      serverProcess.kill();
    }
    startServerProcess();
  }
  
  if (!clientRunning) {
    log('Client is not responding, restarting...', 'WARN');
    if (clientProcess) {
      clientProcess.kill();
    }
    startClientProcess();
  }
  
  // Log system stats
  const memUsage = process.memoryUsage();
  const systemInfo = {
    uptime: process.uptime(),
    memory: {
      rss: Math.round(memUsage.rss / (1024 * 1024)) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / (1024 * 1024)) + ' MB',
      heapUsed: Math.round(memUsage.heapUsed / (1024 * 1024)) + ' MB'
    },
    cpu: os.loadavg()[0].toFixed(2)
  };
  
  log(`System stats: ${JSON.stringify(systemInfo)}`, 'INFO');
  
  // Schedule next health check
  if (!shutdownRequested) {
    healthCheckTimer = setTimeout(performHealthCheck, CONFIG.server.healthCheckInterval);
  }
}

// Clean up resources and prepare for shutdown
function prepareForShutdown() {
  if (shutdownRequested) return; // Prevent multiple shutdown attempts
  
  shutdownRequested = true;
  log('Shutting down...', 'WARN');
  
  // Clear any timers
  if (healthCheckTimer) {
    clearTimeout(healthCheckTimer);
  }
  
  // Kill child processes
  const killTimeout = CONFIG.server.gracefulShutdownTimeout;
  
  // Kill client process
  if (clientProcess) {
    log('Terminating client process...');
    clientProcess.kill('SIGTERM');
    
    // Force kill after timeout
    setTimeout(() => {
      if (clientProcess) {
        log('Force killing client process...', 'WARN');
        clientProcess.kill('SIGKILL');
      }
    }, killTimeout / 2);
  }
  
  // Kill server process
  if (serverProcess) {
    log('Terminating server process...');
    serverProcess.kill('SIGTERM');
    
    // Force kill after timeout
    setTimeout(() => {
      if (serverProcess) {
        log('Force killing server process...', 'WARN');
        serverProcess.kill('SIGKILL');
      }
    }, killTimeout / 2);
  }
  
  // Clean up PID files
  try {
    if (fs.existsSync('.client.pid')) {
      fs.unlinkSync('.client.pid');
    }
    if (fs.existsSync('.server.pid')) {
      fs.unlinkSync('.server.pid');
    }
    if (fs.existsSync('.dev-server.pid')) {
      fs.unlinkSync('.dev-server.pid');
    }
    if (fs.existsSync('.ready')) {
      fs.unlinkSync('.ready');
    }
  } catch (e) {
    log(`Error cleaning up PID files: ${e.message}`, 'ERROR');
  }
  
  // Exit the process
  setTimeout(() => {
    log('Shutdown complete. Exiting process.');
    process.exit(0);
  }, killTimeout);
}

// Register signal handlers
process.on('SIGINT', prepareForShutdown);
process.on('SIGTERM', prepareForShutdown);
process.on('SIGHUP', prepareForShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  log(`Uncaught exception: ${err.message}`, 'ERROR');
  console.error(err);
  prepareForShutdown();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection at: ${promise}, reason: ${reason}`, 'ERROR');
  prepareForShutdown();
});

// Write PID file for this process
fs.writeFileSync('.dev-server.pid', process.pid.toString());

// Entry point - start everything
function main() {
  log('Starting Enhanced Development Environment with ALL features');
  log(`Configuration: ${JSON.stringify(CONFIG, null, 2)}`);
  
  // Start server process first
  startServerProcess();
  
  // Then start client process
  startClientProcess();
  
  // Start health checking after a delay
  setTimeout(() => {
    log('Starting health monitoring...');
    performHealthCheck();
  }, 15000); // Wait 15 seconds for processes to start up
  
  // Create .ready file to indicate we're up
  setTimeout(() => {
    fs.writeFileSync('.ready', 'Ready');
    log('Development environment is ready');
    log(`Access the server at: http://${CONFIG.server.host}:${CONFIG.server.port}`);
    log(`Access the client at: http://${CONFIG.server.host}:5173`);
  }, 10000);
  
  // Add a heartbeat check
  setInterval(() => {
    fs.writeFileSync('.heartbeat', new Date().toISOString());
  }, 30000);
}

// Start the application
main();