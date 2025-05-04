/**
 * Script to check database connectivity and initialization
 */

import pg from 'pg';
const { Pool } = pg;

async function checkDatabaseConnection() {
  console.log('Starting database connection check...');
  
  // Create a dedicated connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
    max: 1, // Just one connection for testing
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000
  });

  try {
    console.log('Connecting to database...');
    
    // Try to connect and run a simple query
    const client = await pool.connect();
    console.log('Successfully connected to the database');
    
    // Check PostgreSQL version
    const versionResult = await client.query('SELECT version()');
    console.log('PostgreSQL version:', versionResult.rows[0].version);
    
    // Check if users table exists and get count
    const userCountResult = await client.query('SELECT COUNT(*) FROM users');
    console.log(`Users table exists with ${userCountResult.rows[0].count} rows`);
    
    // Check test user
    const testUserResult = await client.query('SELECT id, username, onboarding_completed FROM users WHERE username = \'test\'');
    if (testUserResult.rows.length > 0) {
      const testUser = testUserResult.rows[0];
      console.log(`Test user exists with ID: ${testUser.id}`);
      console.log(`Test user onboarding status: ${testUser.onboarding_completed ? 'Completed' : 'Not completed'}`);
      
      // Check for health metrics
      const metricsResult = await client.query('SELECT COUNT(*) FROM health_metrics WHERE user_id = $1', [testUser.id]);
      console.log(`Test user has ${metricsResult.rows[0].count} health metrics`); 
    } else {
      console.log('Test user not found');
    }
    
    // Release the client back to the pool
    client.release();
    console.log('Database client released');
    
  } catch (error) {
    console.error('Database connection error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    // Close the pool
    await pool.end();
    console.log('Connection pool closed');
  }
}

// Run the function
checkDatabaseConnection().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
