/**
 * Simple Smart Recommendations Runner
 * This script runs the simplified version of our Smart Recommendations server
 * This uses CommonJS format for better compatibility
 */

const { exec } = require('child_process');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Configuration
const MANAGER_PORT = 3000;
const SMART_SERVER_PORT = 3010;

// Create a manager Express app
const app = express();

// Log startup
console.log('Starting Simple Smart Recommendations infrastructure...');

// Start the Smart Recommendations server process
const serverProcess = exec('node simple-smart-server.js', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error starting server: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Server stderr: ${stderr}`);
  }
});

// Set up output handling
serverProcess.stdout.on('data', (data) => {
  console.log(`Server: ${data.toString().trim()}`);
});

serverProcess.stderr.on('data', (data) => {
  console.error(`Server error: ${data.toString().trim()}`);
});

// Wait for the server to start up
console.log(`Waiting for Smart Recommendations server to start on port ${SMART_SERVER_PORT}...`);
setTimeout(() => {
  // Set up proxy to forward requests to the Smart Recommendations server
  app.use('/api/context-aware', createProxyMiddleware({
    target: `http://0.0.0.0:${SMART_SERVER_PORT}`,
    changeOrigin: true,
    pathRewrite: {
      '^/api/context-aware': '/api/context-aware'
    },
    onProxyReq: (proxyReq, req, res) => {
      // Add admin user ID if not provided (for testing)
      if (!req.headers['x-user-id']) {
        proxyReq.setHeader('X-User-ID', '370'); // Default admin user ID
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`Proxied ${req.method} ${req.path} -> ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(500).json({
        message: 'Smart Recommendations server unavailable',
        error: err.message
      });
    }
  }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).send('Smart Recommendations Manager is running');
  });

  // Info endpoint
  app.get('/', (req, res) => {
    res.status(200).json({
      name: 'Smart Recommendations API',
      status: 'running',
      endpoints: [
        '/api/context-aware/health-recommendations',
        '/api/context-aware/supplement-recommendations',
        '/api/context-aware/health-context'
      ]
    });
  });

  // Start the manager server
  app.listen(MANAGER_PORT, '0.0.0.0', () => {
    console.log(`Smart Recommendations Manager running on port ${MANAGER_PORT}`);
    console.log(`Proxying API requests to Smart Recommendations server on port ${SMART_SERVER_PORT}`);
    console.log('\nAvailable endpoints:');
    console.log(`- http://localhost:${MANAGER_PORT}/api/context-aware/health-recommendations`);
    console.log(`- http://localhost:${MANAGER_PORT}/api/context-aware/supplement-recommendations`);
    console.log(`- http://localhost:${MANAGER_PORT}/api/context-aware/health-context`);
    console.log(`- http://localhost:${MANAGER_PORT}/health (health check)`);
  });
}, 2000); // Wait 2 seconds for the server to start

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down servers...');
  serverProcess.kill();
  process.exit(0);
});
