/**
 * Script to check the status of a user's health questionnaire
 */
import pg from 'pg';

async function checkQuestionnaire() {
  console.log('Checking health questionnaire status...');
  
  // Connect to database
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Set up test user
    const userId = 1; // For testing purposes
    console.log(`Checking questionnaire for user ID: ${userId}`);
    
    // Check if questionnaire exists
    const questionnaireResult = await pool.query(
      `SELECT * FROM questionnaires WHERE user_id = $1`,
      [userId]
    );
    
    const hasQuestionnaire = questionnaireResult.rows.length > 0;
    
    if (hasQuestionnaire) {
      const questionnaire = questionnaireResult.rows[0];
      console.log(`\n✅ Health questionnaire found for user ${userId}`);
      console.log(`Date created: ${questionnaire.created_at}`);
      console.log(`Date updated: ${questionnaire.updated_at}`);
      
      // Check questionnaire content
      let questionnaireData;
      try {
        questionnaireData = questionnaire.data; // Already a JSONB object
        console.log(`Questionnaire contains ${Object.keys(questionnaireData).length} answers`);
        
        // Log a few sample questions/answers for verification
        const sampleKeys = Object.keys(questionnaireData).slice(0, 3);
        console.log('\nSample questions/answers:');
        sampleKeys.forEach(key => {
          console.log(`- ${key}: ${JSON.stringify(questionnaireData[key])}`);
        });
      } catch (e) {
        console.error('Error accessing questionnaire data:', e);
        console.log('Raw data:', questionnaire.data);
      }
      
      // Check terms agreement
      console.log('\nTerms agreement status:');
      console.log(`- Medical disclaimer: ${questionnaire.medical_disclaimer_agreed ? '✅' : '❌'}`);
      console.log(`- Terms of service: ${questionnaire.terms_of_service_agreed ? '✅' : '❌'}`);
      console.log(`- Data retention: ${questionnaire.data_retention_agreed ? '✅' : '❌'}`);
    } else {
      console.log(`\n❌ No health questionnaire found for user ${userId}`);
    }
    
    // Check onboarding status (from users table)
    const userResult = await pool.query(
      `SELECT onboarding_completed FROM users WHERE id = $1`,
      [userId]
    );
    
    const onboardingStatus = userResult.rows.length > 0 
      ? userResult.rows[0].onboarding_completed ? 'Completed' : 'In Progress'
      : 'User Not Found';
      
    console.log(`\nOnboarding status: ${onboardingStatus}`);
    
    return {
      userId,
      hasQuestionnaire,
      questionnaireData: hasQuestionnaire ? questionnaireResult.rows[0] : null,
      onboardingStatus
    };
    
  } catch (error) {
    console.error('Error checking questionnaire:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the function
checkQuestionnaire().catch(console.error);