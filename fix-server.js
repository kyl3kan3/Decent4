/**
 * Server Diagnostic and Fix Tool
 * 
 * This script will:
 * 1. Check for required files and paths
 * 2. Verify database connection
 * 3. Check for required environment variables
 * 4. Create a minimal server to test connectivity
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import { exec } from 'child_process';
import pkg from 'pg';
const { Pool } = pkg;

console.log('Starting server diagnostics...');

// Check for critical paths
function checkPath(path) {
  try {
    return fs.existsSync(path);
  } catch (error) {
    return false;
  }
}

// Check environment variables
function checkEnvVars() {
  console.log('\n--- Environment Variables ---');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  console.log(`PORT: ${process.env.PORT || '3000'}`);
  console.log(`DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);
  console.log(`OPENAI_API_KEY exists: ${!!process.env.OPENAI_API_KEY}`);
  console.log(`GEMINI_API_KEY exists: ${!!process.env.GEMINI_API_KEY}`);
}

// Check file paths
function checkPaths() {
  console.log('\n--- Critical Path Checks ---');
  const paths = [
    'server',
    'server/index.ts',
    'client', 
    'client/src',
    'shared',
    'shared/schema.ts'
  ];
  
  paths.forEach(p => {
    console.log(`Path check: ${p} - ${checkPath(p) ? 'EXISTS' : 'MISSING'}`);
  });
}

// Check database connection
async function checkDatabase() {
  console.log('\n--- Database Connection Check ---');
  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL not set');
    return false;
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true
  });
  
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('Database connection successful');
    console.log(`Current timestamp: ${result.rows[0].now}`);
    client.release();
    
    // Check tables
    const tablesClient = await pool.connect();
    const tables = await tablesClient.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log('Database tables:');
    tables.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    tablesClient.release();
    
    await pool.end();
    return true;
  } catch (error) {
    console.error('Database connection error:', error.message);
    return false;
  }
}

// Start a minimal server
function startMinimalServer() {
  console.log('\n--- Starting Minimal Server ---');
  const port = 3500;
  
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    
    if (req.url === '/api/health') {
      res.end(JSON.stringify({ status: 'ok', mode: 'diagnostic' }));
    } else if (req.url === '/api/user') {
      res.end(JSON.stringify({ 
        id: 1,
        username: 'test_user',
        onboardingCompleted: true 
      }));
    } else {
      res.end(JSON.stringify({ message: 'Diagnostic server running' }));
    }
  });
  
  server.listen(port, '0.0.0.0', () => {
    console.log(`Minimal server running at http://localhost:${port}`);
    console.log(`Available at http://0.0.0.0:${port}`);
    console.log('Try accessing /api/health to verify it works');
    
    // Write port file for Replit
    fs.writeFileSync('.replit.port', port.toString());
    fs.writeFileSync('.ready', '');
  });
  
  return server;
}

async function main() {
  try {
    checkEnvVars();
    checkPaths();
    await checkDatabase();
    
    // Start minimal server
    const server = startMinimalServer();
    
    console.log('\n--- Diagnostics Complete ---');
    console.log('To fix the server:');
    console.log('1. Verify DATABASE_URL is correct');
    console.log('2. Check all required paths exist');
    console.log('3. Look for error messages in server startup logs');
    
    // Keep server running
    process.on('SIGINT', () => {
      server.close(() => {
        console.log('Diagnostic server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Diagnostic error:', error);
  }
}

main();