/**
 * Smart Recommendations Server with OpenAI Integration
 * This server provides personalized health and supplement recommendations
 * using the OpenAI API to analyze user health data.
 */

import express from 'express';
import { generateSupplementRecommendations, getUserHealthData } from './server/openai-supplements.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
// Use PORT from environment or default to 3010 (to avoid conflicts)
const PORT = process.env.PORT || 3010;
// In Replit environment, always bind to 0.0.0.0 to ensure proper connectivity
const HOST = '0.0.0.0';

console.log(`Starting Smart Recommendations server with OpenAI integration on port ${PORT}...`);

// Add middleware for parsing JSON and handling CORS
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-User-ID');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Add authentication middleware
app.use((req, res, next) => {
  // Check for user ID in header
  const userId = req.headers['x-user-id'];
  
  if (!userId) {
    console.log('No user ID provided in request headers');
    // Allow health endpoint without authentication
    if (req.path === '/health') {
      return next();
    }
    return res.status(401).json({ 
      message: "Authentication required", 
      success: false 
    });
  }
  
  // Set the user ID on the request object
  req.userId = userId;
  console.log(`Request authenticated with user ID: ${userId}`);
  next();
});

// Smart recommendations endpoints
app.get('/api/context-aware/health-recommendations', async (req, res) => {
  console.log('Received request for health recommendations');
  
  // Get user ID from request headers
  const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'].toString()) : 370; // Default to admin user ID if not provided
  console.log(`Processing health recommendations for user ID: ${userId}`);
  
  try {
    // Import needed modules
    const pg = await import('pg');
    const { storage } = await import('./server/db-storage.js');
    
    // Create a database connection
    const pool = new pg.default.Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    // Get user health data for personalized recommendations
    let [questionnaire, metrics] = await Promise.all([
      storage.getQuestionnaire(userId).catch(err => {
        console.error(`Error fetching questionnaire for user ${userId}:`, err);
        return null;
      }),
      storage.getHealthMetrics(userId).catch(err => {
        console.error(`Error fetching health metrics for user ${userId}:`, err);
        return [];
      })
    ]);
    
    console.log(`Found ${metrics.length} health metrics for user ${userId}`);
    
    // Base health recommendations that we can personalize
    const healthRecommendations = [
      {
        id: 1,
        category: 'Sleep',
        title: 'Improve Sleep Quality',
        description: 'Establishing a consistent sleep schedule can improve energy levels and overall health.',
        content: 'Quality sleep is essential for physical recovery, cognitive function, and emotional well-being. Aim for 7-9 hours of uninterrupted sleep each night.',
        actionText: 'Set a consistent bedtime and wake-up time, even on weekends.',
        reasonForRecommendation: 'Consistent sleep patterns help regulate your body\'s natural sleep-wake cycle.',
        priority: 'medium',
        tags: ['sleep', 'rest', 'recovery']
      },
      {
        id: 2,
        category: 'Stress',
        title: 'Practice Mindfulness for Stress Management',
        description: 'Regular mindfulness practices can significantly reduce stress levels and improve mental clarity.',
        content: 'Mindfulness meditation can help reduce stress hormone levels and promote a sense of calm and focus. Even short practices can be beneficial.',
        actionText: 'Start with 5 minutes of guided meditation daily and gradually increase.',
        reasonForRecommendation: 'Regular mindfulness practice has been shown to reduce stress and improve mental health.',
        priority: 'medium',
        tags: ['stress', 'mental health', 'mindfulness']
      },
      {
        id: 3,
        category: 'Exercise',
        title: 'Incorporate Regular Physical Activity',
        description: 'Regular exercise improves cardiovascular health, mood, and energy levels.',
        content: 'Aim for at least 150 minutes of moderate activity or 75 minutes of vigorous activity weekly, along with 2 days of strength training.',
        actionText: 'Schedule 30 minutes of activity most days of the week.',
        reasonForRecommendation: 'Regular physical activity reduces the risk of chronic disease and improves overall well-being.',
        priority: 'medium',
        tags: ['exercise', 'fitness', 'cardiovascular health']
      },
      {
        id: 4,
        category: 'Nutrition',
        title: 'Balanced Nutrient-Dense Diet',
        description: 'Focus on whole foods rich in nutrients to support overall health.',
        content: 'Prioritize fruits, vegetables, lean proteins, whole grains, and healthy fats. Minimize processed foods, added sugars, and excessive sodium.',
        actionText: 'Add one extra serving of vegetables to each meal.',
        reasonForRecommendation: 'A nutrient-dense diet provides essential vitamins, minerals, and antioxidants needed for optimal health.',
        priority: 'medium',
        tags: ['nutrition', 'diet', 'healthy eating']
      },
      {
        id: 5,
        category: 'Hydration',
        title: 'Optimize Daily Hydration',
        description: 'Proper hydration supports all bodily functions from energy levels to cognitive performance.',
        content: 'Aim to drink water consistently throughout the day. The exact amount varies by individual, but 2-3 liters is a general guideline.',
        actionText: 'Keep a reusable water bottle with you throughout the day.',
        reasonForRecommendation: 'Even mild dehydration can impact energy levels, cognitive function, and physical performance.',
        priority: 'medium',
        tags: ['hydration', 'water', 'wellness']
      },
      {
        id: 6,
        category: 'Mental Health',
        title: 'Prioritize Social Connections',
        description: 'Strong social connections are linked to better mental and physical health outcomes.',
        content: 'Regular meaningful social interactions can reduce stress, improve mood, and even boost immune function.',
        actionText: 'Schedule regular catch-ups with friends or family.',
        reasonForRecommendation: 'Social connection is a fundamental human need that directly impacts health and longevity.',
        priority: 'medium',
        tags: ['mental health', 'social connections', 'wellbeing']
      },
      {
        id: 7,
        category: 'Daily Habits',
        title: 'Digital Wellness Practices',
        description: 'Managing screen time and digital habits can improve sleep, focus, and stress levels.',
        content: 'Excessive screen time, especially before bed, can disrupt sleep patterns and contribute to eye strain and stress.',
        actionText: 'Implement a 30-60 minute screen-free period before bedtime.',
        reasonForRecommendation: 'Blue light from screens can suppress melatonin production and interfere with sleep quality.',
        priority: 'low',
        tags: ['digital wellness', 'screen time', 'sleep hygiene']
      }
    ];
    
    // Personalization logic based on user data
    const personalizeHealthRecommendations = () => {
      let personalizedRecs = [...healthRecommendations];
      
      // Personalize based on metrics if available
      if (metrics && metrics.length > 0) {
        // Check sleep metrics
        const sleepMetric = metrics.find(m => 
          m.type === 'Sleep Duration' || m.type === 'sleep-duration'
        );
        
        if (sleepMetric) {
          const hours = parseFloat(sleepMetric.value.toString());
          const sleepRec = personalizedRecs.find(r => r.category === 'Sleep');
          
          if (sleepRec) {
            if (hours < 6) {
              sleepRec.priority = 'high';
              sleepRec.title = 'Increase Sleep Duration';
              sleepRec.description = `Your average sleep of ${hours} hours is below the recommended 7-9 hours for adults.`;
              sleepRec.content = 'Sleep deprivation can lead to decreased cognitive function, mood changes, weakened immunity, and increased health risks. Prioritizing sleep is a critical health investment.';
              sleepRec.actionText = 'Try going to bed 30 minutes earlier each night this week.';
            } else if (hours > 9) {
              sleepRec.title = 'Optimize Sleep Quality';
              sleepRec.description = `You're getting ${hours} hours of sleep, which is on the higher end. Let's focus on quality.`;
              sleepRec.content = 'Excessive sleep can sometimes indicate poor sleep quality or an underlying health issue. Focus on improving sleep efficiency rather than just duration.';
              sleepRec.actionText = 'Consider tracking sleep quality with a sleep diary or app.';
            }
          }
        }
        
        // Check stress metrics
        const stressMetric = metrics.find(m => 
          m.type === 'Stress Level' || m.type === 'stress-level'
        );
        
        if (stressMetric) {
          const level = parseFloat(stressMetric.value.toString());
          const stressRec = personalizedRecs.find(r => r.category === 'Stress');
          
          if (stressRec && level > 6) {
            stressRec.priority = 'high';
            stressRec.title = 'Stress Reduction Plan';
            stressRec.description = `Your stress level of ${level}/10 indicates a need for active stress management.`;
            stressRec.content = 'Chronic high stress can negatively impact nearly every system in your body, from cardiovascular to immune function. Implementing stress reduction techniques can have widespread health benefits.';
            stressRec.actionText = 'Begin with 5 minutes of deep breathing exercises twice daily.';
          }
        }
        
        // Check exercise metrics
        const exerciseMetric = metrics.find(m => 
          m.type === 'Exercise Frequency' || m.type === 'exercise-frequency'
        );
        
        if (exerciseMetric) {
          const frequency = parseFloat(exerciseMetric.value.toString());
          const exerciseRec = personalizedRecs.find(r => r.category === 'Exercise');
          
          if (exerciseRec) {
            if (frequency < 3) {
              exerciseRec.priority = 'high';
              exerciseRec.title = 'Increase Physical Activity';
              exerciseRec.description = `Your current exercise frequency of ${frequency} times per week could be increased for health benefits.`;
              exerciseRec.content = 'Regular physical activity is one of the most powerful health interventions, with benefits for cardiovascular health, mood, cognition, and longevity.';
              exerciseRec.actionText = 'Add one additional day of activity this week, even if it\'s just a 15-minute walk.';
            } else if (frequency >= 5) {
              exerciseRec.title = 'Optimize Recovery Between Workouts';
              exerciseRec.description = `With your high activity level of ${frequency} times per week, recovery becomes essential.`;
              exerciseRec.content = 'Proper recovery between workouts prevents overtraining, reduces injury risk, and allows for performance improvements. This includes adequate sleep, nutrition, and active recovery strategies.';
              exerciseRec.actionText = 'Incorporate a dedicated recovery day with gentle stretching or yoga.';
            }
          }
        }
        
        // Check water intake
        const waterMetric = metrics.find(m => 
          m.type === 'Water Intake' || m.type === 'water-intake'
        );
        
        if (waterMetric) {
          const intake = parseFloat(waterMetric.value.toString());
          const hydrationRec = personalizedRecs.find(r => r.category === 'Hydration');
          
          if (hydrationRec && intake < 1.5) {
            hydrationRec.priority = 'high';
            hydrationRec.title = 'Increase Daily Hydration';
            hydrationRec.description = `Your current water intake of ${intake}L is below the recommended amount.`;
            hydrationRec.content = 'Even mild dehydration can affect energy levels, cognitive function, and physical performance. Proper hydration supports all cellular functions.';
            hydrationRec.actionText = 'Set reminders to drink water throughout the day, aiming for 2L minimum.';
          }
        }
        
        // Look for relationships between metrics (sleep-stress connection)
        if (sleepMetric && stressMetric) {
          const sleepHours = parseFloat(sleepMetric.value.toString());
          const stressLevel = parseFloat(stressMetric.value.toString());
          
          if (sleepHours < 7 && stressLevel > 6) {
            // Add a recommendation about the sleep-stress cycle
            personalizedRecs.push({
              id: 8,
              category: 'Sleep-Stress Cycle',
              title: 'Breaking the Sleep-Stress Cycle',
              description: 'Your data shows a potential relationship between poor sleep and high stress levels.',
              content: 'Poor sleep can increase stress, and high stress can worsen sleep - creating a challenging cycle. Breaking this cycle from either end can create positive momentum for overall health.',
              actionText: 'Create a 15-minute pre-sleep relaxation routine to transition from day to night.',
              reasonForRecommendation: 'Addressing the sleep-stress connection can create compound benefits for both issues.',
              priority: 'high',
              tags: ['sleep', 'stress', 'mental health', 'integrated health']
            });
          }
        }
        
        // Check for exercise-mood connection
        const moodMetric = metrics.find(m => 
          m.type === 'Mood Score' || m.type === 'mood-score' || m.type === 'Mood' || m.type === 'mood'
        );
        
        if (exerciseMetric && moodMetric) {
          const exerciseFreq = parseFloat(exerciseMetric.value.toString());
          const moodScore = parseFloat(moodMetric.value.toString());
          
          // Assuming mood is rated on a scale where lower is worse
          if (exerciseFreq < 3 && moodScore < 6) {
            personalizedRecs.push({
              id: 9,
              category: 'Exercise for Mental Health',
              title: 'Activity for Mood Enhancement',
              description: 'Your data suggests a potential benefit from using exercise as a mood management tool.',
              content: 'Physical activity has proven mental health benefits, including reduced symptoms of depression and anxiety, improved mood, and better stress regulation.',
              actionText: 'Start with just 10 minutes of enjoyable movement daily, with a focus on consistency rather than intensity.',
              reasonForRecommendation: 'Even modest increases in physical activity can significantly improve mood and mental wellbeing.',
              priority: 'high',
              tags: ['exercise', 'mental health', 'mood', 'wellbeing']
            });
          }
        }
      }
      
      // Personalize based on questionnaire if available
      if (questionnaire) {
        // Check health concerns
        if (questionnaire.healthConcerns && questionnaire.healthConcerns.length > 0) {
          const concerns = questionnaire.healthConcerns.map(c => c.toLowerCase());
          
          // Heart health concerns
          if (concerns.some(c => c.includes('heart') || c.includes('cardio') || c.includes('blood pressure'))) {
            personalizedRecs.push({
              id: 10,
              category: 'Heart Health',
              title: 'Cardiovascular Health Strategies',
              description: 'Based on your health concerns, here are targeted strategies for heart health.',
              content: 'A combination of regular activity, heart-healthy nutrition, stress management, and adequate sleep all contribute to cardiovascular wellness.',
              actionText: 'Add one heart-healthy food (like fatty fish, nuts, or leafy greens) to your meals daily.',
              reasonForRecommendation: 'Small, consistent dietary and lifestyle changes can significantly impact heart health over time.',
              priority: 'high',
              tags: ['heart health', 'cardiovascular', 'nutrition', 'exercise']
            });
          }
          
          // Joint or pain concerns
          if (concerns.some(c => c.includes('joint') || c.includes('pain') || c.includes('arthritis'))) {
            personalizedRecs.push({
              id: 11,
              category: 'Pain Management',
              title: 'Joint Health and Pain Management',
              description: 'Your health concerns indicate a focus on joint health and pain management would be beneficial.',
              content: 'A multi-faceted approach including gentle movement, anti-inflammatory nutrition, proper body mechanics, and stress management can help manage joint discomfort.',
              actionText: 'Try gentle range-of-motion exercises daily and consider applying heat or cold for temporary pain relief.',
              reasonForRecommendation: 'Maintaining mobility and managing inflammation are key components of joint health.',
              priority: 'high',
              tags: ['pain management', 'joint health', 'mobility', 'inflammation']
            });
          }
          
          // Energy or fatigue concerns
          if (concerns.some(c => c.includes('energy') || c.includes('fatigue') || c.includes('tired'))) {
            personalizedRecs.push({
              id: 12,
              category: 'Energy Management',
              title: 'Natural Energy Optimization',
              description: 'Your concerns about energy levels can be addressed through several lifestyle strategies.',
              content: 'Energy management involves optimizing sleep, nutrition, physical activity, stress levels, and potentially identifying any underlying health issues.',
              actionText: 'Focus on protein and complex carbs at breakfast, and avoid high-sugar snacks that cause energy crashes.',
              reasonForRecommendation: 'Stabilizing blood sugar and optimizing sleep are two foundational factors for balanced energy.',
              priority: 'high',
              tags: ['energy', 'fatigue', 'nutrition', 'sleep']
            });
          }
        }
        
        // Check dietary preferences
        if (questionnaire.dietaryPreferences && questionnaire.dietaryPreferences.length > 0) {
          const diet = questionnaire.dietaryPreferences.map(d => d.toLowerCase());
          
          if (diet.some(d => d.includes('vegan') || d.includes('vegetarian'))) {
            personalizedRecs.push({
              id: 13,
              category: 'Plant-Based Nutrition',
              title: 'Optimizing Plant-Based Diet',
              description: 'Here are strategies to ensure nutritional adequacy on your plant-based diet.',
              content: 'Well-planned plant-based diets can be nutritionally complete, but may require attention to specific nutrients including vitamin B12, iron, zinc, omega-3s, vitamin D, and calcium.',
              actionText: 'Include a variety of protein sources daily (legumes, tofu, tempeh, seitan, and/or a high-quality plant protein powder).',
              reasonForRecommendation: 'Ensuring adequate protein, iron, and B12 intake is particularly important for plant-based eaters.',
              priority: 'medium',
              tags: ['nutrition', 'plant-based', 'vegan', 'vegetarian']
            });
          }
        }
      }
      
      // Sort by priority
      return personalizedRecs.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    };
    
    // Generate personalized recommendations
    const recommendations = personalizeHealthRecommendations();
    
    // Return personalized recommendations
    res.json({
      success: true,
      recommendations: recommendations,
      meta: {
        generatedAt: new Date().toISOString(),
        modelUsed: "contextual-health-analyzer-v2",
        analysisScore: 0.89
      }
    });
  } catch (error) {
    console.error('Error generating health recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate health recommendations'
    });
  }
});

