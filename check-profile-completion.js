/**
 * Script to diagnose profile completion issues
 */
import pg from 'pg';

async function checkProfileCompletion() {
  console.log('Checking health profile completion status...');
  
  // Connect to database
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Get test user (or create a specific user ID)
    const userId = 1; // For testing purposes
    console.log(`Checking profile completion for user ID: ${userId}`);
    
    // Step 1: Check onboarding status
    const userResult = await pool.query(
      `SELECT onboarding_completed FROM users WHERE id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      console.log(`❌ User with ID ${userId} not found`);
      return { profileComplete: false, userExists: false };
    }
    
    const onboardingCompleted = userResult.rows[0].onboarding_completed === true;
    console.log(`Onboarding completed: ${onboardingCompleted}`);
    
    // Step 2: Check questionnaire exists
    const questionnaireResult = await pool.query(
      `SELECT * FROM questionnaires WHERE user_id = $1`,
      [userId]
    );
    
    const questionnaireExists = questionnaireResult.rows.length > 0;
    console.log(`Health questionnaire exists: ${questionnaireExists}`);
    
    // Step 3: Check essential health metrics
    const essentialMetrics = ['sleep-duration', 'stress-level', 'exercise-frequency', 'weight'];
    const metricsResult = await pool.query(
      `SELECT type FROM health_metrics WHERE user_id = $1 AND type = ANY($2)`,
      [userId, essentialMetrics]
    );
    
    const uniqueMetrics = new Set(metricsResult.rows.map(row => row.type));
    console.log(`Found ${uniqueMetrics.size} of ${essentialMetrics.length} essential metrics:`);
    essentialMetrics.forEach(metric => {
      console.log(`- ${metric}: ${uniqueMetrics.has(metric) ? '✅ Present' : '❌ Missing'}`);
    });
    
    const hasEssentialMetrics = uniqueMetrics.size >= 4;
    console.log(`Has all essential metrics: ${hasEssentialMetrics}`);
    
    // Overall profile status
    const profileComplete = onboardingCompleted && questionnaireExists && hasEssentialMetrics;
    console.log(`\nOVERALL PROFILE STATUS: ${profileComplete ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
    
    if (!profileComplete) {
      console.log('\nMissing requirements:');
      if (!onboardingCompleted) console.log('- User needs to complete onboarding');
      if (!questionnaireExists) console.log('- Health questionnaire needs to be completed');
      if (!hasEssentialMetrics) console.log('- Need to add all essential health metrics');
    }
    
    // Bonus: Check bloodwork (optional but recommended)
    const bloodworkResult = await pool.query(
      `SELECT * FROM bloodwork_results WHERE user_id = $1`,
      [userId]
    );
    
    const hasBloodwork = bloodworkResult.rows.length > 0;
    console.log(`\nBloodwork results: ${hasBloodwork ? '✅ Present' : '⚠️ Missing (optional)'}`);
    
    return {
      userId,
      profileComplete,
      onboardingCompleted,
      questionnaireExists,
      hasEssentialMetrics,
      hasBloodwork
    };
    
  } catch (error) {
    console.error('Error checking profile completion:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the function
checkProfileCompletion().catch(console.error);