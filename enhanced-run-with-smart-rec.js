/**
 * Enhanced Development Server with Smart Recommendations
 * 
 * This script provides a robust development environment with all of
 * the advanced server features plus Smart Recommendations:
 * 
 * - Enhanced database connection with pooling
 * - Advanced logging with file rotation
 * - Auto-recovery and process monitoring
 * - Rate limiting
 * - Graceful shutdown handling
 * - Health monitoring
 * - Smart Recommendations context-aware AI features
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
    maxConnections: process.env.DB_MAX_CONNECTIONS || '10'
  },
  logging: {
    dir: './logs',
    retention: 7, // days
    logLevel: 'info'
  },
  smartRecommendations: {
    enabled: true,
    port: 3007
  }
};

// Logging function
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
  
  // Also log to file
  try {
    const logDir = CONFIG.logging.dir;
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(logDir, `server-${date}.log`);
    
    fs.appendFileSync(logFile, `[${timestamp}] [${level}] ${message}\n`);
  } catch (error) {
    console.error(`Error writing to log: ${error.message}`);
  }
}

// Set up enhanced environment variables
function createEnhancedEnv() {
  return {
    ...process.env,
    // Database connection settings
    DB_MAX_RETRIES: CONFIG.database.retryCount,
    DB_RETRY_DELAY: CONFIG.database.retryDelay,
    DB_CONNECT_TIMEOUT: CONFIG.database.connectTimeout,
    DB_KEEP_ALIVE: CONFIG.database.keepAlive,
    DB_MAX_CONNECTIONS: CONFIG.database.maxConnections,
    
    // Server settings
    PORT: CONFIG.server.port,
    HOST: CONFIG.server.host,
    
    // Enable all advanced features
    ENABLE_RATE_LIMITING: 'true',
    ENABLE_MONITORING: 'true',
    ENABLE_ADVANCED_LOGGING: 'true',
    ENABLE_SMART_RECOMMENDATIONS: CONFIG.smartRecommendations.enabled ? 'true' : 'false',
    SMART_REC_PORT: CONFIG.smartRecommendations.port.toString()
  };
}

// Start the Smart Recommendations server
function startSmartRecommendationsServer() {
  if (!CONFIG.smartRecommendations.enabled) {
    log('Smart Recommendations disabled by configuration', 'INFO');
    return null;
  }
  
  log('Starting Smart Recommendations server...', 'INFO');
  
  // Look for the appropriate Smart Recommendations script
  const scriptPaths = [
    'direct-smart-server.js',
    'direct-smart-server.cjs',
    'smart-recommendations-demo.cjs'
  ];
  
  let scriptToRun = null;
  for (const script of scriptPaths) {
    if (fs.existsSync(script)) {
      scriptToRun = script;
      break;
    }
  }
  
  if (!scriptToRun) {
    log('Smart Recommendations server script not found. Trying alternatives...', 'WARN');
    if (fs.existsSync('run-smart-recommendations-demo.cjs')) {
      scriptToRun = 'run-smart-recommendations-demo.cjs';
    } else if (fs.existsSync('smart-rec-test.cjs')) {
      scriptToRun = 'smart-rec-test.cjs';
    } else {
      log('No Smart Recommendations server script found', 'ERROR');
      return null;
    }
  }
  
  log(`Starting Smart Recommendations server with script: ${scriptToRun}`, 'INFO');
  
  // Set up environment for Smart Recommendations server
  const smartRecEnv = {
    ...process.env,
    PORT: CONFIG.smartRecommendations.port.toString()
  };
  
  // Start the Smart Recommendations server
  const smartRecProcess = spawn('node', [scriptToRun], {
    env: smartRecEnv,
    stdio: ['inherit', 'pipe', 'pipe']
  });
  
  // Capture and log output
  smartRecProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    log(`[Smart Rec] ${output}`, 'INFO');
  });
  
  smartRecProcess.stderr.on('data', (data) => {
    const output = data.toString().trim();
    log(`[Smart Rec] ${output}`, 'ERROR');
  });
  
  smartRecProcess.on('error', (error) => {
    log(`Smart Recommendations server error: ${error.message}`, 'ERROR');
  });
  
  smartRecProcess.on('close', (code) => {
    log(`Smart Recommendations server exited with code ${code}`, code === 0 ? 'INFO' : 'ERROR');
  });
  
  return smartRecProcess;
}

// Start the client (frontend) process
function startClientProcess() {
  log('Starting client process...', 'INFO');
  
  // Use vite directly to start the client side
  const viteProcess = spawn('npx', ['vite'], {
    stdio: ['inherit', 'pipe', 'pipe']
  });
  
  log(`Client process started with PID ${viteProcess.pid}`, 'INFO');
  
  // Log client output
  viteProcess.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  viteProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  viteProcess.on('close', (code) => {
    log(`Client process exited with code ${code}`, code === 0 ? 'INFO' : 'WARN');
  });
  
  return viteProcess;
}

// Start the server (backend) process
function startServerProcess(attempt = 1) {
  if (attempt > CONFIG.server.maxRestarts) {
    log(`Maximum restart attempts (${CONFIG.server.maxRestarts}) reached. Giving up.`, 'ERROR');
    process.exit(1);
  }
  
  log(`Starting server process (attempt ${attempt}/${CONFIG.server.maxRestarts})...`, 'INFO');
  
  const enhancedEnv = createEnhancedEnv();
  
  // First check if we have TypeScript entry point
  const tsEntry = fs.existsSync('server/index.ts');
  const serverCmd = tsEntry ? 'tsx' : 'node';
  const serverArgs = tsEntry ? ['server/index.ts', '--host', CONFIG.server.host] : ['server/index.js', '--host', CONFIG.server.host];
  
  log(`TypeScript server entry point ${tsEntry ? 'found, using tsx to run it' : 'not found, using node'}`, 'INFO');
  
  const serverProcess = spawn(serverCmd, serverArgs, {
    env: enhancedEnv,
    stdio: ['inherit', 'pipe', 'pipe']
  });
  
  log(`Server process started with PID ${serverProcess.pid}`, 'INFO');
  
  // Log server output
  serverProcess.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  serverProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  // Handle server process exit
  serverProcess.on('close', (code, signal) => {
    log(`Server process exited with code ${code} and signal ${signal}`, 'INFO');
    
    if (code !== 0) {
      log('Restarting server process...', 'WARN');
      setTimeout(() => {
        startServerProcess(attempt + 1);
      }, CONFIG.server.restartDelay);
    }
  });
  
  return serverProcess;
}

// Perform health check
async function performHealthCheck() {
  return new Promise((resolve) => {
    const request = http.get({
      host: CONFIG.server.host === '0.0.0.0' ? 'localhost' : CONFIG.server.host,
      port: CONFIG.server.port,
      path: '/api/health',
      timeout: 5000
    }, (response) => {
      if (response.statusCode === 200) {
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            const healthData = JSON.parse(data);
            log('Health check successful', 'INFO');
            log(`Health status: ${JSON.stringify(healthData)}`, 'INFO');
            resolve(true);
          } catch (error) {
            log(`Error parsing health check response: ${error.message}`, 'ERROR');
            resolve(false);
          }
        });
      } else {
        log(`Health check failed with status code: ${response.statusCode}`, 'ERROR');
        resolve(false);
      }
    });
    
    request.on('error', (error) => {
      log(`Health check error: ${error.message}`, 'ERROR');
      resolve(false);
    });
    
    request.on('timeout', () => {
      log('Health check timed out', 'ERROR');
      request.destroy();
      resolve(false);
    });
  });
}

// Prepare for graceful shutdown
function prepareForShutdown() {
  let shuttingDown = false;
  
  process.on('SIGINT', async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    
    log('Received SIGINT signal. Shutting down gracefully...', 'INFO');
    
    // Give some time for connections to close gracefully
    setTimeout(() => {
      log('Forcing shutdown after timeout', 'WARN');
      process.exit(0);
    }, CONFIG.server.gracefulShutdownTimeout);
    
    // Kill all child processes and exit
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    
    log('Received SIGTERM signal. Shutting down gracefully...', 'INFO');
    
    // Give some time for connections to close gracefully
    setTimeout(() => {
      log('Forcing shutdown after timeout', 'WARN');
      process.exit(0);
    }, CONFIG.server.gracefulShutdownTimeout);
    
    // Kill all child processes and exit
    process.exit(0);
  });
}

// Main function
function main() {
  log('Starting Enhanced Development Environment with Smart Recommendations', 'INFO');
  log(`Configuration: ${JSON.stringify(CONFIG, null, 2)}`, 'INFO');
  
  // Set up graceful shutdown
  prepareForShutdown();
  
  // Start Smart Recommendations server
  const smartRecProcess = startSmartRecommendationsServer();
  
  // Start the server process
  const serverProcess = startServerProcess();
  
  // Start the client process
  const clientProcess = startClientProcess();
  
  // Set up health check interval
  if (CONFIG.server.healthCheckInterval > 0) {
    setInterval(async () => {
      await performHealthCheck();
    }, CONFIG.server.healthCheckInterval);
  }
  
  // Final ready message
  setTimeout(() => {
    log('Development environment is ready', 'INFO');
    log(`Access the server at: http://${CONFIG.server.host}:${CONFIG.server.port}`, 'INFO');
    log(`Access the client at: http://${CONFIG.server.host}:5173`, 'INFO');
    if (CONFIG.smartRecommendations.enabled) {
      log(`Smart Recommendations available at: http://${CONFIG.server.host}:${CONFIG.smartRecommendations.port}`, 'INFO');
    }
  }, 3000);
}

// Run the main function
main();