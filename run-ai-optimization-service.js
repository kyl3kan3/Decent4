/**
 * AI Optimization Service Server
 * 
 * This script starts the AI optimization service with an Express server
 * that exposes its API endpoints.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { router: aiServiceRouter, aiService } = require('./server/ai-service-api');
const colors = require('colors');

// Configuration
const PORT = process.env.AI_SERVICE_PORT || 5200;
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'ai-optimization.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Logging function
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

// Start the server
function startServer() {
  log('Starting AI Optimization Service...', colors.cyan);
  
  // Record service info
  fs.writeFileSync('.ai-optimization.port', PORT.toString());
  fs.writeFileSync('.ai-optimization.pid', process.pid.toString());
  
  // Create Express app
  const app = express();
  
  // Add basic middlewares
  app.use(express.json({ limit: '10mb' }));
  
  // Mount the AI service API
  app.use('/', aiServiceRouter);
  
  // Handle uncaught routes
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`
    });
  });
  
  // Handle errors
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  });
  
  // Start the server
  const server = app.listen(PORT, '0.0.0.0', () => {
    log(`AI Optimization Service running on port ${PORT}`, colors.green);
  });
  
  // Register shutdown handler
  process.on('SIGINT', () => {
    log('Received SIGINT signal, shutting down...', colors.yellow);
    
    // Shutdown the AI service
    aiService.shutdown();
    
    // Close the server
    server.close(() => {
      log('Server closed', colors.yellow);
      process.exit(0);
    });
    
    // Force exit after 5 seconds if server doesn't close gracefully
    setTimeout(() => {
      log('Forcing exit after timeout', colors.red);
      process.exit(1);
    }, 5000);
  });
  
  return server;
}

// Start the server
startServer();