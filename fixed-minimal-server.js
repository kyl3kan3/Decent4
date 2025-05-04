/**
 * Minimal Smart Recommendations Server - ESM Version
 */

import express from 'express';
const app = express();
const PORT = 3007;

console.log('Starting Smart Recommendations server on port 3007...');

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

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Smart Recommendations server is running' });
});

// Health context endpoint
app.get('/api/context-aware/health-context', (req, res) => {
  try {
    // Get user ID from request headers or use default
    const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'].toString()) : 1;
    console.log(`Processing health context for user ${userId}`);
    
    // Return a basic health context structure
    const healthContext = {
      context: {
        hasQuestionnaire: true,
        metricsCount: 5,
        metrics: [
          {
            name: 'Sleep Duration',
            value: '7 hours',
            status: 'optimal'
          },
          {
            name: 'Stress Level',
            value: '6/10',
            status: 'elevated'
          },
          {
            name: 'Exercise Frequency',
            value: '3 times/week',
            status: 'good'
          },
          {
            name: 'Weight',
            value: '70 kg',
            status: 'healthy'
          },
          {
            name: 'Heart Rate',
            value: '68 bpm',
            status: 'optimal'
          }
        ],
        supplements: [
          {
            name: 'Vitamin D',
            dosage: '2000 IU',
            timing: 'Morning'
          },
          {
            name: 'Magnesium',
            dosage: '300mg',
            timing: 'Evening'
          }
        ],
        concerns: [
          {
            name: 'Energy levels',
            description: 'Experiencing fatigue in afternoons',
            severity: 'moderate'
          },
          {
            name: 'Sleep quality',
            description: 'Occasional difficulty falling asleep',
            severity: 'mild'
          }
        ],
        goals: [
          {
            name: 'Improve energy',
            description: 'Maintain consistent energy throughout the day',
            target: 'Within 1 month'
          },
          {
            name: 'Reduce stress',
            description: 'Implement stress management techniques',
            target: 'Ongoing'
          }
        ],
        previousRecommendationsCount: {
          health: 8,
          supplements: 5,
          followedRecommendations: 3
        }
      },
      meta: {
        generatedAt: new Date().toISOString(),
        modelUsed: 'context-analyzer-v1'
      }
    };
    
    res.json(healthContext);
  } catch (error) {
    console.error('Error in health context endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve health context',
      message: error.message
    });
  }
});

// Health recommendations endpoint
app.get('/api/context-aware/health', (req, res) => {
  try {
    // Get user ID from request headers or use default
    const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'].toString()) : 1;
    console.log(`Processing health recommendations for user ${userId}`);

    // Base health recommendations
    const healthRecommendations = [
      {
        id: '1',
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
        id: '2',
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
        id: '3',
        category: 'Exercise',
        title: 'Incorporate Regular Physical Activity',
        description: 'Regular exercise improves cardiovascular health, mood, and energy levels.',
        content: 'Aim for at least 150 minutes of moderate activity or 75 minutes of vigorous activity weekly, along with 2 days of strength training.',
        actionText: 'Schedule 30 minutes of activity most days of the week.',
        reasonForRecommendation: 'Regular physical activity reduces the risk of chronic disease and improves overall well-being.',
        priority: 'medium',
        tags: ['exercise', 'fitness', 'cardiovascular health']
      }
    ];
    
    // Response with recommendations
    res.json({
      recommendations: healthRecommendations,
      message: "Retrieved context-aware health recommendations"
    });
  } catch (error) {
    console.error('Error in health recommendations endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to generate health recommendations',
      message: error.message
    });
  }
});

// Supplement recommendations endpoint
app.get('/api/context-aware/supplements', (req, res) => {
  try {
    // Get user ID from request headers or use default
    const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'].toString()) : 1;
    console.log(`Processing supplement recommendations for user ${userId}`);
    
    // Base supplement recommendations
    const supplementRecommendations = [
      {
        id: '1',
        name: 'Vitamin D3',
        description: 'Supports immune function, bone health, and mood regulation.',
        dosage: '2000-4000 IU daily',
        timing: 'With a meal containing fat for better absorption',
        priority: 'high',
        benefits: [
          'Bone health support',
          'Immune system regulation',
          'Mood improvement',
          'Potential reduction in seasonal affective disorder symptoms'
        ],
        cautions: [
          'Excessive doses may cause calcium buildup',
          'May interact with certain medications'
        ],
        contextualFactors: [
          'Limited sun exposure',
          'Living in northern latitudes',
          'Indoor lifestyle'
        ],
        evidenceLevel: 'strong'
      },
      {
        id: '2',
        name: 'Magnesium Glycinate',
        description: 'Supports sleep quality, stress reduction, and muscle recovery.',
        dosage: '300-400mg daily',
        timing: 'In the evening or before bed',
        priority: 'medium',
        benefits: [
          'Improved sleep quality',
          'Muscle relaxation',
          'Stress reduction',
          'Support for over 300 enzymatic reactions in the body'
        ],
        cautions: [
          'May cause digestive upset in some people',
          'Should be used cautiously with certain medications'
        ],
        contextualFactors: [
          'Stress levels',
          'Sleep quality concerns',
          'Muscle tension or cramps'
        ],
        evidenceLevel: 'moderate'
      },
      {
        id: '3',
        name: 'Omega-3 Fish Oil',
        description: 'Supports cardiovascular health, brain function, and inflammation reduction.',
        dosage: '1-2g of combined EPA/DHA daily',
        timing: 'With meals to reduce potential fishy aftertaste',
        priority: 'medium',
        benefits: [
          'Cardiovascular support',
          'Anti-inflammatory effects',
          'Brain health and cognitive function',
          'Joint health'
        ],
        cautions: [
          'May have blood-thinning effects',
          'Should be temporarily discontinued before surgery'
        ],
        contextualFactors: [
          'Limited fatty fish consumption',
          'Inflammatory conditions',
          'Cardiovascular health concerns'
        ],
        evidenceLevel: 'strong'
      }
    ];
    
    // Response with recommendations
    res.json({
      recommendations: supplementRecommendations,
      message: "Retrieved context-aware supplement recommendations"
    });
  } catch (error) {
    console.error('Error in supplement recommendations endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to generate supplement recommendations',
      message: error.message
    });
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Smart Recommendations server running at http://0.0.0.0:${PORT}`);
  console.log('Available endpoints:');
  console.log('- GET /api/context-aware/health-context');
  console.log('- GET /api/context-aware/health (health recommendations)');
  console.log('- GET /api/context-aware/supplements (supplement recommendations)');
  console.log('- GET /health (basic health check)');
});