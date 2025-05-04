/**
 * Simple script to kill any process running on port 5001
 */

import { execSync } from 'child_process';

try {
  // Find the PID of the process running on port 5001
  const findPID = `lsof -i :5001 -t`;
  const pid = execSync(findPID).toString().trim();
  
  if (pid) {
    console.log(`Found process running on port 5001 with PID: ${pid}`);
    
    // Kill the process
    execSync(`kill -9 ${pid}`);
    console.log(`Successfully killed process with PID: ${pid}`);
  } else {
    console.log('No process found running on port 5001');
  }
} catch (error) {
  console.error('Error occurred:', error.message);
}