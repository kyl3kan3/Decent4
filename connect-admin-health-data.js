
/**
 * Connect Admin Health Data Script
 * 
 * This script repairs the connection between admin user data, onboarding status,
 * health metrics, and questionnaire data to ensure proper display in all sections.
 */

import { db } from './server/db.js';
import { v4 as uuidv4 } from 'uuid';

async function connectAdminHealthData() {
  try {
    console.log('Starting admin health data connection process...');
    
    // Find admin user(s)
    const adminUsersResult = await db.query(
      `SELECT id, username, email, onboarding_completed FROM users 
       WHERE id = 1 OR username = 'admin' OR role = 'admin'`
    );
    
    if (adminUsersResult.rows.length === 0) {
      console.error('No admin users found.');
      return;
    }
    
    console.log(`Found ${adminUsersResult.rows.length} admin user(s).`);
    
    // Process each admin user
    for (const adminUser of adminUsersResult.rows) {
      console.log(`\nProcessing admin user ${adminUser.username} (ID: ${adminUser.id})...`);
      
      // 1. Force onboarding completion status
      if (!adminUser.onboarding_completed) {
        await db.query(
          `UPDATE users SET onboarding_completed = true WHERE id = $1`,
          [adminUser.id]
        );
        console.log(`Force-completed onboarding for admin user ${adminUser.username}`);
      } else {
        console.log(`Admin user ${adminUser.username} already has onboarding marked as complete.`);
      }
      
      // 2. Check if questionnaire exists
      const questionnaireResult = await db.query(
        `SELECT id FROM questionnaires WHERE user_id = $1`,
        [adminUser.id]
      );
      
      let questionnaireId = null;
      
      if (questionnaireResult.rows.length === 0) {
        // Create default questionnaire with UUID for ID
        questionnaireId = uuidv4();
        
        await db.query(
          `INSERT INTO questionnaires 
           (id, user_id, age, gender, height, weight, height_unit, weight_unit,
            activity_level, sleep_quality, diet_type, health_goals, date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            questionnaireId,
            adminUser.id,
            35, // Default age
            'Not specified', // Default gender
            175, // Default height
            70, // Default weight
            'cm', // Default height unit
            'kg', // Default weight unit
            'Moderate', // Default activity level
            'Good', // Default sleep quality
            'Balanced', // Default diet type
            JSON.stringify(['General wellness', 'Better sleep']), // Default health goals
            new Date().toISOString() // Current date
          ]
        );
        console.log(`Created default questionnaire for admin user.`);
      } else {
        questionnaireId = questionnaireResult.rows[0].id;
        console.log(`Admin user already has questionnaire data with ID: ${questionnaireId}`);
      }
      
      // 3. Check and create essential health metrics with standardized types
      const essentialMetrics = [
        {
          type: 'Weight',
          value: '70',
          unit: 'kg',
          icon: 'ri-scales-2-line',
          progress: 75,
          goal: '65-75'
        },
        {
          type: 'Sleep Duration',
          value: '7.5',
          unit: 'hr',
          icon: 'ri-zzz-line',
          progress: 80,
          goal: '7-9'
        },
        {
          type: 'Stress Level',
          value: '3',
          unit: 'score',
          icon: 'ri-mental-health-line',
          progress: 70,
          goal: '2-4'
        },
        {
          type: 'Exercise Frequency',
          value: '3',
          unit: 'days/week',
          icon: 'ri-run-line',
          progress: 65,
          goal: '3-5'
        },
        {
          type: 'Heart Rate',
          value: '72',
          unit: 'bpm',
          icon: 'ri-heart-pulse-line',
          progress: 80,
          goal: '60-100'
        },
        {
          type: 'Water Intake',
          value: '2.5',
          unit: 'L',
          icon: 'ri-drop-line',
          progress: 70,
          goal: '2-3'
        }
      ];
      
      // Get existing metrics - case insensitive comparison
      const existingMetricsResult = await db.query(
        `SELECT id, type, lower(type) as type_lower FROM health_metrics WHERE user_id = $1`,
        [adminUser.id]
      );
      
      console.log(`Found ${existingMetricsResult.rows.length} existing health metrics for admin.`);
      
      // Create a map of existing metrics by lowercase type
      const existingMetricsByType = {};
      existingMetricsResult.rows.forEach(metric => {
        existingMetricsByType[metric.type_lower] = metric;
      });
      
      let metricsAdded = 0;
      let metricsUpdated = 0;
      
      // Add missing essential metrics
      for (const metric of essentialMetrics) {
        const metricTypeLower = metric.type.toLowerCase();
        
        if (!existingMetricsByType[metricTypeLower]) {
          // Create new metric
          await db.query(
            `INSERT INTO health_metrics (id, user_id, type, value, unit, icon, progress, goal, date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              uuidv4(),
              adminUser.id,
              metric.type, // Use the correct case for the type
              metric.value,
              metric.unit,
              metric.icon,
              metric.progress,
              metric.goal,
              new Date().toISOString()
            ]
          );
          
          metricsAdded++;
          console.log(`Added missing essential metric: ${metric.type}`);
        } else {
          // Update existing metric to ensure proper case and values
          const existingMetric = existingMetricsByType[metricTypeLower];
          
          await db.query(
            `UPDATE health_metrics 
             SET type = $1, value = $2, unit = $3, icon = $4, progress = $5, goal = $6
             WHERE id = $7`,
            [
              metric.type, // Ensure proper capitalization
              metric.value,
              metric.unit,
              metric.icon,
              metric.progress,
              metric.goal,
              existingMetric.id
            ]
          );
          
          metricsUpdated++;
          console.log(`Updated existing metric: ${metric.type}`);
        }
      }
      
      // 4. Verify profile completion status
      await db.query(
        `UPDATE users 
         SET profile_completed = true, health_profile_completed = true 
         WHERE id = $1`,
        [adminUser.id]
      );
      
      console.log(`\nSummary for admin user ${adminUser.username}:`);
      console.log(`- Ensured onboarding is marked as complete`);
      console.log(`- Ensured questionnaire data exists`);
      console.log(`- Added ${metricsAdded} new health metrics`);
      console.log(`- Updated ${metricsUpdated} existing health metrics`);
      console.log(`- Set profile_completed and health_profile_completed to true`);
    }
    
    console.log('\nAdmin health data connection process completed successfully!');
    
  } catch (error) {
    console.error('Error connecting admin health data:', error);
  } finally {
    // Close the database connection
    try {
      await db.end();
      console.log('Database connection closed.');
    } catch (err) {
      console.error('Error closing database connection:', err);
    }
  }
}

// Run the function
connectAdminHealthData().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
