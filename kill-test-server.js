/**
 * Script to kill the test server
 */
import fs from 'fs';

try {
  const pid = fs.readFileSync('.test-server.pid', 'utf8');
  if (pid) {
    console.log(`Killing process with PID ${pid}...`);
    process.kill(Number(pid), 'SIGTERM');
    console.log('Server stopped');
    fs.unlinkSync('.test-server.pid');
  } else {
    console.log('No server process found');
  }
} catch (error) {
  console.log('No server process found or error occurred:', error.message);
}