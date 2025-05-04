/**
 * AI Service Runner
 * 
 * This script initializes and runs the adaptive AI service which
 * optimizes model selection based on query complexity.
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import colors from 'colors';

// Directory for logs
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'ai-service.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Save the PID to a file
fs.writeFileSync('.ai-service.pid', process.pid.toString());

function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `${timestamp} - ${message}`;
  console.log(color(formattedMessage));
  
  try {
    fs.appendFileSync(LOG_FILE, formattedMessage + '\n');
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

async function startAIService() {
  log('Starting adaptive AI service...', colors.cyan);
  
  // Check for required environment variables
  if (!process.env.OPENAI_API_KEY) {
    log('⚠️ OPENAI_API_KEY environment variable is missing. OpenAI services may not function properly.', colors.yellow);
    log('Consider adding your OpenAI API key through the Secrets tool.', colors.yellow);
  }
  
  if (!process.env.GEMINI_API_KEY) {
    log('⚠️ GEMINI_API_KEY environment variable is missing. Gemini services may not function properly.', colors.yellow);
    log('Consider adding your Gemini API key through the Secrets tool.', colors.yellow);
  }

  // Start the AI service
  const serverProcess = spawn('node', [
    '-r', 'ts-node/register',
    './server/ai-service-runner.ts'
  ], {
    stdio: 'pipe',
    env: process.env
  });

  // Handle server process output
  serverProcess.stdout.on('data', (data) => {
    log(`AI Service: ${data.toString().trim()}`, colors.green);
  });

  serverProcess.stderr.on('data', (data) => {
    log(`AI Service Error: ${data.toString().trim()}`, colors.red);
  });

  serverProcess.on('exit', (code) => {
    log(`AI Service exited with code ${code}`, colors.yellow);
    if (code !== 0) {
      log('Attempting to restart AI service in 5 seconds...', colors.yellow);
      setTimeout(startAIService, 5000);
    }
  });

  // Log successful startup
  log('AI Service initialization complete. Ready to process requests.', colors.green);
}

// Handle process termination
process.on('SIGINT', () => {
  log('Received SIGINT. Shutting down AI service...', colors.yellow);
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM. Shutting down AI service...', colors.yellow);
  process.exit(0);
});

process.on('exit', () => {
  log('AI Service shutting down...', colors.yellow);
  
  // Clean up PID file
  try {
    if (fs.existsSync('.ai-service.pid')) {
      fs.unlinkSync('.ai-service.pid');
    }
  } catch (err) {
    console.error('Error cleaning up PID file:', err);
  }
});

// Start the AI service
startAIService().catch(err => {
  log(`Failed to start AI service: ${err.message}`, colors.red);
  process.exit(1);
});