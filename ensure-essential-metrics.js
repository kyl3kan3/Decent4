/**
 * Ensure Essential Health Metrics Script
 * 
 * This script ensures all users have the essential health metrics required for their
 * health profile to be marked as complete. It is designed to be run as a maintenance
 * script or during application startup to prevent incomplete health profiles.
 * 
 * The script will check for the following essential metrics:
 *  - sleep-duration
 *  - stress-level
 *  - exercise-frequency
 *  - weight
 * 
 * If any of these are missing for a user that has completed onboarding and has a
 * questionnaire, the script will add default values to ensure the health profile
 * is complete.
 */
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

/**
 * Main function to ensure all users have essential health metrics
 */
async function ensureEssentialMetrics() {
  console.log('Ensuring all users have essential health metrics...');
  
  // Connect to database
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Get all users who have completed onboarding and have a questionnaire
    const usersResult = await pool.query(`
      SELECT u.id, u.username
      FROM users u
      JOIN questionnaires q ON u.id = q.user_id
      WHERE u.onboarding_completed = true
      ORDER BY u.id
    `);
    
    console.log(`Found ${usersResult.rows.length} users with completed profiles to check`);
    
    // Process each user
    let updatedCount = 0;
    
    for (const user of usersResult.rows) {
      const { id: userId, username } = user;
      const result = await processUser(pool, userId, username);
      
      if (result.addedMetrics > 0) {
        updatedCount++;
      }
    }
    
    console.log(`\nSummary: Added missing essential metrics for ${updatedCount} users`);
    
  } catch (error) {
    console.error('Error ensuring essential metrics:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

/**
 * Process a single user to ensure they have all essential metrics
 */
async function processUser(pool, userId, username) {
  console.log(`\nProcessing user ${username} (ID: ${userId})...`);
  
  // Define essential metrics
  const essentialMetrics = [
    {
      type: 'sleep-duration',
      defaultValue: '7.5',
      unit: 'hours',
      icon: 'sleep',
      progress: 75,
      trend: 'stable',
      goal: '8'
    },
    {
      type: 'stress-level',
      defaultValue: '4',
      unit: 'scale',
      icon: 'stress',
      progress: 60,
      trend: 'improving',
      goal: '3'
    },
    {
      type: 'exercise-frequency',
      defaultValue: '3',
      unit: 'days/week',
      icon: 'exercise',
      progress: 60,
      trend: 'stable',
      goal: '5'
    },
    {
      type: 'weight',
      defaultValue: '70',
      unit: 'kg',
      icon: 'weight',
      progress: 90,
      trend: 'stable',
      goal: '68'
    }
  ];
  
  // Check which metrics already exist
  const existingResult = await pool.query(
    `SELECT type FROM health_metrics WHERE user_id = $1 AND type = ANY($2)`,
    [userId, essentialMetrics.map(m => m.type)]
  );
  
  const existingMetrics = new Set(existingResult.rows.map(row => row.type));
  
  // Find missing metrics
  const missingMetrics = essentialMetrics.filter(m => !existingMetrics.has(m.type));
  
  if (missingMetrics.length === 0) {
    console.log(`✅ User ${username} has all essential metrics`);
    return { userId, username, addedMetrics: 0 };
  }
  
  console.log(`Found ${missingMetrics.length} missing metrics for user ${username}:`);
  missingMetrics.forEach(m => console.log(`- ${m.type}`));
  
  // Add missing metrics
  const timestamp = new Date().toISOString();
  
  for (const metric of missingMetrics) {
    await pool.query(
      `INSERT INTO health_metrics 
       (id, user_id, type, value, unit, date, icon, progress, trend, goal)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        uuidv4(),
        userId, 
        metric.type, 
        metric.defaultValue,
        metric.unit,
        timestamp,
        metric.icon,
        metric.progress,
        metric.trend,
        metric.goal
      ]
    );
    
    console.log(`Added ${metric.type} = ${metric.defaultValue} ${metric.unit}`);
  }
  
  return { userId, username, addedMetrics: missingMetrics.length };
}

// Run the function
ensureEssentialMetrics().catch(console.error);