/**
 * Script to debug and fix the test account password issue
 */

import pg from 'pg';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const { Pool } = pg;
const scryptAsync = promisify(scrypt);

// This function matches the one in auth.ts
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

// This function attempts to parse and validate the stored password format
async function validatePasswordFormat(storedPassword) {
  console.log(`Checking password format: ${storedPassword}`);
  
  // Check if password contains a salt component (should have a dot)
  if (!storedPassword.includes('.')) {
    console.log('Invalid password format: No dot separator found');
    return false;
  }
  
  // Split and validate components
  const [hash, salt] = storedPassword.split('.');
  
  if (!hash || hash.length === 0) {
    console.log('Invalid password format: Empty hash component');
    return false;
  }
  
  if (!salt || salt.length === 0) {
    console.log('Invalid password format: Empty salt component');
    return false;
  }
  
  // Validate hash is valid hex
  const isValidHash = /^[0-9a-f]+$/i.test(hash);
  if (!isValidHash) {
    console.log('Invalid password format: Hash is not valid hex');
    return false;
  }
  
  // Validate salt is valid hex
  const isValidSalt = /^[0-9a-f]+$/i.test(salt);
  if (!isValidSalt) {
    console.log('Invalid password format: Salt is not valid hex');
    return false;
  }
  
  console.log('Password format appears valid');
  console.log(`Hash: ${hash} (${hash.length} chars)`);
  console.log(`Salt: ${salt} (${salt.length} chars)`);
  
  return true;
}

async function diagnoseThenFixTestAccount() {
  // Create a database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true
  });
  
  try {
    console.log('Starting test account password diagnosis...');
    
    // Find test user
    const userResult = await pool.query(
      `SELECT id, username, password FROM users WHERE username = 'test'`
    );
    
    if (userResult.rows.length === 0) {
      console.error('Test user not found!');
      return;
    }
    
    const testUserId = userResult.rows[0].id;
    const currentPassword = userResult.rows[0].password;
    
    console.log(`Found test user with ID: ${testUserId}`);
    console.log(`Current password: ${currentPassword}`);
    
    // Validate the current password format
    const isValid = await validatePasswordFormat(currentPassword);
    
    if (!isValid) {
      console.log('Current password format is invalid. Fixing...');
      
      // Hash the password 'test' using the correct format
      const hashedPassword = await hashPassword('test');
      
      console.log(`New password hash: ${hashedPassword}`);
      await validatePasswordFormat(hashedPassword);
      
      // Update the password
      await pool.query(
        `UPDATE users SET password = $1 WHERE id = $2`,
        [hashedPassword, testUserId]
      );
      
      console.log('Test account password has been fixed with proper format.');
    } else {
      console.log('Current password format looks valid. Creating a new password hash anyway...');
      
      // Hash the password 'test' using the correct format (just to be safe)
      const hashedPassword = await hashPassword('test');
      
      console.log(`New password hash: ${hashedPassword}`);
      await validatePasswordFormat(hashedPassword);
      
      // Update the password
      await pool.query(
        `UPDATE users SET password = $1 WHERE id = $2`,
        [hashedPassword, testUserId]
      );
      
      console.log('Test account password has been updated.');
    }
    
    console.log('You can now log in with:');
    console.log('  Username: test');
    console.log('  Password: test');
    
  } catch (error) {
    console.error('Error diagnosing/fixing test account password:', error);
  } finally {
    await pool.end();
    console.log('Database connection closed.');
  }
}

// Run the function
diagnoseThenFixTestAccount().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
