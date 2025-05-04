
// Direct database reset script that bypasses application abstractions
const { Pool } = require('pg');

async function resetAdminOnboardingDirect() {
  try {
    console.log('==== DIRECT ADMIN RESET SCRIPT ====');
    console.log('Establishing database connection...');
    
    // Create a direct database connection
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? true : false
    });
    
    // First, check if we can find the admin user
    const checkResult = await pool.query(
      'SELECT * FROM "users" WHERE "id" = 1 OR "username" = $1 OR "role" = $2',
      ['admin', 'admin']
    );
    
    if (checkResult.rows.length === 0) {
      console.log('ERROR: No admin user found in the database!');
      await pool.end();
      return;
    }
    
    // Log the current state before update
    console.log('Current admin user state:');
    console.log(checkResult.rows.map(row => ({
      id: row.id,
      username: row.username,
      onboarding_completed: row.onboarding_completed,
      column_names: Object.keys(row)
    })));
    
    // Update the admin user with explicit snake_case column naming
    console.log('Executing direct database update...');
    const updateResult = await pool.query(
      'UPDATE "users" SET "onboarding_completed" = false WHERE "id" = 1 OR "username" = $1 OR "role" = $2 RETURNING *',
      ['admin', 'admin']
    );
    
    // Verify the update was successful
    if (updateResult.rowCount > 0) {
      console.log('SUCCESS! Admin onboarding reset completed.');
      console.log('Updated admin user data:');
      console.log(updateResult.rows.map(row => ({
        id: row.id,
        username: row.username,
        onboarding_completed: row.onboarding_completed
      })));
    } else {
      console.log('WARNING: Update query completed but no rows were affected!');
    }
    
    // Double-check after update
    const verifyResult = await pool.query(
      'SELECT * FROM "users" WHERE "id" = 1 OR "username" = $1 OR "role" = $2',
      ['admin', 'admin']
    );
    
    console.log('Verification after update:');
    console.log(verifyResult.rows.map(row => ({
      id: row.id,
      username: row.username,
      onboarding_completed: row.onboarding_completed
    })));
    
    await pool.end();
    console.log('==== RESET OPERATION COMPLETED ====');
  } catch (error) {
    console.error('CRITICAL ERROR during admin reset:', error.message);
    console.error('Error details:', error);
  }
}

resetAdminOnboardingDirect();
