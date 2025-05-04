
/**
 * Force Admin Onboarding Completion Script
 * 
 * This script directly forces the admin user's onboarding to be marked as complete
 * and ensures they have the necessary health metrics data populated.
 */

import { db } from './server/db.js';
import { v4 as uuidv4 } from 'uuid';

async function forceAdminOnboardingCompletion() {
  try {
    console.log('Starting admin onboarding completion process...');
    
    // Find admin user(s) - only search by ID and username to avoid role-based error
    const adminUsersResult = await db.query(
      `SELECT id, username FROM users 
       WHERE id = 1 OR username = 'admin'`
    );
    
    if (adminUsersResult.rows.length === 0) {
      console.error('No admin users found.');
      return;
    }
    
    console.log(`Found ${adminUsersResult.rows.length} admin user(s).`);
    
    // Process each admin user
    for (const adminUser of adminUsersResult.rows) {
      console.log(`\nProcessing admin user ${adminUser.username} (ID: ${adminUser.id})...`);
      
      // 1. Force onboarding completion - make sure we don't modify other columns that might have triggers or validations
      await db.query(
        `UPDATE users SET onboarding_completed = true WHERE id = $1`,
        [adminUser.id]
      );
      console.log(`Forced admin user ${adminUser.username} onboarding status to COMPLETE.`);
      
      // 2. Verify/create questionnaire data
      const questionnaireResult = await db.query(
        `SELECT id FROM questionnaires WHERE user_id = $1`,
        [adminUser.id]
      );
      
      if (questionnaireResult.rows.length === 0) {
        // Create default questionnaire
        const questionnaireId = uuidv4();
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
        console.log(`Admin user already has questionnaire data.`);
      }
      
      // 3. Check and create essential health metrics
      const essentialMetrics = [
        {
          type: 'Weight',
          value: '70',
          unit: 'kg',
          icon: 'ri-scales-2-line',
          progress: 75
        },
        {
          type: 'Sleep Duration',
          value: '7.5',
          unit: 'hr',
          icon: 'ri-zzz-line',
          progress: 80
        },
        {
          type: 'Stress Level',
          value: '3',
          unit: 'score',
          icon: 'ri-mental-health-line',
          progress: 70
        },
        {
          type: 'Exercise Frequency',
          value: '3',
          unit: 'days/week',
          icon: 'ri-run-line',
          progress: 65
        },
        {
          type: 'Heart Rate',
          value: '72',
          unit: 'bpm',
          icon: 'ri-heart-pulse-line',
          progress: 80
        },
        {
          type: 'Blood Pressure',
          value: '120/80',
          unit: 'mmHg',
          icon: 'ri-heart-add-line',
          progress: 85
        },
        {
          type: 'Water Intake',
          value: '2.5',
          unit: 'L',
          icon: 'ri-drop-line',
          progress: 70
        }
      ];
      
      // Get existing metrics
      const existingMetricsResult = await db.query(
        `SELECT type FROM health_metrics WHERE user_id = $1`,
        [adminUser.id]
      );
      
      const existingTypes = existingMetricsResult.rows.map(row => row.type.toLowerCase());
      
      // Add missing metrics
      let metricsAdded = 0;
      
      for (const metric of essentialMetrics) {
        if (!existingTypes.includes(metric.type.toLowerCase())) {
          await db.query(
            `INSERT INTO health_metrics (id, user_id, type, value, unit, icon, progress, date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              uuidv4(),
              adminUser.id,
              metric.type,
              metric.value,
              metric.unit,
              metric.icon,
              metric.progress,
              new Date().toISOString()
            ]
          );
          
          metricsAdded++;
          console.log(`Added ${metric.type} metric for admin user.`);
        }
      }
      
      console.log(`Added ${metricsAdded} missing health metrics for admin user.`);
      console.log(`Admin user ${adminUser.username} onboarding has been successfully forced complete!`);
    }
    
    console.log('\nAdmin onboarding completion process finished successfully!');
    
  } catch (error) {
    console.error('Error in forcing admin onboarding completion:', error);
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
forceAdminOnboardingCompletion().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
