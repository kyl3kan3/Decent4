/**
 * Simple OpenAI Smart Recommendations Runner
 * This script starts the updated OpenAI-powered recommendations server
 * without relying on complex workflow configurations
 */

import { spawn } from 'child_process';
import fs from 'fs';

// Configuration
const SERVER_SCRIPT = './updated-smart-server.js';
const PID_FILE = '.openai-recs-server.pid';

// Main function
function main() {
  console.log('Starting OpenAI-powered Smart Recommendations server...');
  
  // Check if the OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    console.error('ERROR: OPENAI_API_KEY is not configured!');
    console.error('The recommendations will not work without a valid API key.');
    console.error('Please set the OPENAI_API_KEY environment variable.');
  } else {
    console.log('✓ OpenAI API key is properly configured.');
  }
  
  // Kill any existing process if needed
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
      if (pid) {
        console.log(`Attempting to kill existing process with PID: ${pid}`);
        try {
          process.kill(pid);
          console.log(`Successfully killed existing process with PID: ${pid}`);
        } catch (e) {
          console.log(`No active process found with PID: ${pid}`);
        }
      }
      fs.unlinkSync(PID_FILE);
    }
  } catch (error) {
    console.error(`Error handling existing process: ${error.message}`);
  }
  
  // Start the server process
  try {
    console.log(`Starting server from: ${SERVER_SCRIPT}`);
    const serverProcess = spawn('node', [SERVER_SCRIPT], {
      env: process.env,
      stdio: 'inherit'
    });
    
    // Save the process ID
    fs.writeFileSync(PID_FILE, serverProcess.pid.toString());
    console.log(`Server started with PID: ${serverProcess.pid}`);
    
    // Handle process events
    serverProcess.on('error', (error) => {
      console.error(`Error starting server: ${error.message}`);
    });
    
    serverProcess.on('close', (code) => {
      console.log(`Server process exited with code: ${code}`);
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
      }
    });
    
    // Setup graceful shutdown
    process.on('SIGINT', () => {
      console.log('Shutting down server...');
      serverProcess.kill('SIGINT');
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
      }
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('Shutting down server...');
      serverProcess.kill('SIGTERM');
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
      }
      process.exit(0);
    });
    
    console.log('\nServer should be available at:');
    console.log('- http://localhost:5101');
    console.log('\nEndpoints:');
    console.log('- /api/context-aware/supplement-recommendations');
    console.log('- /api/context-aware/health-recommendations');
    console.log('- /api/context-aware/bloodwork-analysis');
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
  }
}

// Run the script
main();
