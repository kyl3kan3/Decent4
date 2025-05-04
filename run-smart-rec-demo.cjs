/**
 * Smart Recommendations Demo Server Launcher
 * 
 * This script launches the smart recommendations demo server
 * with proper error handling and logging.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Define colors for better logging
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper for logging
function log(message, color = colors.reset) {
  console.log(`${color}[Smart Rec Demo] ${message}${colors.reset}`);
}

// Kill any existing processes on port 3007
function killExistingProcesses() {
  try {
    log('Checking for existing processes on port 3007...', colors.yellow);
    const lsof = spawn('lsof', ['-ti:3007']);
    
    lsof.stdout.on('data', (data) => {
      const pids = data.toString().trim().split('\n');
      pids.forEach(pid => {
        if (pid) {
          log(`Killing process with PID ${pid}...`, colors.yellow);
          spawn('kill', ['-9', pid]);
        }
      });
    });
    
    lsof.on('close', (code) => {
      if (code !== 0) {
        log('No existing processes found on port 3007.', colors.green);
      }
    });
  } catch (error) {
    log(`Error while killing existing processes: ${error.message}`, colors.red);
  }
}

// Start the demo server
function startServer() {
  log('Starting Smart Recommendations demo server...', colors.blue);
  
  // Make sure the demo server file exists
  const serverFilePath = path.join(process.cwd(), 'smart-recommendations-demo.cjs');
  if (!fs.existsSync(serverFilePath)) {
    log(`Error: Server file not found at ${serverFilePath}`, colors.red);
    process.exit(1);
  }
  
  // Start the server with explicit port environment variable
  const server = spawn('node', [serverFilePath], {
    env: { ...process.env, PORT: '3007' }
  });
  
  server.stdout.on('data', (data) => {
    log(data.toString().trim(), colors.green);
  });
  
  server.stderr.on('data', (data) => {
    log(data.toString().trim(), colors.red);
  });
  
  server.on('error', (error) => {
    log(`Server error: ${error.message}`, colors.red);
  });
  
  server.on('close', (code) => {
    if (code !== 0) {
      log(`Server process exited with code ${code}`, colors.red);
    } else {
      log('Server process closed.', colors.yellow);
    }
  });
  
  // Handle process signals
  process.on('SIGINT', () => {
    log('Received SIGINT signal. Shutting down...', colors.yellow);
    server.kill();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    log('Received SIGTERM signal. Shutting down...', colors.yellow);
    server.kill();
    process.exit(0);
  });
}

// Main execution
function main() {
  log('Starting Smart Recommendations Demo...', colors.cyan);
  killExistingProcesses();
  
  // Give a small delay for process cleanup
  setTimeout(() => {
    startServer();
  }, 1000);
}

main();