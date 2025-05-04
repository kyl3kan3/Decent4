/**
 * Script to fix the admin user configuration
 */

// Import required modules using CommonJS syntax
require('dotenv').config();

async function importDatabaseModules() {
  try {
    // Use direct database connection with PostgreSQL
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    console.log('Database URL:', process.env.DATABASE_URL);
    
    return { pool };
  } catch (error) {
    console.error('Error importing database modules:', error);
    throw error;
  }
}

async function fixAdminUser() {
  console.log('Fixing admin user...');
  
  try {
    // Initialize database connection
    const { pool } = await importDatabaseModules();
    
    // First check the column names in the users table
    console.log('Checking database schema...');
    const tableInfoResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Users table columns:');
    tableInfoResult.rows.forEach(column => {
      console.log(`- ${column.column_name} (${column.data_type})`);
    });
    
    // Try to find columns that match what we need
    const onboardingCol = tableInfoResult.rows.find(col => 
      col.column_name.toLowerCase().includes('onboarding')
    );
    
    const subscriptionCol = tableInfoResult.rows.find(col => 
      col.column_name.toLowerCase().includes('subscription') || 
      col.column_name.toLowerCase().includes('tier')
    );
    
    if (onboardingCol && subscriptionCol) {
      console.log(`\nFound columns: ${onboardingCol.column_name}, ${subscriptionCol.column_name}`);
      
      // Update the admin user with correct values using the column names we found
      const updateQuery = `
        UPDATE "users" 
        SET "${onboardingCol.column_name}" = true, 
            "${subscriptionCol.column_name}" = $1 
        WHERE username = $2 
        RETURNING *
      `;
      
      const updateResult = await pool.query(updateQuery, ['professional', 'admin']);
      
      if (updateResult.rows.length > 0) {
        const updatedAdmin = updateResult.rows[0];
        console.log('Admin user updated successfully:');
        console.log(`ID: ${updatedAdmin.id}`);
        console.log(`Username: ${updatedAdmin.username}`);
        console.log(`${onboardingCol.column_name}: ${updatedAdmin[onboardingCol.column_name]}`);
        console.log(`${subscriptionCol.column_name}: ${updatedAdmin[subscriptionCol.column_name]}`);
      } else {
        console.log('No admin user was updated');
      }
    } else {
      console.log('Could not find the necessary columns to update');
    }
    
    // Close pool when done
    await pool.end();
  } catch (error) {
    console.error('Error fixing admin user:', error);
  }
}

// Run the function
fixAdminUser().then(() => {
  console.log('Fix completed');
  process.exit(0);
}).catch(error => {
  console.error('Fix failed:', error);
  process.exit(1);
});