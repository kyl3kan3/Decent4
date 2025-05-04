/**
 * Simple application runner
 * This script starts the frontend application directly with npm
 */

import { exec } from 'child_process';
import colors from 'colors';

console.log(colors.cyan('Starting frontend application directly...'));

// Run the client application directly
const clientProcess = exec('cd client && npm run dev', {
  env: {
    ...process.env,
    PORT: 5173,
    VITE_DEV_SERVER_PORT: 5173
  }
});

// Handle output
clientProcess.stdout.on('data', (data) => {
  console.log(colors.green('[Frontend] ') + data);
});

clientProcess.stderr.on('data', (data) => {
  console.error(colors.yellow('[Frontend Error] ') + data);
});

// Handle process exit
clientProcess.on('exit', (code) => {
  if (code !== 0) {
    console.log(colors.red(`Frontend process exited with code ${code}`));
  }
});

console.log(colors.green('Frontend development server starting...'));