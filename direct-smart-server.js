/**
 * Direct Smart Recommendations Server
 * This is a simplified direct starter that doesn't rely on the runner script
 */

import { spawn } from 'child_process';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const SERVER_FILE = './updated-smart-server.js';
const PORT = process.env.SMART_RECS_PORT || 5101;
const PID_FILE = '.smart-recs-server.pid';

// Set custom port if needed
process.env.PORT = PORT;

console.log('Starting Smart Recommendations server using OpenAI integration...');

// Check if OpenAI API key is configured
if (!process.env.OPENAI_API_KEY) {
  console.warn('\x1b[33m⚠️ WARNING: OPENAI_API_KEY is not set in environment!\x1b[0m');
  console.warn('\x1b[33mRecommendations will not work properly without an API key.\x1b[0m');
  console.warn('\x1b[33mPlease set the OPENAI_API_KEY environment variable.\x1b[0m');
} else {
  console.log('\x1b[32m✓ OpenAI API key is configured.\x1b[0m');
}

// Kill any existing process
try {
  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
    if (pid) {
      console.log(`Attempting to kill existing process with PID: ${pid}`);
      try {
        process.kill(pid);
        console.log(`Successfully killed existing process`);
      } catch (e) {
        console.log(`No active process found with PID: ${pid}`);
      }
    }
    fs.unlinkSync(PID_FILE);
  }
} catch (error) {
  console.error(`Error handling existing process: ${error.message}`);
}

// Start the server
try {
  console.log(`Starting server: ${SERVER_FILE}`);
  
  const serverProcess = spawn('node', [SERVER_FILE], {
    env: process.env,
    stdio: 'inherit'
  });
  
  // Save PID for future cleanup
  fs.writeFileSync(PID_FILE, serverProcess.pid.toString());
  console.log(`Server started with PID: ${serverProcess.pid}`);
  
  // Setup graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down Smart Recommendations server...');
    serverProcess.kill('SIGINT');
    fs.unlinkSync(PID_FILE);
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('Shutting down Smart Recommendations server...');
    serverProcess.kill('SIGTERM');
    fs.unlinkSync(PID_FILE);
    process.exit(0);
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    try {
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
      }
    } catch (e) {
      // Ignore error if file doesn't exist
    }
    process.exit(code);
  });

  // Display endpoint information once server is likely running
  setTimeout(() => {
    console.log('');
    console.log('Server should be available at:');
    console.log(`- http://localhost:${PORT}/api/context-aware/supplement-recommendations`);
    console.log('');
    console.log('Use the following test commands:');
    console.log('- node test-openai-recommendations.js');
    console.log('');
  }, 2000);

} catch (error) {
  console.error(`Failed to start server: ${error.message}`);
  process.exit(1);
}
