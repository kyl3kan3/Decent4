/**
 * Script to fix the test account password
 * The password should be 'test'
 */

import pg from 'pg';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const { Pool } = pg;
const scryptAsync = promisify(scrypt);

// Function to hash password correctly (matching the application's format)
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function fixTestAccountPassword() {
  // Create a database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true
  });
  
  try {
    console.log('Starting test account password fix...');
    
    // Find test user
    const userResult = await pool.query(
      `SELECT id, username FROM users WHERE username = 'test'`
    );
    
    if (userResult.rows.length === 0) {
      console.error('Test user not found!');
      return;
    }
    
    const testUserId = userResult.rows[0].id;
    console.log(`Found test user with ID: ${testUserId}`);
    
    // Hash the password 'test' using the correct format
    const hashedPassword = await hashPassword('test');
    
    // Update the password
    await pool.query(
      `UPDATE users SET password = $1 WHERE id = $2`,
      [hashedPassword, testUserId]
    );
    
    console.log('Test account password has been fixed.');
    console.log('You can now log in with:');
    console.log('  Username: test');
    console.log('  Password: test');
    
  } catch (error) {
    console.error('Error fixing test account password:', error);
  } finally {
    await pool.end();
    console.log('Database connection closed.');
  }
}

// Run the function
fixTestAccountPassword().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
