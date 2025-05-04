
// Complete admin reset script - removes ALL health data and forces re-onboarding
const { Pool } = require('pg');
require('dotenv').config();

async function completeAdminReset() {
  console.log('==== COMPLETE ADMIN PROFILE RESET ====');
  
  let pool;
  try {
    // Create database connection
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? true : false
    });
    
    // Start a transaction to ensure all operations are atomic
    await pool.query('BEGIN');
    
    // 1. Find the admin user(s)
    const usersResult = await pool.query(
      'SELECT * FROM "users" WHERE "id" = 1 OR "username" = $1 OR "role" = $2',
      ['admin', 'admin']
    );
    
    if (usersResult.rows.length === 0) {
      console.log('No admin user found in database.');
      await pool.query('ROLLBACK');
      return;
    }
    
    console.log(`Found ${usersResult.rows.length} admin user(s).`);
    
    // Get the admin user ID(s)
    const adminIds = usersResult.rows.map(user => user.id);
    console.log('Admin user IDs:', adminIds);
    
    // 2. Reset onboarding_completed flag for admin users
    const updateUserResult = await pool.query(
      'UPDATE "users" SET "onboarding_completed" = false WHERE id = ANY($1) RETURNING *',
      [adminIds]
    );
    
    console.log(`Updated ${updateUserResult.rowCount} admin user records to set onboarding_completed = false`);
    
    // 3. Delete questionnaire data for admin users - COMPLETE delete
    const deleteQuestionnaireResult = await pool.query(
      'DELETE FROM "questionnaires" WHERE "user_id" = ANY($1) RETURNING id',
      [adminIds]
    );
    
    console.log(`Deleted ${deleteQuestionnaireResult.rowCount} questionnaire records.`);
    
    // 4. Delete ALL health metrics for admin users (not just essential ones)
    const deleteAllMetricsResult = await pool.query(
      'DELETE FROM "health_metrics" WHERE "user_id" = ANY($1) RETURNING id',
      [adminIds]
    );
    
    console.log(`Deleted ${deleteAllMetricsResult.rowCount} health metrics records.`);
    
    // 5. Reset profile completion status if it exists
    try {
      const resetProfileResult = await pool.query(
        'UPDATE "profile_completions" SET "completed" = false WHERE "user_id" = ANY($1) RETURNING id',
        [adminIds]
      );
      console.log(`Reset ${resetProfileResult.rowCount} profile completion records.`);
    } catch (err) {
      // Table might not exist, which is fine
      console.log('Note: No profile_completions table found (this is normal).');
    }
    
    // 6. Delete any journal entries
    try {
      const deleteJournalResult = await pool.query(
        'DELETE FROM "journal_entries" WHERE "user_id" = ANY($1) RETURNING id',
        [adminIds]
      );
      console.log(`Deleted ${deleteJournalResult.rowCount} journal entries.`);
    } catch (err) {
      console.log('No journal entries found or error deleting them:', err.message);
    }
    
    // 7. Verify that the onboarding flag is definitely set to false
    const verifyResult = await pool.query(
      'SELECT id, username, onboarding_completed FROM "users" WHERE id = ANY($1)',
      [adminIds]
    );
    
    console.log('Verification after reset:');
    verifyResult.rows.forEach(user => {
      console.log(`User ${user.username} (ID: ${user.id}): onboarding_completed = ${user.onboarding_completed}`);
    });
    
    // Commit all changes
    await pool.query('COMMIT');
    
    console.log('====== RESET COMPLETED SUCCESSFULLY ======');
    console.log('The admin profile has been completely reset.');
    console.log('All health metrics and questionnaire data have been deleted.');
    console.log('Please log out and log back in for changes to take effect.');
    
  } catch (error) {
    // Roll back any changes if there was an error
    if (pool) {
      await pool.query('ROLLBACK');
    }
    console.error('ERROR during reset:', error.message);
    console.error('Full error details:', error);
  } finally {
    // Close the database connection
    if (pool) {
      await pool.end();
    }
  }
}

// Execute the reset function
completeAdminReset();
