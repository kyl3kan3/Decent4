
// Direct database reset for admin onboarding
const { Pool } = require('pg');

async function directResetAdminOnboarding() {
  try {
    console.log('Attempting direct database reset of admin onboarding status...');
    
    // Create a database connection
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? true : false
    });
    
    console.log('Database connection established, executing update...');
    
    // Update the admin user using the snake_case column name as used in the database
    // This is important as the JavaScript camelCase field name maps to snake_case in PostgreSQL
    const result = await pool.query(
      'UPDATE "users" SET "onboarding_completed" = false WHERE "id" = 1 OR "username" = $1 OR "role" = $2 RETURNING *',
      ['admin', 'admin']
    );
    
    await pool.end();
    
    if (result.rowCount > 0) {
      console.log('Success! Admin onboarding has been directly reset in the database.');
      console.log('Updated users:', result.rows.map(row => ({ 
        id: row.id, 
        username: row.username,
        onboarding_completed: row.onboarding_completed 
      })));
    } else {
      console.log('No admin users found to update. Verify that an admin user exists with ID 1, username "admin", or role "admin".');
      console.log('If the issue persists, try checking the database schema to confirm column naming.');
    }
  } catch (error) {
    console.error('Database error during admin reset:', error.message);
    console.error('Full error details:', error);
  }
}

directResetAdminOnboarding();
