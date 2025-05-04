
/**
 * Health App Deployment Runner
 * This script automatically finds and starts the correct server file
 */

// Set production environment
process.env.NODE_ENV = 'production';
process.env.PORT = '5001';

console.log('Starting Health App deployment runner...');

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define server options in order of preference
const serverOptions = [
  { path: './dist/server/index.js', type: 'compiled' },
  { path: './server/index.js', type: 'source' },
  { path: './optimized-server.cjs', type: 'optimized' },
  { path: './start.sh', type: 'script', isScript: true },
  { path: './server.js', type: 'default' }
];

// Find the first available server option
let selectedOption = null;
for (const option of serverOptions) {
  if (fs.existsSync(path.join(process.cwd(), option.path))) {
    selectedOption = option;
    break;
  }
}

if (!selectedOption) {
  console.error('No suitable server file found. Deployment cannot start.');
  process.exit(1);
}

console.log(`Starting server with ${selectedOption.type} option: ${selectedOption.path}`);

// Create signal files
fs.writeFileSync('.starting', '');

// Start the server
if (selectedOption.isScript) {
  const server = spawn('bash', [selectedOption.path], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '5001'
    }
  });
  
  server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
} else {
  const server = spawn('node', [selectedOption.path], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '5001'
    }
  });
  
  server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
}