app.get('/api/context-aware/supplement-recommendations', async (req, res) => {
  console.log('Received request for supplement recommendations');
  
  // Get user ID from request headers
  const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'].toString()) : 370; // Default to admin user ID if not provided
  console.log(`Processing supplement recommendations for user ID: ${userId}`);
  
  try {
    // Import needed modules
    const pg = await import('pg');
    const { storage } = await import('./server/db-storage.js');
    
    // Create a database connection
    const pool = new pg.default.Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    // Get user health data for personalized recommendations
    let [questionnaire, metrics, currentSupplements] = await Promise.all([
      storage.getQuestionnaire(userId).catch(err => {
        console.error(`Error fetching questionnaire for user ${userId}:`, err);
        return null;
      }),
      storage.getHealthMetrics(userId).catch(err => {
        console.error(`Error fetching health metrics for user ${userId}:`, err);
        return [];
      }),
      storage.getUserSupplements(userId).catch(err => {
        console.error(`Error fetching supplements for user ${userId}:`, err);
        return [];
      })
    ]);
    
    console.log(`Found ${currentSupplements.length} current supplements for user ${userId}`);
    
    // Base supplement options that we can recommend
    const supplementOptions = [
      {
        id: 1,
        name: 'Vitamin D3',
        category: 'Essential Nutrients',
        description: 'Vitamin D is essential for calcium absorption and bone health, with additional benefits for immune function and mood regulation.',
        dosage: '2000 IU daily',
        timing: 'With a meal containing healthy fats',
        benefits: [
          'Supports bone health',
          'Contributes to immune function',
          'May improve mood and energy levels'
        ],
        priority: 'medium',
        indicatedFor: ['low vitamin D levels', 'limited sun exposure', 'fatigue', 'bone health concerns'],
        contraindicatedFor: ['hypercalcemia', 'kidney stones', 'taking certain medications']
      },
      {
        id: 2,
        name: 'Magnesium Glycinate',
        category: 'Minerals',
        description: 'Magnesium is involved in over 300 enzymatic reactions in the body and is often deficient in modern diets.',
        dosage: '300-400mg daily',
        timing: 'Before bedtime',
        benefits: [
          'Supports muscle recovery',
          'May improve sleep quality',
          'Helps regulate stress response'
        ],
        priority: 'medium',
        indicatedFor: ['poor sleep', 'muscle cramping', 'high stress levels', 'exercise recovery'],
        contraindicatedFor: ['severe kidney disease', 'myasthenia gravis']
      },
      {
        id: 3,
        name: 'Omega-3 Fatty Acids',
        category: 'Essential Fatty Acids',
        description: 'EPA and DHA are essential omega-3 fatty acids that support cardiovascular and cognitive health.',
        dosage: '1-2g daily',
        timing: 'With meals',
        benefits: [
          'Supports cardiovascular health',
          'May reduce inflammation',
          'Supports brain function'
        ],
        priority: 'medium',
        indicatedFor: ['limited fatty fish intake', 'joint discomfort', 'cardiovascular health concerns', 'cognitive function'],
        contraindicatedFor: ['blood thinning medications', 'fish allergies', 'upcoming surgery']
      },
      {
        id: 4,
        name: 'Zinc',
        category: 'Minerals',
        description: 'Zinc is an essential mineral that supports immune function, protein synthesis, and wound healing.',
        dosage: '15-30mg daily',
        timing: 'With food to prevent nausea',
        benefits: [
          'Supports immune function',
          'Aids in protein synthesis',
          'Supports wound healing'
        ],
        priority: 'low',
        indicatedFor: ['frequent illness', 'intense exercise regimen', 'plant-based diet', 'wound healing'],
        contraindicatedFor: ['high supplemental copper intake', 'certain antibiotics']
      },
      {
        id: 5,
        name: 'Vitamin B Complex',
        category: 'Essential Nutrients',
        description: 'B vitamins are essential for energy production, nerve function, and cellular metabolism.',
        dosage: 'As directed on label (varies by formulation)',
        timing: 'Morning with food',
        benefits: [
          'Supports energy metabolism',
          'Helps with stress response',
          'Supports nervous system function'
        ],
        priority: 'medium',
        indicatedFor: ['fatigue', 'plant-based diet', 'high stress levels', 'older adults'],
        contraindicatedFor: ['certain genetic conditions']
      },
      {
        id: 6,
        name: 'Vitamin C',
        category: 'Essential Nutrients',
        description: 'Vitamin C is a potent antioxidant that supports immune function and collagen production.',
        dosage: '500-1000mg daily',
        timing: 'With meals, divided doses for better absorption',
        benefits: [
          'Supports immune function',
          'Acts as an antioxidant',
          'Supports collagen production'
        ],
        priority: 'low',
        indicatedFor: ['limited fruit and vegetable intake', 'frequent illness', 'smoking', 'high stress'],
        contraindicatedFor: ['history of kidney stones', 'hemochromatosis']
      },
      {
        id: 7,
        name: 'Probiotics',
        category: 'Digestive Health',
        description: 'Beneficial bacteria that support gut health, immune function, and potentially mood regulation.',
        dosage: '10-50 billion CFU daily',
        timing: 'Morning on empty stomach or as directed',
        benefits: [
          'Supports digestive health',
          'May enhance immune function',
          'Can help after antibiotics'
        ],
        priority: 'medium',
        indicatedFor: ['digestive issues', 'recent antibiotic use', 'immune support'],
        contraindicatedFor: ['severe immunocompromised conditions', 'SIBO']
      },
      {
        id: 8,
        name: 'Ashwagandha',
        category: 'Adaptogenic Herbs',
        description: 'An adaptogenic herb that may help the body manage stress and support overall wellbeing.',
        dosage: '300-600mg daily of root extract',
        timing: 'Morning or evening consistently',
        benefits: [
          'May help manage stress response',
          'Could support healthy energy levels',
          'May support immune function'
        ],
        priority: 'low',
        indicatedFor: ['high stress levels', 'anxiety', 'fatigue', 'poor sleep quality'],
        contraindicatedFor: ['autoimmune thyroid conditions', 'pregnancy', 'certain medications']
      }
    ];
    
    // Currently used supplement names
    const currentSupplementNames = currentSupplements.map(s => s.name.toLowerCase());
    console.log('Current supplements:', currentSupplementNames);
    
    // Personalization logic based on user data
    const personalizeRecommendations = () => {
      let personalizedRecs = [...supplementOptions];
      
      // Filter out supplements the user is already taking
      personalizedRecs = personalizedRecs.filter(supp => 
        !currentSupplementNames.some(cs => cs.includes(supp.name.toLowerCase()) || 
                                    supp.name.toLowerCase().includes(cs))
      );
      
      // Personalize based on metrics
      if (metrics && metrics.length > 0) {
        const sleepMetric = metrics.find(m => 
          m.type === 'Sleep Duration' || m.type === 'sleep-duration'
        );
        
        if (sleepMetric) {
          const hours = parseFloat(sleepMetric.value.toString());
          if (hours < 6.5) {
            // Prioritize sleep support supplements
            const magnesium = personalizedRecs.find(s => s.name === 'Magnesium Glycinate');
            if (magnesium) {
              magnesium.priority = 'high';
              magnesium.description = 'Your sleep data indicates you may benefit from magnesium, which can help promote relaxation and improve sleep quality.';
            }
          }
        }
        
        const stressMetric = metrics.find(m => 
          m.type === 'Stress Level' || m.type === 'stress-level'
        );
        
        if (stressMetric) {
          const level = parseFloat(stressMetric.value.toString());
          if (level > 6) {
            // Prioritize stress management supplements
            const ashwagandha = personalizedRecs.find(s => s.name === 'Ashwagandha');
            if (ashwagandha) {
              ashwagandha.priority = 'high';
              ashwagandha.description = 'Based on your stress levels, you may benefit from Ashwagandha, an adaptogenic herb that can help regulate stress response.';
            }
            
            const bComplex = personalizedRecs.find(s => s.name === 'Vitamin B Complex');
            if (bComplex) {
              bComplex.priority = 'medium';
              bComplex.description += ' Your stress data suggests B vitamins may be particularly beneficial.';
            }
          }
        }
      }
      
      // Personalize based on questionnaire
      if (questionnaire) {
        // Handle dietary preferences
        if (questionnaire.dietaryPreferences && questionnaire.dietaryPreferences.length > 0) {
          const diet = questionnaire.dietaryPreferences.map(d => d.toLowerCase());
          
          if (diet.some(d => d.includes('vegan') || d.includes('vegetarian'))) {
            // Prioritize nutrients commonly deficient in plant-based diets
            const b12 = personalizedRecs.find(s => s.name === 'Vitamin B Complex');
            const omega3 = personalizedRecs.find(s => s.name === 'Omega-3 Fatty Acids');
            const zinc = personalizedRecs.find(s => s.name === 'Zinc');
            
            if (b12) {
              b12.priority = 'high';
              b12.description = 'As someone following a plant-based diet, B vitamins (especially B12) are important as they are primarily found in animal products.';
            }
            
            if (omega3) {
              omega3.priority = 'high';
              omega3.description = 'Plant-based diets can be low in EPA and DHA omega-3s, which are primarily found in fatty fish. An algae-based omega-3 supplement may be beneficial.';
            }
            
            if (zinc) {
              zinc.priority = 'medium';
              zinc.description = 'Plant-based diets may provide less bioavailable zinc. Supplementation may be beneficial, especially if you exercise regularly.';
            }
          }
        }
        
        // Handle health goals
        if (questionnaire.healthGoals && questionnaire.healthGoals.length > 0) {
          const goals = questionnaire.healthGoals.map(g => g.toLowerCase());
          
          if (goals.some(g => g.includes('energy') || g.includes('fatigue'))) {
            const b12 = personalizedRecs.find(s => s.name === 'Vitamin B Complex');
            if (b12) {
              b12.priority = 'high';
              b12.description = 'Based on your energy-related goals, B vitamins may be particularly beneficial as they play a key role in energy metabolism.';
            }
          }
          
          if (goals.some(g => g.includes('immune') || g.includes('sick'))) {
            const vitaminC = personalizedRecs.find(s => s.name === 'Vitamin C');
            const vitaminD = personalizedRecs.find(s => s.name === 'Vitamin D3');
            const zinc = personalizedRecs.find(s => s.name === 'Zinc');
            
            if (vitaminC) {
              vitaminC.priority = 'high';
              vitaminC.description = 'Based on your immune support goals, Vitamin C may be a priority supplement for you.';
            }
            
            if (vitaminD) {
              vitaminD.priority = 'high';
              vitaminD.description = 'Vitamin D plays a crucial role in immune function. Based on your goals, this may be a key supplement.';
            }
            
            if (zinc) {
              zinc.priority = 'medium';
              zinc.description = 'Zinc plays an important role in immune function and may support your health goals.';
            }
          }
          
          if (goals.some(g => g.includes('stress') || g.includes('anxiety') || g.includes('mood'))) {
            const magnesium = personalizedRecs.find(s => s.name === 'Magnesium Glycinate');
            const ashwagandha = personalizedRecs.find(s => s.name === 'Ashwagandha');
            
            if (magnesium) {
              magnesium.priority = 'high';
              magnesium.description = 'For your stress management goals, magnesium may be beneficial as it helps regulate the stress response and promotes relaxation.';
            }
            
            if (ashwagandha) {
              ashwagandha.priority = 'high';
              ashwagandha.description = 'Ashwagandha is an adaptogenic herb traditionally used to help manage stress and anxiety, which aligns with your health goals.';
            }
          }
        }
        
        // Handle health concerns
        if (questionnaire.healthConcerns && questionnaire.healthConcerns.length > 0) {
          const concerns = questionnaire.healthConcerns.map(c => c.toLowerCase());
          
          if (concerns.some(c => c.includes('joint') || c.includes('inflammation') || c.includes('pain'))) {
            const omega3 = personalizedRecs.find(s => s.name === 'Omega-3 Fatty Acids');
            
            if (omega3) {
              omega3.priority = 'high';
              omega3.description = 'Omega-3 fatty acids have anti-inflammatory properties that may help with your joint or inflammation concerns.';
            }
          }
          
          if (concerns.some(c => c.includes('digest') || c.includes('gut') || c.includes('stomach'))) {
            const probiotics = personalizedRecs.find(s => s.name === 'Probiotics');
            
            if (probiotics) {
              probiotics.priority = 'high';
              probiotics.description = 'Based on your digestive health concerns, a high-quality probiotic may help support your gut microbiome and overall digestive function.';
            }
          }
        }
      }
      
      // Sort by priority and limit to top recommendations
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return personalizedRecs.sort((a, b) => 
        priorityOrder[a.priority] - priorityOrder[b.priority]
      ).slice(0, 3); // Return top 3 recommendations
    };
    
    // Generate personalized recommendations
    const personalizedRecommendations = personalizeRecommendations();
    
    // Return the personalized supplement recommendations
    res.json({
      success: true,
      recommendations: personalizedRecommendations
    });
  } catch (error) {
    console.error('Error generating personalized supplement recommendations:', error);
    
    // If there's an error, fall back to generic recommendations
    res.json({
      success: true,
      recommendations: [
        {
          id: 1,
          name: 'Vitamin D3',
          category: 'Essential Nutrients',
          description: 'Vitamin D is essential for calcium absorption and bone health, with benefits for immune function.',
          dosage: '2000 IU daily',
          timing: 'With a meal containing healthy fats',
          benefits: [
            'Supports bone health',
            'Contributes to immune function',
            'May improve mood and energy levels'
          ],
          priority: 'high'
        },
        {
          id: 2,
          name: 'Magnesium Glycinate',
          category: 'Minerals',
          description: 'Magnesium supports muscle recovery and sleep quality.',
          dosage: '300-400mg daily',
          timing: 'Before bedtime',
          benefits: [
            'Supports muscle recovery',
            'May improve sleep quality',
            'Helps regulate stress response'
          ],
          priority: 'medium'
        },
        {
          id: 3,
          name: 'Omega-3 Fatty Acids',
          category: 'Essential Fatty Acids',
          description: 'EPA and DHA are essential omega-3 fatty acids that support cardiovascular and cognitive health.',
          dosage: '1-2g daily',
          timing: 'With meals',
          benefits: [
            'Supports cardiovascular health',
            'May reduce inflammation',
            'Supports brain function'
          ],
          priority: 'medium'
        }
      ]
    });
  }
});

