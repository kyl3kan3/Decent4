/**
 * Script to ensure admin onboarding is marked as complete
 * This script focuses only on setting the onboarding flag without modifying any other fields
 */

import pg from 'pg';
const { Pool } = pg;

async function ensureAdminOnboardingComplete() {
  // Create a dedicated pool for this operation
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true
  });
  
  try {
    console.log('Starting admin onboarding flag check...');
    
    // Check admin onboarding status first
    const statusResult = await pool.query(
      `SELECT id, username, onboarding_completed FROM users WHERE id = 1 OR username = 'admin'`
    );
    
    if (statusResult.rows.length === 0) {
      console.error('No admin users found.');
      return;
    }
    
    // Process each admin user
    for (const admin of statusResult.rows) {
      console.log(`Admin user ${admin.username} (ID: ${admin.id}) onboarding status: ${admin.onboarding_completed ? 'Complete' : 'Incomplete'}`);
      
      if (!admin.onboarding_completed) {
        // Update ONLY the onboarding_completed field
        await pool.query(
          `UPDATE users SET onboarding_completed = true WHERE id = $1`,
          [admin.id]
        );
        console.log(`Updated admin user ${admin.username} (ID: ${admin.id}) onboarding status to COMPLETE.`);
      } else {
        console.log(`Admin user ${admin.username} (ID: ${admin.id}) onboarding already marked as complete.`);
      }
    }
    
    console.log('Admin onboarding check completed successfully.');
  } catch (error) {
    console.error('Error updating admin onboarding status:', error);
  } finally {
    // Close the pool
    await pool.end();
    console.log('Database connection closed.');
  }
}

// Run the function
ensureAdminOnboardingComplete().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
