/**
 * Direct Smart Recommendations Server
 * This is a simplified direct starter that doesn't rely on the runner script
 */

const express = require('express');
const app = express();
const PORT = 3007;

console.log('Starting Smart Recommendations server on port 3007...');

// Add middleware for parsing JSON and handling CORS
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Smart recommendations endpoints
app.get('/api/context-aware/health-recommendations', (req, res) => {
  console.log('Received request for health recommendations');
  res.json({
    success: true,
    recommendations: [
      {
        id: 1,
        category: 'Sleep',
        title: 'Improve Sleep Quality',
        description: 'Based on your health data, we recommend establishing a consistent sleep schedule.',
        actionItems: [
          'Go to bed at the same time each night',
          'Avoid screens 1 hour before bedtime',
          'Keep your bedroom cool and dark'
        ],
        priority: 'high'
      },
      {
        id: 2,
        category: 'Stress',
        title: 'Stress Reduction Techniques',
        description: 'Consider incorporating mindfulness practices to manage stress levels.',
        actionItems: [
          'Practice 10 minutes of meditation daily',
          'Try deep breathing exercises when feeling overwhelmed',
          'Consider a regular yoga practice'
        ],
        priority: 'medium'
      },
      {
        id: 3,
        category: 'Exercise',
        title: 'Optimize Exercise Routine',
        description: 'Incorporate more strength training into your current exercise regimen.',
        actionItems: [
          'Add 2 strength training sessions per week',
          'Focus on compound movements',
          'Include proper warm-up and cool-down'
        ],
        priority: 'medium'
      }
    ]
  });
});

app.get('/api/context-aware/supplement-recommendations', (req, res) => {
  console.log('Received request for supplement recommendations');
  res.json({
    success: true,
    recommendations: [
      {
        id: 1,
        name: 'Vitamin D',
        description: 'A fat-soluble vitamin that is crucial for calcium absorption and bone health.',
        reasoning: 'Based on your questionnaire, you have limited sun exposure.',
        dosage: '1000-2000 IU daily with food',
        warnings: 'Do not exceed 4000 IU daily without medical supervision.'
      },
      {
        id: 2,
        name: 'Magnesium',
        description: 'An essential mineral involved in over 300 enzyme reactions in the body.',
        reasoning: 'Your sleep metrics suggest potential benefit from magnesium supplementation.',
        dosage: '200-400mg daily, preferably in the evening',
        warnings: 'May cause digestive upset in some individuals.'
      },
      {
        id: 3,
        name: 'Omega-3 Fatty Acids',
        description: 'Essential fatty acids important for heart and brain health.',
        reasoning: 'Your diet questionnaire indicates low intake of fatty fish.',
        dosage: '1000-2000mg daily with food',
        warnings: 'May interact with blood-thinning medications.'
      }
    ]
  });
});

app.get('/api/context-aware/health-context', (req, res) => {
  console.log('Received request for health context');
  res.json({
    success: true,
    context: {
      metrics: [
        { name: 'Sleep Duration', value: '6.5 hours', status: 'moderate' },
        { name: 'Stress Level', value: 'Elevated', status: 'moderate' },
        { name: 'Exercise Frequency', value: '3 times/week', status: 'good' },
        { name: 'Weight', value: '165 lbs', status: 'good' }
      ],
      questionnaire: {
        completed: true,
        keyInsights: [
          'Reports difficulty falling asleep',
          'Moderate stress at work',
          'Limited sun exposure',
          'Low intake of fatty fish'
        ]
      },
      healthConcerns: [
        'Improve sleep quality',
        'Reduce stress levels',
        'Increase energy throughout the day'
      ],
      supplements: [
        { name: 'Multivitamin', frequency: 'Daily' }
      ],
      medications: []
    }
  });
});

// Add a basic health check endpoint
app.get('/health', (req, res) => {
  res.send('Smart Recommendations API is running');
});

app.get('/', (req, res) => {
  res.send('Smart Recommendations API is running. Please use /api/context-aware/* endpoints.');
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Smart Recommendations server running at http://0.0.0.0:${PORT}`);
  console.log('Available endpoints:');
  console.log('- GET /api/context-aware/health-recommendations');
  console.log('- GET /api/context-aware/supplement-recommendations');
  console.log('- GET /api/context-aware/health-context');
  console.log('- GET /health (health check)');
});