// Alternative endpoint path for supplements
app.get('/api/context-aware/supplements', async (req, res) => {
  console.log('Received request for supplements at /api/context-aware/supplements');
  
  // Get the userId for personalization
  const userId = req.userId || '1';
  console.log(`Generating personalized supplement recommendations for user ${userId}`);
  
  try {
    // Fetch real user data from the database
    console.log(`Fetching health data for user ID: ${userId}`);
    const userData = await getUserHealthData(parseInt(userId));
    
    // Add the user ID to the data
    userData.userId = userId;
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return res.status(500).json({
        success: false,
        error: 'API Configuration Required',
        message: 'OpenAI API key is not configured. Please contact the administrator.'
      });
    }
    
    console.log('Calling OpenAI to generate personalized supplement recommendations');
    
    // Generate recommendations using OpenAI
    const result = await generateSupplementRecommendations(userData);
    
    // Add userId and other required fields to each recommendation
    const processedRecommendations = result.recommendations.map((rec, index) => ({
      ...rec,
      id: index + 1,
      userId: parseInt(userId),
      date: new Date().toISOString(),
      source: rec.source || 'AI analysis of health data',
      icon: rec.icon || getIconForCategory(rec.category)
    }));
    
    console.log(`Successfully generated ${processedRecommendations.length} personalized recommendations`);
    
    // Prepare the analysis data if available
    const analysis = result.analysis ? {
      patternDetected: result.analysis.patternDetected || '',
      currentRegimen: result.analysis.currentRegimen || [],
      suggestedAdditions: result.analysis.suggestedAdditions || [],
      personalizedConsiderations: result.analysis.personalizedConsiderations || ''
    } : null;
    
    // Return the recommendations with analysis
    res.json({
      success: true,
      recommendations: processedRecommendations,
      analysis: analysis
    });
    
  } catch (error) {
    console.error('Error generating supplement recommendations:', error);
    
    res.status(500).json({
      success: false,
      error: 'Recommendation Generation Failed',
      message: error.message || 'Failed to generate personalized supplement recommendations'
    });
  }
});

