/**
 * Simple DEV Script with Balanced Optimizations
 * 
 * This script runs the standard 'npm run dev' command
 * with balanced environment settings that won't crash the app.
 */

import { spawn } from 'child_process';

console.log('='.repeat(80));
console.log(' Health App - Starting with Balanced Performance Settings');
console.log('-'.repeat(80));

// Create environment with balanced optimization settings
const env = {
  ...process.env,
  VITE_ENABLE_PERFORMANCE_OPTIMIZATIONS: 'true',
  VITE_REDUCE_ANIMATIONS: 'true',
  VITE_OPTIMIZED_IMAGES: 'true', 
  VITE_REPLIT_OPTIMIZED: 'true',
  VITE_EXTREME_PERFORMANCE: 'false',
  DISABLE_VERBOSE_LOGGING: 'true'
};

console.log('Starting with these performance settings:');
console.log('✓ Performance optimizations: ENABLED');
console.log('✓ Animation reduction: ENABLED');
console.log('✓ Image optimization: ENABLED');
console.log('✓ Replit optimizations: ENABLED');
console.log('✓ Extreme performance mode: DISABLED (for stability)');

// Start the dev command with optimized settings
console.log('\nStarting the application...');
const child = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  env
});

// Handle process termination
child.on('exit', (code) => {
  console.log(`\nApplication exited with code ${code}`);
  process.exit(code);
});

// Forward termination signals
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
