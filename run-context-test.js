/**
 * Script to run the test server and execute context-aware endpoint tests
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const SERVER_STARTUP_DELAY = 2000; // 2 seconds to allow server to start
const SERVER_SCRIPT = path.join(__dirname, 'simple-test-server.cjs');
const TEST_SCRIPT = path.join(__dirname, 'test-context-simple.cjs');
const LOG_FILE = path.join(__dirname, 'context-api-test.log');

// Clear any existing log file
if (fs.existsSync(LOG_FILE)) {
  fs.unlinkSync(LOG_FILE);
}

// Create log file stream
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

// Function to log messages
function log(message) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] ${message}`;
  console.log(formattedMessage);
  logStream.write(formattedMessage + '\n');
}

// Function to start the server
function startServer() {
  log('Starting test server...');
  
  const server = spawn('node', [SERVER_SCRIPT]);
  
  server.stdout.on('data', (data) => {
    log(`[SERVER] ${data.toString().trim()}`);
  });
  
  server.stderr.on('data', (data) => {
    log(`[SERVER ERROR] ${data.toString().trim()}`);
  });
  
  server.on('close', (code) => {
    log(`Server process exited with code ${code}`);
  });
  
  return server;
}

// Function to run the tests
function runTests() {
  log('Running context-aware endpoint tests...');
  
  const tests = spawn('node', [TEST_SCRIPT]);
  
  tests.stdout.on('data', (data) => {
    log(`[TEST] ${data.toString().trim()}`);
  });
  
  tests.stderr.on('data', (data) => {
    log(`[TEST ERROR] ${data.toString().trim()}`);
  });
  
  tests.on('close', (code) => {
    log(`Test process exited with code ${code}`);
    
    // Test process has finished, we can terminate the server now
    if (serverProcess) {
      log('Tests complete, terminating server...');
      serverProcess.kill();
    }
    
    // Close the log stream
    logStream.end();
    
    // Exit with the same code as the test process
    process.exit(code);
  });
}

// Main execution
log('Starting test sequence...');

// Start the server
const serverProcess = startServer();

// Wait for the server to start, then run tests
setTimeout(() => {
  runTests();
}, SERVER_STARTUP_DELAY);

// Handle process termination
process.on('SIGINT', () => {
  log('Process interrupted, cleaning up...');
  if (serverProcess) {
    serverProcess.kill();
  }
  logStream.end();
  process.exit(1);
});