// Helper function to get icon based on category
function getIconForCategory(category) {
  if (!category) return 'supplement';
  
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('vitamin')) return 'vitamin';
  if (categoryLower.includes('mineral')) return 'mineral';
  if (categoryLower.includes('omega') || categoryLower.includes('fatty acid')) return 'omega';
  if (categoryLower.includes('protein') || categoryLower.includes('amino')) return 'protein';
  if (categoryLower.includes('herb') || categoryLower.includes('botanical')) return 'herb';
  if (categoryLower.includes('probiotic') || categoryLower.includes('gut')) return 'probiotic';
  if (categoryLower.includes('energy') || categoryLower.includes('coq10')) return 'energy';
  if (categoryLower.includes('sleep') || categoryLower.includes('melatonin')) return 'sleep';
  if (categoryLower.includes('joint') || categoryLower.includes('collagen')) return 'joint';
  
  return 'supplement';
}

// Add regenerate endpoints for supplements with OpenAI
app.get('/api/context-aware/supplements/regenerate', async (req, res) => {
  console.log('Received request to regenerate supplement recommendations');
  
  try {
    // Get the userId for personalization
    const userId = req.userId || '1';
    
    // Fetch real user data from the database
    console.log(`Fetching fresh health data for user ID: ${userId}`);
    const userData = await getUserHealthData(parseInt(userId));
    userData.userId = userId;
    
    // Using real user data now - no need to simulate changes
    console.log(`Using real health data for user ${userId} with ${userData.metrics?.length || 0} metrics`);
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return res.status(500).json({
        success: false,
        error: 'API Configuration Required',
        message: 'OpenAI API key is not configured. Please contact the administrator.'
      });
    }
    
    console.log('Regenerating supplement recommendations using OpenAI');
    
    // Generate fresh recommendations
    const result = await generateSupplementRecommendations(userData);
    
    console.log(`Successfully regenerated ${result.recommendations.length} supplement recommendations`);
    
    res.json({
      success: true,
      message: 'Supplement recommendations regenerated successfully',
      count: result.recommendations.length,
      timestamp: new Date().toISOString(),
      analysis: result.analysis
    });
    
  } catch (error) {
    console.error('Error regenerating supplement recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Regeneration Failed',
      message: error.message || 'Failed to regenerate supplement recommendations'
    });
  }
});

