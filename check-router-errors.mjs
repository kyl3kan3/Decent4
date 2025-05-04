/**
 * Script to check for router errors in the server logs
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function checkForRouterErrors() {
  console.log('Starting server and checking for router errors...');
  
  const serverProcess = spawn('node', ['run-persistent-vitalgradient.js'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  let hasRouterError = false;
  let foundServerStartMessage = false;
  
  // Listen for server output
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);
    
    if (output.includes('Server running') || output.includes('listening on port')) {
      foundServerStartMessage = true;
    }
    
    if (output.includes('useNavigate() may be used only in the context of a <Router> component')) {
      hasRouterError = true;
      console.log('\n\nFOUND ROUTER ERROR in server output!');
    }
  });
  
  serverProcess.stderr.on('data', (data) => {
    const output = data.toString();
    process.stderr.write(output);
    
    if (output.includes('useNavigate() may be used only in the context of a <Router> component')) {
      hasRouterError = true;
      console.log('\n\nFOUND ROUTER ERROR in error output!');
    }
  });
  
  // Wait for the server to start or timeout
  await setTimeout(5000);
  
  // Cleanup and report results
  serverProcess.kill();
  
  console.log('\n--- Router Error Check Results ---');
  console.log(`Server started: ${foundServerStartMessage ? 'Yes' : 'No'}`);
  console.log(`Router errors found: ${hasRouterError ? 'Yes' : 'No'}`);
  
  if (hasRouterError) {
    console.log('\nRouting issues are still present. Continue fixing react-router-dom imports.');
    process.exit(1);
  } else {
    console.log('\nNo routing errors detected! Your fixes appear to be working.');
    process.exit(0);
  }
}

checkForRouterErrors().catch(err => {
  console.error('Error running the check:', err);
  process.exit(1);
});