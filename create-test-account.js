/**
 * Script to create a test account with username 'test' and password 'test'
 * This account will have completed onboarding and health metrics for testing
 */

import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const { Pool } = pg;
const scryptAsync = promisify(scrypt);

// Utility function to hash password
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64);
  return salt + ':' + derivedKey.toString('hex');
}

async function createTestAccount() {
  // Create a dedicated pool for this operation
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true
  });
  
  try {
    console.log('Starting test account creation...');
    
    // Check if test user already exists
    const userCheck = await pool.query(
      `SELECT id, username FROM users WHERE username = 'test'`
    );
    
    let testUserId;
    
    if (userCheck.rows.length > 0) {
      console.log(`Test user already exists with ID: ${userCheck.rows[0].id}`);
      testUserId = userCheck.rows[0].id;
    } else {
      // Create test user
      const hashedPassword = await hashPassword('test');
      
      const userResult = await pool.query(
        `INSERT INTO users (username, password, email, role, onboarding_completed, subscription_tier, theme, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          'test',             // username
          hashedPassword,      // password
          'test@example.com',  // email
          'user',              // role
          true,                // onboarding_completed
          'premium',           // subscription_tier
          'light',             // theme
          new Date().toISOString() // created_at
        ]
      );
      
      testUserId = userResult.rows[0].id;
      console.log(`Created test user with ID: ${testUserId}`);
    }
    
    // Create questionnaire if it doesn't exist
    const questionnaireCheck = await pool.query(
      `SELECT id FROM questionnaires WHERE user_id = $1`,
      [testUserId]
    );
    
    if (questionnaireCheck.rows.length === 0) {
      // Create default questionnaire with data stored in JSONB format
      const questionnaireData = {
        age: 35,
        gender: 'Male',
        height: 175,
        weight: 70,
        heightUnit: 'cm',
        weightUnit: 'kg',
        activityLevel: 'Moderate',
        sleepQuality: 'Good',
        dietType: 'Balanced',
        healthGoals: ['Improve fitness', 'Better sleep', 'Weight management']
      };
      
      await pool.query(
        `INSERT INTO questionnaires 
         (user_id, data, created_at, updated_at, medical_disclaimer_agreed, 
          amazon_affiliate_disclaimer_agreed, terms_of_service_agreed, data_retention_agreed,
          health_data_processing_agreed, age_verification_agreed, non_transferability_agreed,
          cookie_policy_agreed, export_control_agreed)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          testUserId,                  // user_id
          JSON.stringify(questionnaireData), // data as JSONB
          new Date().toISOString(),    // created_at
          new Date().toISOString(),    // updated_at
          true,                        // medical_disclaimer_agreed
          true,                        // amazon_affiliate_disclaimer_agreed
          true,                        // terms_of_service_agreed
          true,                        // data_retention_agreed
          true,                        // health_data_processing_agreed
          true,                        // age_verification_agreed
          true,                        // non_transferability_agreed
          true,                        // cookie_policy_agreed
          true                         // export_control_agreed
        ]
      );
      console.log(`Created questionnaire for test user.`);
    } else {
      console.log(`Test user already has questionnaire data.`);
    }
    
    // Essential health metrics
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
    const existingMetricsResult = await pool.query(
      `SELECT type FROM health_metrics WHERE user_id = $1`,
      [testUserId]
    );
    
    const existingTypes = existingMetricsResult.rows.map(row => row.type.toLowerCase());
    console.log(`Found ${existingTypes.length} existing metrics.`);
    
    // Add missing metrics
    let metricsAdded = 0;
    
    for (const metric of essentialMetrics) {
      if (!existingTypes.includes(metric.type.toLowerCase())) {
        try {
          await pool.query(
            `INSERT INTO health_metrics (id, user_id, type, value, unit, icon, progress, date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              uuidv4(),
              testUserId,
              metric.type,
              metric.value,
              metric.unit,
              metric.icon,
              metric.progress,
              new Date().toISOString()
            ]
          );
          
          metricsAdded++;
          console.log(`Added ${metric.type} metric for test user.`);
        } catch (insertError) {
          console.error(`Error adding ${metric.type} metric:`, insertError.message);
        }
      } else {
        console.log(`Metric ${metric.type} already exists for test user.`);
      }
    }
    
    console.log(`Added ${metricsAdded} missing health metrics for test user.`);
    
    // Add some sample bloodwork results
    const bloodworkCheck = await pool.query(
      `SELECT COUNT(*) as count FROM bloodwork_results WHERE user_id = $1`,
      [testUserId]
    );
    
    if (parseInt(bloodworkCheck.rows[0].count) === 0) {
      // Add common bloodwork results
      const bloodworkItems = [
        {
          type: 'Vitamin D',
          value: '28',
          unit: 'ng/mL',
          min: '30',
          max: '100',
          status: 'low'
        },
        {
          type: 'Hemoglobin',
          value: '14.2',
          unit: 'g/dL',
          min: '13.5',
          max: '17.5',
          status: 'normal'
        },
        {
          type: 'Cholesterol',
          value: '210',
          unit: 'mg/dL',
          min: '125',
          max: '200',
          status: 'high'
        },
        {
          type: 'Iron',
          value: '80',
          unit: 'mcg/dL',
          min: '65',
          max: '175',
          status: 'normal'
        }
      ];
      
      let bloodworkAdded = 0;
      const uploadId = uuidv4();
      
      for (const item of bloodworkItems) {
        try {
          await pool.query(
            `INSERT INTO bloodwork_results (id, user_id, type, value, unit, min, max, status, date, upload_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              uuidv4(),
              testUserId,
              item.type,
              item.value,
              item.unit,
              item.min,
              item.max,
              item.status,
              new Date().toISOString(),
              uploadId
            ]
          );
          
          bloodworkAdded++;
          console.log(`Added ${item.type} bloodwork result for test user.`);
        } catch (insertError) {
          console.error(`Error adding ${item.type} bloodwork:`, insertError.message);
        }
      }
      
      console.log(`Added ${bloodworkAdded} bloodwork results for test user.`);
    } else {
      console.log(`Test user already has bloodwork data.`);
    }
    
    // Add some supplements
    const supplementsCheck = await pool.query(
      `SELECT COUNT(*) as count FROM supplements WHERE user_id = $1`,
      [testUserId]
    );
    
    if (parseInt(supplementsCheck.rows[0].count) === 0) {
      // Add common supplements
      const supplements = [
        {
          name: 'Vitamin D3',
          dosage: '2000 IU',
          timing: 'Morning with breakfast',
          icon: 'pill'
        },
        {
          name: 'Magnesium',
          dosage: '500mg',
          timing: 'Evening before bed',
          icon: 'pill'
        },
        {
          name: 'Fish Oil',
          dosage: '1000mg',
          timing: 'With lunch',
          icon: 'droplet'
        }
      ];
      
      let supplementsAdded = 0;
      
      for (const supplement of supplements) {
        try {
          await pool.query(
            `INSERT INTO supplements (id, user_id, name, dosage, timing, icon, taken, is_user_inputted, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              uuidv4(),
              testUserId,
              supplement.name,
              supplement.dosage,
              supplement.timing,
              supplement.icon,
              false,
              true,
              new Date().toISOString()
            ]
          );
          
          supplementsAdded++;
          console.log(`Added ${supplement.name} supplement for test user.`);
        } catch (insertError) {
          console.error(`Error adding ${supplement.name} supplement:`, insertError.message);
        }
      }
      
      console.log(`Added ${supplementsAdded} supplements for test user.`);
    } else {
      console.log(`Test user already has supplements data.`);
    }
    
    console.log('\nTest account setup completed successfully!');
    console.log('Login credentials:');
    console.log('  Username: test');
    console.log('  Password: test');
    
  } catch (error) {
    console.error('Error creating test account:', error);
  } finally {
    // Close the pool
    await pool.end();
    console.log('Database connection closed.');
  }
}

// Run the function
createTestAccount().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