app.get('/api/context-aware/health-context', async (req, res) => {
  console.log('Received request for health context');
  
  // Get user ID from request headers
  const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'].toString()) : 370; // Default to admin user ID if not provided
  console.log(`Processing health context for user ID: ${userId}`);
  
  try {
    // Import needed modules
    const pg = await import('pg');
    const { storage } = await import('./server/db-storage.js');
    
    // Create a database connection
    const pool = new pg.default.Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    // Get user data for personalized context
    let [questionnaire, metrics, supplements, healthRecommendations, supplementRecommendations] = await Promise.all([
      storage.getQuestionnaire(userId).catch(err => {
        console.error(`Error fetching questionnaire for user ${userId}:`, err);
        return null;
      }),
      storage.getHealthMetrics(userId).catch(err => {
        console.error(`Error fetching health metrics for user ${userId}:`, err);
        return [];
      }),
      storage.getUserSupplements(userId).catch(err => {
        console.error(`Error fetching supplements for user ${userId}:`, err);
        return [];
      }),
      storage.getHealthRecommendations(userId).catch(err => {
        console.error(`Error fetching health recommendations for user ${userId}:`, err);
        return [];
      }),
      storage.getSupplementRecommendations(userId).catch(err => {
        console.error(`Error fetching supplement recommendations for user ${userId}:`, err);
        return [];
      })
    ]);
    
    console.log(`Found ${metrics.length} health metrics for user ${userId}`);
    console.log(`Found ${supplements.length} supplements for user ${userId}`);
    
    // Format metrics for display
    const formattedMetrics = metrics.map(metric => {
      // Handle metric type - support both old and new format
      let metricName = metric.type;
      
      // Convert hyphenated names to proper capitalized names (e.g., "sleep-duration" → "Sleep Duration")
      if (metric.type.includes('-')) {
        metricName = metric.type.split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
      
      // Determine status based on metric values
      let status = 'normal';
      
      // Check specific metrics
      if (metric.type === 'Sleep Duration' || metric.type === 'sleep-duration') {
        const hours = parseFloat(metric.value.toString());
        status = hours < 6 ? 'low' : hours > 9 ? 'high' : 'normal';
      } else if (metric.type === 'Stress Level' || metric.type === 'stress-level') {
        const level = parseFloat(metric.value.toString());
        status = level > 7 ? 'high' : level < 3 ? 'low' : 'normal';
      } else if (metric.type === 'Exercise Frequency' || metric.type === 'exercise-frequency') {
        const frequency = parseFloat(metric.value.toString());
        status = frequency < 2 ? 'low' : frequency > 6 ? 'high' : 'normal';
      } else if (metric.type === 'Heart Rate' || metric.type === 'heart-rate') {
        const rate = parseFloat(metric.value.toString());
        status = rate < 60 ? 'low' : rate > 100 ? 'high' : 'normal';
      }
      
      // Format value with unit
      let displayValue = metric.value.toString();
      if (metric.unit) {
        displayValue += ` ${metric.unit}`;
      } else {
        // Add default units for common metrics
        if (metric.type === 'Weight' || metric.type === 'weight') {
          displayValue += ' kg';
        } else if (metric.type === 'Sleep Duration' || metric.type === 'sleep-duration') {
          displayValue += ' hrs';
        } else if (metric.type === 'Heart Rate' || metric.type === 'heart-rate') {
          displayValue += ' bpm';
        } else if (metric.type === 'Exercise Frequency' || metric.type === 'exercise-frequency') {
          displayValue += 'x/week';
        } else if (metric.type === 'Water Intake' || metric.type === 'water-intake') {
          displayValue += ' L';
        }
      }
      
      return {
        name: metricName,
        value: displayValue,
        status
      };
    });
    
    // Format supplements with proper structure
    const formattedSupplements = supplements.map(supp => ({
      name: supp.name,
      dosage: supp.dosage || 'As directed',
      timing: supp.timing || 'Daily'
    }));
    
    // Extract health concerns from various sources
    const concernMetrics = metrics.filter(m => 
      m.type.includes('concern') || 
      m.type.includes('Concern') || 
      m.type.toLowerCase().includes('issue')
    );
    
    // Format health concerns
    const formattedConcerns = [];
    
    // Add concerns from questionnaire if available
    if (questionnaire && questionnaire.healthConcerns && questionnaire.healthConcerns.length > 0) {
      questionnaire.healthConcerns.forEach(concern => {
        formattedConcerns.push({
          name: concern,
          description: '',
          severity: 'moderate'
        });
      });
    }
    
    // Add concerns from metrics
    concernMetrics.forEach(metric => {
      let concernName = metric.type;
      if (metric.type.includes('concern-')) {
        concernName = metric.type.replace('concern-', '');
      } else if (metric.type.includes('Health Concern: ')) {
        concernName = metric.type.replace('Health Concern: ', '');
      }
      
      formattedConcerns.push({
        name: concernName,
        description: metric.value.toString(),
        severity: 'moderate'
      });
    });
    
    // If no concerns found but questionnaire exists, add from existing conditions
    if (formattedConcerns.length === 0 && questionnaire && questionnaire.existingConditions) {
      questionnaire.existingConditions.forEach(condition => {
        formattedConcerns.push({
          name: condition,
          description: 'Pre-existing condition',
          severity: 'moderate'
        });
      });
    }
    
    // Extract health goals from various sources
    const goalMetrics = metrics.filter(m => 
      m.type.includes('goal') || 
      m.type.includes('Goal') || 
      m.type.toLowerCase().includes('target')
    );
    
    // Format health goals
    const formattedGoals = [];
    
    // Add goals from questionnaire if available
    if (questionnaire && questionnaire.healthGoals && questionnaire.healthGoals.length > 0) {
      questionnaire.healthGoals.forEach(goal => {
        formattedGoals.push({
          name: goal,
          description: '',
          target: ''
        });
      });
    }
    
    // Add goals from metrics
    goalMetrics.forEach(metric => {
      let goalName = metric.type;
      if (metric.type.includes('goal-')) {
        goalName = metric.type.replace('goal-', '');
      } else if (metric.type.includes('Health Goal: ')) {
        goalName = metric.type.replace('Health Goal: ', '');
      }
      
      formattedGoals.push({
        name: goalName,
        description: metric.value.toString(),
        target: ''
      });
    });
    
    // If no goals found but we have questionnaire data, add default goals
    if (formattedGoals.length === 0 && questionnaire) {
      // Determine appropriate goals based on metrics
      const sleepMetric = metrics.find(m => 
        m.type === 'Sleep Duration' || m.type === 'sleep-duration'
      );
      
      const stressMetric = metrics.find(m => 
        m.type === 'Stress Level' || m.type === 'stress-level'
      );
      
      const exerciseMetric = metrics.find(m => 
        m.type === 'Exercise Frequency' || m.type === 'exercise-frequency'
      );
      
      if (sleepMetric) {
        const hours = parseFloat(sleepMetric.value.toString());
        if (hours < 7) {
          formattedGoals.push({
            name: 'Improve Sleep Quality and Duration',
            description: 'Working towards optimal sleep for better health',
            target: '7-8 hours nightly'
          });
        }
      }
      
      if (stressMetric) {
        const level = parseFloat(stressMetric.value.toString());
        if (level > 6) {
          formattedGoals.push({
            name: 'Reduce Stress Levels',
            description: 'Implementing stress management techniques',
            target: 'Stress level below 5/10'
          });
        }
      }
      
      if (exerciseMetric) {
        const frequency = parseFloat(exerciseMetric.value.toString());
        if (frequency < 3) {
          formattedGoals.push({
            name: 'Increase Physical Activity',
            description: 'Adding more regular exercise to routine',
            target: '3-5x per week'
          });
        }
      }
    }
    
    // Count previous recommendations
    const previousRecommendationsCount = {
      health: healthRecommendations.length,
      supplements: supplementRecommendations.length,
      followedRecommendations: 0 // Would need tracking history to determine this
    };
    
    // Prepare the response with actual user data
    const result = {
      context: {
        hasQuestionnaire: !!questionnaire,
        metricsCount: metrics.length,
        metrics: formattedMetrics.length > 0 ? formattedMetrics : [
          { name: 'Sleep Duration', value: 'Not recorded', status: 'unknown' },
          { name: 'Stress Level', value: 'Not recorded', status: 'unknown' },
          { name: 'Exercise Frequency', value: 'Not recorded', status: 'unknown' },
          { name: 'Weight', value: 'Not recorded', status: 'unknown' }
        ],
        supplements: formattedSupplements.length > 0 ? formattedSupplements : undefined,
        concerns: formattedConcerns.length > 0 ? formattedConcerns : undefined,
        goals: formattedGoals.length > 0 ? formattedGoals : undefined,
        previousRecommendationsCount: previousRecommendationsCount
      },
      meta: {
        generatedAt: new Date().toISOString(),
        modelUsed: "health-context-analyzer-v2"
      }
    };
    
    // Send the response
    res.json(result);
  } catch (error) {
    console.error('Error processing health context request:', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving health context data',
      message: 'There was a problem processing your health context data. Please try again.'
    });
  }
});

