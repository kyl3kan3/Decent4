/**
 * Simple script to restart the assets server
 */
import fs from 'fs';

// Kill any running server
try {
  if (fs.existsSync('.static-ready')) {
    fs.unlinkSync('.static-ready');
    console.log('Removed .static-ready file');
  }
  
  if (fs.existsSync('.starting-static')) {
    fs.unlinkSync('.starting-static');
    console.log('Removed .starting-static file');
  }
} catch (err) {
  console.error('Error cleaning up signals:', err);
}

// Execute the start script
console.log('Restarting assets server...');
import('./start-assets.js').catch(err => {
  console.error('Failed to restart assets server:', err);
});