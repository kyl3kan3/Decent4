/**
 * Simple Database-Driven Smart Recommendations Server
 * 
 * This script runs the fixed-smart-server.js, which now uses real data from
 * the database instead of hardcoded sample data.
 */

import { spawn } from 'child_process';
import colors from 'colors';
import http from 'http';

console.log(colors.cyan('Starting Database-Driven Smart Recommendations Server'));
console.log(colors.cyan('This server uses real user data from the PostgreSQL database'));

// Check for OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.log(colors.yellow('WARNING: OPENAI_API_KEY is not set. Smart recommendations will not work.'));
} else {
  console.log(colors.green('✓ OpenAI API key is configured'));
}

// Check for DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.log(colors.red('ERROR: DATABASE_URL is not set. Database connection will fail.'));
  process.exit(1);
} else {
  console.log(colors.green('✓ Database URL is configured'));
}

console.log(colors.cyan('Starting fixed-smart-server.js directly...'));

// Start the server process using spawn to keep it running and capture output
const serverProcess = spawn('node', ['fixed-smart-server.js'], {
  env: process.env,
  stdio: ['pipe', 'pipe', 'pipe']
});

// Function to test an endpoint after server starts
function testEndpoint(path, userId = '370') {
  const url = `http://localhost:3010${path}?userId=${userId}`;
  console.log(colors.cyan(`\nTesting endpoint: ${url}`));
  
  const options = {
    hostname: 'localhost',
    port: 3010,
    path: `${path}?userId=${userId}`,
    method: 'GET',
    headers: {
      'X-User-ID': userId
    }
  };
  
  http.get(options, (res) => {
    const { statusCode } = res;
    console.log(colors.cyan(`Status Code: ${statusCode}`));
    
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        // Try to parse and format the JSON response
        const parsedData = JSON.parse(data);
        console.log(colors.green('Response received successfully ✓'));
        // Log a summary of the data instead of the full response
        if (path.includes('health-context')) {
          console.log(colors.green('Health context retrieved for user'));
          console.log(colors.cyan('Context includes:'));
          const keys = Object.keys(parsedData);
          keys.forEach(key => {
            const value = parsedData[key];
            if (Array.isArray(value)) {
              console.log(`  - ${key}: ${value.length} items`);
            } else if (typeof value === 'object' && value !== null) {
              console.log(`  - ${key}: ${Object.keys(value).length} properties`);
            } else {
              console.log(`  - ${key}: ${value}`);
            }
          });
        } else if (path.includes('recommendations')) {
          console.log(colors.green('Recommendations generated successfully'));
          if (parsedData.recommendations) {
            console.log(colors.cyan(`Received ${parsedData.recommendations.length} recommendations`));
            if (parsedData.recommendations.length > 0) {
              console.log(colors.cyan('First recommendation:'));
              console.log(`  - Name: ${parsedData.recommendations[0].name}`);
              console.log(`  - Category: ${parsedData.recommendations[0].category}`);
            }
          }
          if (parsedData.analysis) {
            console.log(colors.cyan('Analysis included:'));
            console.log(`  - Patterns detected: ${parsedData.analysis.patternDetected || 'None'}`);
          }
        } else {
          // For other endpoints just show that we got data
          console.log(colors.cyan('Response summary:'), 
            JSON.stringify(parsedData).substring(0, 100) + '...');
        }
      } catch (e) {
        console.log(colors.yellow('Response is not JSON or could not be parsed'));
        console.log(data.substring(0, 200) + (data.length > 200 ? '...' : ''));
      }
    });
  }).on('error', (e) => {
    console.error(colors.red(`Error: ${e.message}`));
  });
}

// Handle server output
serverProcess.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    if (line.includes('error') || line.includes('Error')) {
      console.log(colors.red(line));
    } else if (line.includes('warning') || line.includes('Warning')) {
      console.log(colors.yellow(line));
    } else {
      console.log(line);
    }
  });
});

serverProcess.stderr.on('data', (data) => {
  console.log(colors.red(data.toString().trim()));
});

// Handle process exit
serverProcess.on('exit', (code) => {
  if (code === 0) {
    console.log(colors.green('Server process exited successfully'));
  } else {
    console.log(colors.red(`Server process exited with code ${code}`));
  }
});

// Wait for server to start and then run tests
let serverStarted = false;
let healthCheckCount = 0;
const MAX_HEALTH_CHECKS = 10;

// Function to check if server is up and run tests
function checkServerAndRunTests() {
  if (serverStarted) return; // Don't run multiple times
  
  healthCheckCount++;
  if (healthCheckCount > MAX_HEALTH_CHECKS) {
    console.log(colors.red('Server did not start within expected time.'));
    return;
  }
  
  // Test if the server is responding
  const healthOptions = {
    hostname: 'localhost',
    port: 3010,
    path: '/health',
    method: 'GET'
  };
  http.get(healthOptions, (res) => {
    if (res.statusCode === 200) {
      serverStarted = true;
      console.log(colors.green('\n✓ Server is now running and responding to requests'));
      console.log(colors.cyan('Running automated tests for database integration...'));
      
      // Run tests with a delay between each to ensure they don't conflict
      setTimeout(() => testEndpoint('/health'), 500);
      setTimeout(() => testEndpoint('/api/context-aware/health-context'), 2000);
      setTimeout(() => testEndpoint('/api/context-aware/supplement-recommendations'), 3500);
      setTimeout(() => testEndpoint('/api/context-aware/health-recommendations'), 5000);
    } else {
      // Try again after a delay
      setTimeout(checkServerAndRunTests, 1000);
    }
  }).on('error', () => {
    // Server not ready yet, try again
    setTimeout(checkServerAndRunTests, 1000);
  });
}

// Start checking for server after a short delay
setTimeout(checkServerAndRunTests, 2000);

// Handle signals
process.on('SIGINT', () => {
  console.log(colors.cyan('\nShutting down server...'));
  serverProcess.kill();
  process.exit(0);
});