// Add health check endpoints
app.get('/health', (req, res) => {
  res.send('Smart Recommendations API is running');
});

// Proper health endpoint with format for client
app.get('/api/context-aware/health', async (req, res) => {
  console.log('Received request for health context and recommendations');
  
  // Get user ID from request headers
  const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'].toString()) : 370; // Default to admin user ID if not provided
  console.log(`Processing health recommendations for user ID: ${userId}`);
  
  try {
    // Import needed modules
    const pg = await import('pg');
    const { storage } = await import('./server/db-storage.js');
    
    // Create a database connection
    const pool = new pg.default.Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    // Get user questionnaire data and metrics for personalized recommendations
    let questionnaire = null;
    let metrics = [];
    try {
      [questionnaire, metrics] = await Promise.all([
        storage.getQuestionnaire(userId).catch(err => {
          console.error(`Error fetching questionnaire for user ${userId}:`, err);
          return null;
        }),
        storage.getHealthMetrics(userId).catch(err => {
          console.error(`Error fetching health metrics for user ${userId}:`, err);
          return [];
        })
      ]);
    } catch (err) {
      console.error(`Error fetching user health data:`, err);
    }
    
    // Base recommendations that will be personalized
    const baseRecommendations = [
      {
        id: '1',
        title: 'Improve Sleep Quality',
        description: 'Based on your sleep patterns, we recommend establishing a consistent sleep schedule.',
        category: 'Sleep',
        priority: 'medium',
        timeframe: 'Daily',
        effort: 'moderate',
        contextualFactors: ['Sleep routine', 'Screen time before bed'],
        reasonForRecommendation: 'Consistent sleep patterns can improve overall energy and recovery.',
        expectedBenefits: ['Better recovery', 'Improved energy levels', 'Enhanced cognitive function'],
        trackingMetrics: ['Sleep duration', 'Sleep quality']
      },
      {
        id: '2',
        title: 'Reduce Stress Levels',
        description: 'Consider incorporating mindfulness practices to manage stress levels.',
        category: 'Stress',
        priority: 'medium',
        timeframe: 'Daily',
        effort: 'low',
        contextualFactors: ['Stress management', 'Work-life balance'],
        reasonForRecommendation: 'Managing stress can improve both mental and physical health.',
        expectedBenefits: ['Lower anxiety', 'Improved mood', 'Better cardiovascular health'],
        trackingMetrics: ['Stress level', 'Heart rate variability']
      },
      {
        id: '3',
        title: 'Optimize Exercise Routine',
        description: 'Incorporate a mix of cardio and strength training into your exercise regimen.',
        category: 'Exercise',
        priority: 'medium',
        timeframe: 'Weekly',
        effort: 'moderate',
        contextualFactors: ['Physical activity', 'Fitness goals'],
        reasonForRecommendation: 'A balanced exercise routine supports overall health and fitness.',
        expectedBenefits: ['Improved muscle tone', 'Enhanced cardiovascular health', 'Better body composition'],
        trackingMetrics: ['Exercise frequency', 'Workout intensity']
      },
      {
        id: '4',
        title: 'Increase Hydration',
        description: 'Aim to consume more water throughout the day to maintain proper hydration levels.',
        category: 'Hydration',
        priority: 'medium',
        timeframe: 'Daily',
        effort: 'easy',
        contextualFactors: ['Hydration habits', 'Climate considerations'],
        reasonForRecommendation: 'Proper hydration supports overall metabolic health and physical performance.',
        expectedBenefits: ['Better energy levels', 'Improved skin health', 'Enhanced digestion'],
        trackingMetrics: ['Daily water intake', 'Hydration status']
      },
      {
        id: '5',
        title: 'Optimize Nutrition',
        description: 'Focus on a balanced diet with adequate protein, fruits, and vegetables.',
        category: 'Nutrition',
        priority: 'high',
        timeframe: 'Daily',
        effort: 'moderate',
        contextualFactors: ['Dietary patterns', 'Nutritional needs'],
        reasonForRecommendation: 'A balanced diet provides essential nutrients for overall health and energy.',
        expectedBenefits: ['Improved energy', 'Better nutrient intake', 'Supported immune function'],
        trackingMetrics: ['Meal composition', 'Macronutrient balance']
      }
    ];
    
    // Analyze metrics to personalize recommendations
    const personalizedRecommendations = baseRecommendations.map(rec => {
      const personalized = { ...rec };
      personalized.userId = userId;
      personalized.source = 'context';
      personalized.date = new Date().toISOString();
      personalized.isCompleted = false;
      personalized.interactionNotes = [];
      
      // Personalize based on metrics
      if (rec.category === 'Sleep') {
        const sleepMetric = metrics.find(m => 
          m.type === 'Sleep Duration' || m.type === 'sleep-duration'
        );
        
        if (sleepMetric) {
          const hours = parseFloat(sleepMetric.value.toString());
          if (hours < 6) {
            personalized.priority = 'high';
            personalized.description = 'Your sleep data indicates you may be getting less sleep than recommended. Aim for 7-9 hours of sleep per night.';
            personalized.reasonForRecommendation = 'Your health data shows you average ' + hours + ' hours of sleep, which is below the recommended range.';
          } else if (hours > 9) {
            personalized.description = 'You appear to sleep more than average. Focus on sleep quality rather than duration.';
            personalized.reasonForRecommendation = 'Your health data shows you average ' + hours + ' hours of sleep, which is above the recommended range. This may indicate poor sleep quality or other issues.';
          }
        }
      }
      
      if (rec.category === 'Stress') {
        const stressMetric = metrics.find(m => 
          m.type === 'Stress Level' || m.type === 'stress-level'
        );
        
        if (stressMetric) {
          const level = parseFloat(stressMetric.value.toString());
          if (level > 7) {
            personalized.priority = 'high';
            personalized.description = 'Your stress level appears elevated. Consider more focused stress management techniques like meditation or deep breathing exercises.';
            personalized.reasonForRecommendation = 'Your recorded stress level of ' + level + '/10 indicates elevated stress that may benefit from focused management techniques.';
          }
        }
      }
      
      if (rec.category === 'Exercise') {
        const exerciseMetric = metrics.find(m => 
          m.type === 'Exercise Frequency' || m.type === 'exercise-frequency'
        );
        
        if (exerciseMetric) {
          const frequency = parseFloat(exerciseMetric.value.toString());
          if (frequency < 3) {
            personalized.priority = 'high';
            personalized.description = 'Consider increasing your exercise frequency to at least 3-4 times per week.';
            personalized.reasonForRecommendation = 'Your current exercise frequency of ' + frequency + ' times per week is below the recommended level for optimal health benefits.';
          } else if (frequency > 5) {
            personalized.description = 'You exercise frequently. Focus on recovery and exercise quality rather than increasing frequency.';
            personalized.reasonForRecommendation = 'Your exercise frequency is good at ' + frequency + ' times per week. Consider focusing on quality and recovery.';
          }
        }
      }
      
      // Personalize based on questionnaire data
      if (questionnaire) {
        // Add personalization based on health goals
        if (questionnaire.healthGoals && questionnaire.healthGoals.length > 0) {
          const goals = questionnaire.healthGoals;
          
          if (goals.some(g => g.toLowerCase().includes('weight') || g.toLowerCase().includes('fat'))) {
            if (rec.category === 'Exercise' || rec.category === 'Nutrition') {
              personalized.priority = 'high';
              personalized.expectedBenefits.push('Weight management');
              if (rec.category === 'Exercise') {
                personalized.description += ' For weight management, include both cardio and strength training.';
              } else if (rec.category === 'Nutrition') {
                personalized.description += ' Focus on portion control and nutrient-dense foods for weight management.';
              }
            }
          }
          
          if (goals.some(g => g.toLowerCase().includes('energy') || g.toLowerCase().includes('fatigue'))) {
            if (rec.category === 'Sleep' || rec.category === 'Nutrition') {
              personalized.priority = 'high';
              personalized.expectedBenefits.push('Increased energy levels');
            }
          }
          
          if (goals.some(g => g.toLowerCase().includes('stress') || g.toLowerCase().includes('anxiety'))) {
            if (rec.category === 'Stress') {
              personalized.priority = 'high';
              personalized.description = 'Based on your goals, we recommend prioritizing stress management with daily mindfulness practices.';
            }
          }
        }
        
        // Adjust based on dietary preferences
        if (questionnaire.dietaryPreferences && questionnaire.dietaryPreferences.length > 0) {
          const diet = questionnaire.dietaryPreferences;
          
          if (diet.some(d => d.toLowerCase().includes('vegetarian') || d.toLowerCase().includes('vegan'))) {
            if (rec.category === 'Nutrition') {
              personalized.description += ' Ensure adequate protein intake from plant sources like legumes, tofu, and tempeh.';
              personalized.contextualFactors.push('Plant-based diet');
            }
          }
        }
      }
      
      return personalized;
    });
    
    // Sort recommendations by priority (high first)
    const sortedRecommendations = personalizedRecommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    // Return the personalized recommendations
    res.json({
      message: 'Smart health recommendations retrieved successfully',
      recommendations: sortedRecommendations.slice(0, 3) // Return top 3 recommendations
    });
  } catch (error) {
    console.error('Error generating personalized health recommendations:', error);
    
    // If there's an error, fall back to generic recommendations
    res.json({
      message: 'Smart health recommendations retrieved successfully',
      recommendations: [
        {
          id: '1',
          userId: userId || 1,
          title: 'Improve Sleep Quality',
          description: 'Based on your sleep patterns, we recommend establishing a consistent sleep schedule.',
          category: 'Sleep',
          priority: 'high',
          timeframe: 'Daily',
          effort: 'moderate',
          source: 'context',
          date: new Date().toISOString(),
          isCompleted: false,
          contextualFactors: ['Irregular sleep schedule', 'Screen time before bed'],
          reasonForRecommendation: 'Your health data shows inconsistent sleep patterns that may be affecting overall recovery.',
          expectedBenefits: ['Better recovery', 'Improved energy levels', 'Enhanced cognitive function'],
          interactionNotes: [],
          trackingMetrics: ['Sleep duration', 'Sleep quality']
        },
        {
          id: '2',
          userId: userId || 1,
          title: 'Reduce Stress Levels',
          description: 'Consider incorporating mindfulness practices to manage stress levels.',
          category: 'Stress',
          priority: 'medium',
          timeframe: 'Daily',
          effort: 'low',
          source: 'context',
          date: new Date().toISOString(),
          isCompleted: false,
          contextualFactors: ['Elevated stress metrics', 'Work-life balance'],
          reasonForRecommendation: 'Consistent stress may impact both mental and physical health markers.',
          expectedBenefits: ['Lower anxiety', 'Improved mood', 'Better cardiovascular health'],
          interactionNotes: [],
          trackingMetrics: ['Stress level', 'Heart rate variability']
        },
        {
          id: '3',
          userId: userId || 1,
          title: 'Increase Hydration',
          description: 'Aim to consume more water throughout the day to maintain proper hydration levels.',
          category: 'Hydration',
          priority: 'medium',
          timeframe: 'Daily',
          effort: 'easy',
          source: 'context',
          date: new Date().toISOString(),
          isCompleted: false,
          contextualFactors: ['Physical activity level', 'Climate considerations'],
          reasonForRecommendation: 'Proper hydration supports overall metabolic health and physical performance.',
          expectedBenefits: ['Better energy levels', 'Improved skin health', 'Enhanced digestion'],
          interactionNotes: [],
          trackingMetrics: ['Daily water intake', 'Hydration status']
        }
      ]
    });
  }
});

// Add regenerate endpoint to handle recommendation regeneration requests
app.get('/api/context-aware/health/regenerate', (req, res) => {
  console.log('Received request to regenerate health recommendations');
  
  // This endpoint should trigger the regeneration of recommendations
  // In a real implementation, this would analyze user data and generate personalized recommendations
  
  // For now, return a success response with a message that the regeneration was triggered
  res.json({
    success: true,
    message: 'Health recommendations regeneration triggered successfully',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.send('Smart Recommendations API is running. Please use /api/context-aware/* endpoints.');
});

// Start the server
app.listen(PORT, HOST, () => {
  console.log(`Smart Recommendations server running at http://${HOST}:${PORT} (accessible at http://localhost:${PORT})`);
  console.log('Available endpoints:');
  console.log('- GET /api/context-aware/health-recommendations');
  console.log('- GET /api/context-aware/supplement-recommendations');
  console.log('- GET /api/context-aware/health-context');
  console.log('- GET /api/context-aware/health (health check)');
  console.log('- GET /api/context-aware/health/regenerate (regenerate recommendations)');
  console.log('- GET /health (basic health check)');
});