/**
 * Database Migration Script for Health Metric Format Standardization
 * 
 * This script converts all health metrics in the database from the old lowercase
 * hyphenated format (e.g., "sleep-duration") to the new capitalized proper names format
 * (e.g., "Sleep Duration").
 */

import pg from 'pg';

// Format mapping from old to new
const formatMapping = {
  // Essential metrics
  'weight': 'Weight',
  'sleep-duration': 'Sleep Duration',
  'stress-level': 'Stress Level',
  'exercise-frequency': 'Exercise Frequency',
  
  // Additional metrics
  'heart-rate': 'Heart Rate',
  'blood-pressure': 'Blood Pressure',
  'body-temperature': 'Body Temperature',
  'respiratory-rate': 'Respiratory Rate',
  'oxygen-saturation': 'Oxygen Saturation',
  'heart-rate-variability': 'Heart Rate Variability',
  'resting-heart-rate': 'Resting Heart Rate',
  'vo2-max': 'VO2 Max',
  'active-minutes': 'Active Minutes',
  'exercise-duration': 'Exercise Duration',
  'water-intake': 'Water Intake',
  'calorie-intake': 'Calorie Intake',
  'protein-intake': 'Protein Intake',
  'carb-intake': 'Carbohydrate Intake',
  'fat-intake': 'Fat Intake',
  'deep-sleep': 'Deep Sleep',
  'rem-sleep': 'REM Sleep',
  'sleep-score': 'Sleep Score',
  'recovery-score': 'Recovery Score',
  'bmi': 'BMI',
  'body-fat': 'Body Fat',
  'lean-mass': 'Lean Mass',
  'visceral-fat': 'Visceral Fat',
  'mood': 'Mood',
  'meditation': 'Meditation',
  'anxiety-level': 'Anxiety Level',
  'biological-age': 'Biological Age',
  'longevity-score': 'Longevity Score',
  'energy-level': 'Energy Level',
  'testosterone': 'Testosterone',
  'cortisol': 'Cortisol'
};

async function convertMetricFormats() {
  console.log('Starting database migration for health metrics format standardization...');
  
  // Connect to database
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Start transaction
    await pool.query('BEGIN');
    console.log('Transaction started');
    
    // Get all health metrics
    const { rows: metrics } = await pool.query(
      'SELECT id, user_id, type, value, unit, date FROM health_metrics'
    );
    
    console.log(`Found ${metrics.length} health metrics to process`);
    
    // Track conversion stats
    let converted = 0;
    let alreadyInNewFormat = 0;
    let skipped = 0;
    
    // Process each metric
    for (const metric of metrics) {
      // Skip if already in new format (contains a space and first letter is capitalized)
      if (metric.type.includes(' ') && metric.type.charAt(0) === metric.type.charAt(0).toUpperCase()) {
        alreadyInNewFormat++;
        continue;
      }
      
      // Check if metric type is in our mapping
      if (formatMapping[metric.type]) {
        // Update the metric type to the new format
        await pool.query(
          'UPDATE health_metrics SET type = $1 WHERE id = $2',
          [formatMapping[metric.type], metric.id]
        );
        converted++;
        console.log(`Converted: ${metric.type} → ${formatMapping[metric.type]}`);
      } else {
        // If not in our mapping, skip it
        skipped++;
        console.log(`Skipped: ${metric.type} (no mapping found)`);
      }
    }
    
    // Commit transaction
    await pool.query('COMMIT');
    console.log('Transaction committed');
    
    // Summary
    console.log('\n--- Conversion Summary ---');
    console.log(`Total metrics processed: ${metrics.length}`);
    console.log(`- Already in new format: ${alreadyInNewFormat}`);
    console.log(`- Converted to new format: ${converted}`);
    console.log(`- Skipped (no mapping): ${skipped}`);
    
  } catch (error) {
    // Rollback transaction on error
    await pool.query('ROLLBACK');
    console.error('Transaction rolled back due to error:', error);
  } finally {
    // Close the database connection
    await pool.end();
    console.log('Database connection closed');
  }
  
  console.log('\nMigration completed.');
}

// Run the conversion
convertMetricFormats().catch(err => {
  console.error('Error in conversion script:', err);
  process.exit(1);
});