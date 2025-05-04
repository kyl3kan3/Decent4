/**
 * Script to clear all data for the test account while preserving the account itself
 * This allows for testing the data input process from scratch
 */

import pg from 'pg';
const { Pool } = pg;

async function clearTestAccountData() {
  // Create a dedicated pool for this operation
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true
  });
  
  try {
    console.log('Starting test account data clearing process...');
    
    // Find test user ID
    const userCheck = await pool.query(
      `SELECT id, username FROM users WHERE username = 'test'`
    );
    
    if (userCheck.rows.length === 0) {
      console.error('Test user not found. Please create the test account first.');
      return;
    }
    
    const testUserId = userCheck.rows[0].id;
    console.log(`Found test user with ID: ${testUserId}`);
    
    // Clear all health metrics
    console.log('Clearing health metrics...');
    const metricsResult = await pool.query(
      `DELETE FROM health_metrics WHERE user_id = $1 RETURNING id`,
      [testUserId]
    );
    console.log(`Deleted ${metricsResult.rowCount} health metrics.`);
    
    // Clear all bloodwork results
    console.log('Clearing bloodwork results...');
    const bloodworkResult = await pool.query(
      `DELETE FROM bloodwork_results WHERE user_id = $1 RETURNING id`,
      [testUserId]
    );
    console.log(`Deleted ${bloodworkResult.rowCount} bloodwork results.`);
    
    // Clear all supplements
    console.log('Clearing supplements...');
    const supplementsResult = await pool.query(
      `DELETE FROM supplements WHERE user_id = $1 RETURNING id`,
      [testUserId]
    );
    console.log(`Deleted ${supplementsResult.rowCount} supplements.`);
    
    // Clear questionnaire data
    console.log('Clearing questionnaire data...');
    const questionnaireResult = await pool.query(
      `DELETE FROM questionnaires WHERE user_id = $1 RETURNING id`,
      [testUserId]
    );
    console.log(`Deleted ${questionnaireResult.rowCount} questionnaire entries.`);
    
    // Set onboarding_completed to false
    console.log('Resetting onboarding status...');
    await pool.query(
      `UPDATE users SET onboarding_completed = false WHERE id = $1`,
      [testUserId]
    );
    console.log('Reset onboarding status to false.');
    
    console.log('\nTest account data cleared successfully!');
    console.log('You can now log in with the test account and test the data input process.');
    console.log('Login credentials:');
    console.log('  Username: test');
    console.log('  Password: test');
    
  } catch (error) {
    console.error('Error clearing test account data:', error);
  } finally {
    // Close the pool
    await pool.end();
    console.log('Database connection closed.');
  }
}

// Run the function
clearTestAccountData().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
