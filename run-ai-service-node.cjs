/**
 * AI Service Runner
 * Simple Node.js script to start the TypeScript AI service
 */

// Register TypeScript compiler
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs'
  }
});

// This will avoid ESM vs CommonJS issues
console.log('Starting AI Optimization Service...');
console.log('TypeScript compiler registered with CommonJS module resolution');

// Load and execute the server
try {
  console.log('Loading AI service runner...');
  
  // Use standalone script for simplicity
  const express = require('express');
  const cors = require('cors');
  const fs = require('fs');
  const path = require('path');
  
  // Configuration
  const PORT = process.env.AI_SERVICE_PORT || 5200;
  const LOG_DIR = path.join(process.cwd(), 'logs');
  const LOG_FILE = path.join(LOG_DIR, 'ai-service.log');
  
  // Ensure log directory exists
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  
  // Save the port to a file for other scripts to use
  fs.writeFileSync('.ai-optimization.port', PORT.toString());
  fs.writeFileSync('.ai-optimization.pid', process.pid.toString());
  
  console.log(`Starting AI Optimization Service on port ${PORT}`);
  fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} - Starting AI Optimization Service\n`);
  
  // Create Express app
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  
  // Request logging
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - ${req.method} ${req.path}`;
    
    console.log(logEntry);
    
    try {
      fs.appendFileSync(LOG_FILE, logEntry + '\n');
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
    
    next();
  });
  
  /**
   * Health check endpoint
   */
  app.get('/health', async (req, res) => {
    // For testing, we'll just return a simple status
    const openaiAvailable = !!process.env.OPENAI_API_KEY;
    const geminiAvailable = !!process.env.GEMINI_API_KEY;
    
    const status = openaiAvailable || geminiAvailable ? 200 : 503;
    
    res.status(status).json({
      status: status === 200 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        openai: openaiAvailable ? 'available' : 'unavailable',
        gemini: geminiAvailable ? 'available' : 'unavailable'
      },
      uptime: process.uptime()
    });
  });
  
  /**
   * AI generation endpoint (simplified for testing)
   */
  app.post('/generate', async (req, res) => {
    try {
      const {
        userId,
        messages,
        complexity,
        priority,
        responseFormat = 'text',
        forceFresh = false
      } = req.body;
      
      // Validate request
      if (!userId || !messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid request. Required fields: userId, messages (array)' });
      }
      
      // For testing, just return a simple response
      const startTime = Date.now();
      
      // Simulate processing time based on complexity
      const processingTimes = {
        'low': 500,
        'medium': 1500,
        'high': 3000,
        'very_high': 5000
      };
      
      const processingTime = processingTimes[complexity] || 1500;
      
      // Only wait if forceFresh is true (simulating cache hit)
      if (forceFresh) {
        await new Promise(resolve => setTimeout(resolve, processingTime));
      }
      
      // Record timing
      const duration = Date.now() - startTime;
      
      // Log the request
      console.log(`Generated response in ${duration}ms (complexity: ${complexity}, priority: ${priority})`);
      fs.appendFileSync(
        LOG_FILE, 
        `${new Date().toISOString()} - Generated response for user ${userId}, complexity: ${complexity}, time: ${duration}ms\n`
      );
      
      // Return a simulated response
      return res.json({
        response: `This is a test response to: "${messages[messages.length - 1]?.content || 'your query'}"`,
        metadata: {
          complexity,
          processingTime: duration,
          modelUsed: complexity === 'high' ? 'gpt-4o' : 'gpt-3.5-turbo',
          cached: !forceFresh
        }
      });
    } catch (error) {
      console.error('Error generating AI response:', error);
      return res.status(500).json({ error: 'Failed to generate AI response' });
    }
  });
  
  /**
   * Get cache and processing statistics
   */
  app.get('/stats', (req, res) => {
    // Return simulated stats for testing
    res.json({
      activePrompts: 0,
      queueSizes: {
        critical: 0,
        high: 0,
        normal: 0,
        low: 0
      },
      isProcessingBatch: false,
      cache: {
        hits: 25,
        misses: 10,
        size: 35,
        diskSize: 15,
        fingerprintHits: 5,
        createdAt: new Date(),
        lastCleanup: new Date()
      }
    });
  });
  
  // Start the server
  app.listen(PORT, () => {
    console.log(`AI Service running on port ${PORT}`);
    fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} - AI Service started on port ${PORT}\n`);
  });
  
} catch (error) {
  console.error('Error starting AI service:', error);
  process.exit(1);
}