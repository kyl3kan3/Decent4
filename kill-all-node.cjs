/**
 * Script to kill all running Node.js processes
 * Useful for cleaning up test servers
 */

const { exec } = require('child_process');

console.log('Finding and killing all Node.js processes...');

exec('pgrep -f "node " | xargs kill -9', (error, stdout, stderr) => {
  if (error) {
    console.log('No Node.js processes found to kill');
    return;
  }
  
  if (stderr) {
    console.error(`Error: ${stderr}`);
    return;
  }
  
  console.log('All Node.js processes terminated successfully');
});