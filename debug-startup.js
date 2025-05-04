/**
 * Debug Startup Script
 * This script helps diagnose issues with application startup
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to check environment variables
function checkEnvironmentVariables() {
  console.log('\n=== Environment Variables ===');
  const requiredVars = ['STRIPE_SECRET_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'DATABASE_URL'];
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: Present`);
    } else {
      console.log(`❌ ${varName}: Missing`);
    }
  }
}

// Check file existence
function checkCriticalFiles() {
  console.log('\n=== Critical Files ===');
  const filesToCheck = [
    '.env',
    'server/index.ts',
    'server/routes.ts',
    'server/db.ts',
    'server/storage.ts',
    'server/ai-service-switcher.ts',
    'shared/schema.ts'
  ];
  
  for (const file of filesToCheck) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}: Present`);
    } else {
      console.log(`❌ ${file}: Missing`);
    }
  }
}

// Check database connection
function checkDatabaseConnection() {
  console.log('\n=== Database Connection ===');
  exec('pg_isready', (error, stdout, stderr) => {
    if (error) {
      console.log(`❌ Database connection: Failed (${error.message})`);
      return;
    }
    console.log(`✅ Database connection: ${stdout.trim()}`);
  });
  
  // Verify we have a valid DATABASE_URL
  if (process.env.DATABASE_URL) {
    console.log(`✅ DATABASE_URL format: Valid`);
  } else {
    console.log(`❌ DATABASE_URL format: Missing or invalid`);
  }
}

// Test a simple server
function testBasicServer() {
  console.log('\n=== Test Server ===');
  fs.writeFileSync('test-server.js', `
  import express from 'express';
  const app = express();
  const port = 5000;
  
  app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Test server running' });
  });
  
  app.listen(port, '0.0.0.0', () => {
    console.log(\`Test server running at http://0.0.0.0:\${port}\`);
  });
  `);
  
  console.log('Starting test server...');
  exec('node test-server.js &', (error, stdout, stderr) => {
    if (error) {
      console.log(`❌ Test server: Failed to start (${error.message})`);
      return;
    }
    
    console.log(`✅ Test server: Started`);
    
    // Test the server after short delay
    setTimeout(() => {
      exec('curl http://localhost:5000', (error, stdout, stderr) => {
        if (error) {
          console.log(`❌ Test server request: Failed (${error.message})`);
        } else {
          console.log(`✅ Test server request: Success (${stdout.trim()})`);
        }
        
        // Cleanup test server
        exec('pkill -f "node test-server.js"');
        fs.unlinkSync('test-server.js');
      });
    }, 1000);
  });
}

// Main function
async function main() {
  console.log('=== Health App Startup Diagnostic ===');
  console.log(`Running from: ${__dirname}`);
  console.log(`Node version: ${process.version}`);
  console.log(`Time: ${new Date().toISOString()}`);
  
  // Run all checks
  checkEnvironmentVariables();
  checkCriticalFiles();
  checkDatabaseConnection();
  testBasicServer();
}

main().catch(error => {
  console.error('Error running diagnostics:', error);
});