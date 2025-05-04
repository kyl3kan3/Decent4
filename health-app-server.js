/**
 * Health App Server - Simplified starter
 * 
 * This script creates a simplified server that starts both
 * the front-end and back-end components of the health app
 * and the AI context-aware test server
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import fs from 'fs';
import http from 'http';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3002;
const aiContextPort = 8080;

// Enable CORS for development
app.use(cors());

// Configure basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: 'development' });
});

// Create proxy for the AI context server
app.all('/api/context-aware/*', (req, res) => {
  console.log(`Proxying request to AI context server: ${req.url}`);
  
  const options = {
    hostname: '0.0.0.0',
    port: aiContextPort,
    path: req.url,
    method: req.method,
    headers: req.headers
  };
  
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  
  proxyReq.on('error', (e) => {
    console.error(`Proxy error: ${e.message}`);
    res.status(500).json({ error: 'Failed to connect to AI context server' });
  });
  
  if (req.body) {
    proxyReq.write(JSON.stringify(req.body));
  }
  
  proxyReq.end();
});

// Start database
console.log('Checking database connection...');

// Start the AI context server
console.log('Starting AI context server...');
const aiContextProcess = spawn('node', ['test-ai-context.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: aiContextPort.toString()
  }
});

aiContextProcess.on('exit', (code) => {
  console.log(`AI context server exited with code ${code}`);
});

// Start the server
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Health App server running on port ${port} (using port 3002 instead of 5001 to avoid conflicts)`);
  
  // Start the Vite development server for the frontend
  console.log('Starting frontend development server...');
  
  const viteProcess = spawn('npx', ['vite', 'client', '--port', '3000', '--host'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_API_URL: `http://0.0.0.0:${port}`
    }
  });
  
  viteProcess.on('exit', (code) => {
    console.log(`Frontend server exited with code ${code}`);
    process.exit(code);
  });
  
  // Signal that server is ready
  fs.writeFileSync('.ready', 'true');
  console.log('Server is ready!');
  console.log(`- Main API: http://0.0.0.0:${port}/api/health`);
  console.log(`- Frontend: http://0.0.0.0:3000`);
  console.log(`- AI Context API: http://0.0.0.0:${aiContextPort}/api/context-aware/health/test`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down servers...');
  server.close(() => {
    console.log('Main server closed');
    
    // Also kill the AI context process
    if (aiContextProcess) {
      aiContextProcess.kill();
      console.log('AI context server terminated');
    }
    
    process.exit(0);
  });
});