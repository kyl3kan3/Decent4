/**
 * Database Initialization Test Script
 * 
 * This script checks if the database initialization system is working correctly.
 * It tests the waitForDbInit() system to ensure database is available before any operations.
 */

// Using Node.js native functions to import ESM modules from TypeScript files
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function compileAndRunTest() {
  console.log('Compiling TypeScript files for testing...');
  
  try {
    // Use ts-node to run the test directly
    await execAsync('npx tsx server/db-test-helper.ts');
  } catch (error) {
    console.error('Error running test:', error);
    process.exit(1);
  }
}

// Run the test
compileAndRunTest();