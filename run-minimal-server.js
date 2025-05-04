/**
 * Script to run the minimal server in the background
 */

import { spawn } from 'child_process';

console.log('Starting minimal test server in the background...');

// Start the server in the background
const server = spawn('npx', ['tsx', 'minimal-server.js'], {
  detached: true,
  stdio: 'inherit'
});

console.log('Server started with PID:', server.pid);
console.log('You can test the API using:');
console.log('  curl http://localhost:5600/api/health');
console.log('  curl http://localhost:5600/api/info');
console.log('  curl http://localhost:5600/api/user/me');

// Allow the process to stay alive for a while to show logs
setTimeout(() => {
  console.log('Parent process exiting, server continues running in background');
  server.unref();
  process.exit(0);
}, 3000);