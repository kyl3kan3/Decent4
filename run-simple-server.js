/**
 * Simple Script to run the simplified server in the background
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting VitalGradient Health Dashboard...');

// Kill any existing processes
try {
  // Check if PID file exists
  if (fs.existsSync('.vitalgradient.pid')) {
    const pid = fs.readFileSync('.vitalgradient.pid', 'utf8');
    try {
      process.kill(parseInt(pid), 'SIGTERM');
      console.log(`Killed previous server process (PID: ${pid})`);
    } catch (e) {
      // Process may not exist anymore
    }
    fs.unlinkSync('.vitalgradient.pid');
  }
} catch (err) {
  console.error('Error cleaning up previous instances:', err);
}

// Start the server process
const server = spawn('node', ['simple-server.js'], {
  detached: true,
  stdio: 'inherit'
});

// Save the PID
fs.writeFileSync('.vitalgradient.pid', server.pid.toString());

console.log(`Server started with PID: ${server.pid}`);
console.log('The server will continue running in the background.');
console.log('Access the dashboard at http://localhost:3001 or the Replit URL.');

// Clean up on exit
process.on('SIGINT', () => {
  if (fs.existsSync('.vitalgradient.pid')) {
    const pid = fs.readFileSync('.vitalgradient.pid', 'utf8');
    try {
      process.kill(parseInt(pid), 'SIGTERM');
      console.log(`Killed server process (PID: ${pid})`);
    } catch (e) {
      // Process may not exist anymore
    }
    fs.unlinkSync('.vitalgradient.pid');
  }
  process.exit(0);
});