/**
 * Script to initialize health metrics for admin users
 * This ensures admin users have essential health metrics for demonstration purposes
 */

import { db } from './server/db.js';
import { v4 as uuidv4 } from 'uuid';

async function initializeAdminHealthMetrics() {
  try {
    console.log('Starting admin health metrics initialization...');
    
    // Find admin user(s) - search by ID and username only to avoid role-related triggers
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
      
      // Essential health metrics that every user should have
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
      console.log(`Found ${existingTypes.length} existing metrics.`);
      
      // Add missing metrics
      let metricsAdded = 0;
      
      for (const metric of essentialMetrics) {
        if (!existingTypes.includes(metric.type.toLowerCase())) {
          try {
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
          } catch (insertError) {
            console.error(`Error adding ${metric.type} metric:`, insertError.message);
          }
        } else {
          console.log(`Metric ${metric.type} already exists for admin user.`);
        }
      }
      
      console.log(`Added ${metricsAdded} missing health metrics for admin user.`);
    }
    
    console.log('\nAdmin health metrics initialization finished successfully!');
    
  } catch (error) {
    console.error('Error in initializing admin health metrics:', error);
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
initializeAdminHealthMetrics().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
