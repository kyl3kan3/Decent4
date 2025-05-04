/**
 * Test script for AI Context Integration
 *
 * This script sets up both the AI context server and an integrated test server,
 * allowing us to test if the AI recommendations system is working correctly.
 */

import express from 'express';
import { spawn } from 'child_process';
import fs from 'fs';

// Create a simple Express server to coordinate the test
const app = express();
const port = 9000;

let contextServer = null;
let testServer = null;

// Start the AI context server on port 8080
function startContextServer() {
  console.log('Starting AI Context Server on port 8080...');
  contextServer = spawn('node', ['test-ai-context.js'], {
    env: {
      ...process.env,
      PORT: '8080'
    },
    stdio: 'inherit'
  });
  
  contextServer.on('exit', (code) => {
    console.log(`AI Context Server exited with code ${code}`);
  });
}

// Start the integrated test server on port 7001
function startTestServer() {
  console.log('Starting Integrated Test Server on port 7001...');
  testServer = spawn('node', ['test-integrated-server.js'], {
    env: {
      ...process.env,
      PORT: '7001'
    },
    stdio: 'inherit'
  });
  
  testServer.on('exit', (code) => {
    console.log(`Integrated Test Server exited with code ${code}`);
  });
}

// Setup a basic endpoint for the coordination server
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>AI Context Test Coordinator</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; }
          h1 { color: #333; }
          h2 { color: #666; margin-top: 20px; }
          .server { padding: 10px; margin: 10px 0; border-radius: 5px; }
          .running { background-color: #dff0d8; border: 1px solid #d6e9c6; }
          .stopped { background-color: #f2dede; border: 1px solid #ebccd1; }
          button { background: #4CAF50; color: white; border: none; padding: 10px 15px; margin: 5px; cursor: pointer; }
          button.stop { background: #d9534f; }
          a { color: #337ab7; text-decoration: none; }
          a:hover { text-decoration: underline; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>AI Context Test Coordinator</h1>
        
        <div class="server running">
          <h2>AI Context Server</h2>
          <p>Running on port 8080</p>
          <p><a href="http://${req.hostname}:8080/api/health" target="_blank">Check Health</a></p>
          <button class="stop" onclick="fetch('/stop-context')">Stop Server</button>
        </div>
        
        <div class="server running">
          <h2>Integrated Test Server</h2>
          <p>Running on port 7001</p>
          <p><a href="http://${req.hostname}:7001/" target="_blank">Open Test UI</a></p>
          <p><a href="http://${req.hostname}:7001/api/health" target="_blank">Check Health</a></p>
          <button class="stop" onclick="fetch('/stop-test')">Stop Server</button>
        </div>
        
        <h2>Available Test Endpoints</h2>
        <pre>
  GET http://${req.hostname}:8080/api/context-aware/health-context/123
  POST http://${req.hostname}:8080/api/context-aware/health-recommendations
  POST http://${req.hostname}:8080/api/context-aware/supplement-recommendations
        </pre>
        
        <p>These endpoints are also available through the integrated test server proxy:</p>
        <pre>
  GET http://${req.hostname}:7001/api/context-aware/health-context/123
  POST http://${req.hostname}:7001/api/context-aware/health-recommendations
  POST http://${req.hostname}:7001/api/context-aware/supplement-recommendations
        </pre>
      </body>
    </html>
  `);
});

// Endpoints to stop servers
app.get('/stop-context', (req, res) => {
  if (contextServer) {
    contextServer.kill();
    contextServer = null;
  }
  res.redirect('/');
});

app.get('/stop-test', (req, res) => {
  if (testServer) {
    testServer.kill();
    testServer = null;
  }
  res.redirect('/');
});

// Start all servers
app.listen(port, '0.0.0.0', () => {
  console.log(`Coordinator server running at http://0.0.0.0:${port}`);
  
  // Start the other servers
  startContextServer();
  
  // Wait a moment for the context server to start
  setTimeout(() => {
    startTestServer();
  }, 2000);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down all servers...');
  
  if (contextServer) {
    contextServer.kill();
  }
  
  if (testServer) {
    testServer.kill();
  }
  
  process.exit(0);
});

console.log('AI Context Test Script Running...');