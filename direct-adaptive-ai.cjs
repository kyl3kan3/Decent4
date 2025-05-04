/**
 * Direct Adaptive AI Service Test
 * 
 * This script imports and uses the Adaptive AI Service directly without an Express server,
 * allowing us to test all optimization features:
 * 1. Model selection based on query complexity
 * 2. Performance caching with fingerprinting
 * 3. Batch processing for non-urgent requests
 * 4. Multi-service orchestration with fallbacks
 */

const AdaptiveAIService = require('./server/adaptive-ai-service.cjs');
const colors = require('colors');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Configuration
const TEST_USER_ID = 1;
const LOG_FILE = path.join(process.cwd(), 'logs', 'direct-ai-test.log');

// Ensure log directory exists
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Initialize service
console.log('Initializing Adaptive AI Service...');
const aiService = new AdaptiveAIService();

// Simple logging
function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString();
  const formattedMessage = `${timestamp} - ${message}`;
  console.log(color(formattedMessage));
  
  try {
    fs.appendFileSync(LOG_FILE, formattedMessage + '\n');
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

// Check if the service is healthy
async function checkHealth() {
  try {
    const health = await aiService.getHealth();
    
    log(`✅ AI Optimization Service is healthy`, colors.green);
    log(`Available services: ${Object.keys(health.orchestrator.services || {}).join(', ')}`, colors.cyan);
    return true;
  } catch (error) {
    log(`❌ Health check failed: ${error.message}`, colors.red);
    return false;
  }
}

// Test model selection based on complexity
async function testModelSelection() {
  log('\n▶️ Testing adaptive model selection based on query complexity', colors.cyan);
  
  const testCases = [
    {
      name: 'Simple query',
      expectedComplexity: 'low',
      messages: [
        { role: 'user', content: 'What are some healthy snacks?' }
      ]
    },
    {
      name: 'Medium complexity query',
      expectedComplexity: 'medium',
      messages: [
        { role: 'user', content: 'Can you compare the nutritional benefits of different protein sources like chicken, fish, beef, and plant-based proteins?' }
      ]
    },
    {
      name: 'Complex analytical query',
      expectedComplexity: 'high',
      messages: [
        { role: 'user', content: 'Analyze the relationship between exercise frequency, sleep duration, and stress levels. How do these factors interact to affect overall health and what would be the optimal balance for a 40-year-old office worker with mild hypertension?' }
      ]
    },
    {
      name: 'Very complex medical query',
      expectedComplexity: 'very_high',
      messages: [
        { role: 'system', content: 'You are a health advisor specialized in complex medical advice.' },
        { role: 'user', content: 'Provide a comprehensive analysis of the mechanisms through which intermittent fasting might affect patients with metabolic syndrome. Consider insulin sensitivity, inflammatory markers, lipid profiles, and potential contraindications for different patient profiles. Include scientific evidence and explain how the benefits compare to conventional dietary approaches for managing this condition.' }
      ]
    }
  ];
  
  for (const testCase of testCases) {
    try {
      log(`\nTesting: ${testCase.name}...`, colors.yellow);
      
      const startTime = performance.now();
      const response = await aiService.generateCompletion({
        userId: TEST_USER_ID,
        messages: testCase.messages,
        forceFresh: true,
        priority: 'high'
      });
      const endTime = performance.now();
      
      const executionTime = Math.round(endTime - startTime);
      
      log(`✅ Response received in ${executionTime}ms`, colors.green);
      log(`Model used: ${response.model} (${response.provider})`, colors.cyan);
      log(`Detected complexity: ${response.complexity}`, colors.cyan);
      
      // Verify complexity if provided in response
      if (response.complexity) {
        if (response.complexity === testCase.expectedComplexity) {
          log(`✅ Complexity matches expected value: ${response.complexity}`, colors.green);
        } else {
          log(`⚠️ Complexity ${response.complexity} doesn't match expected ${testCase.expectedComplexity}`, colors.yellow);
        }
      }
      
      // Log a preview of the response
      if (response.content) {
        const preview = response.content.substring(0, 100) + '...';
        log(`Response preview: ${preview}`, colors.gray);
      }
    } catch (error) {
      log(`❌ Test failed: ${error.message}`, colors.red);
    }
  }
}

// Test caching system
async function testCaching() {
  log('\n▶️ Testing performance caching system', colors.cyan);
  
  const testQuery = [
    { role: 'user', content: 'What are the best foods for cardiovascular health?' }
  ];
  
  try {
    // First request (cache miss)
    log('\nMaking first request (expected cache miss)...', colors.yellow);
    
    const startTime1 = performance.now();
    const response1 = await aiService.generateCompletion({
      userId: TEST_USER_ID,
      messages: testQuery,
      forceFresh: false
    });
    const endTime1 = performance.now();
    
    const executionTime1 = Math.round(endTime1 - startTime1);
    log(`✅ First request completed in ${executionTime1}ms`, colors.green);
    log(`Cached: ${response1.cached ? 'Yes' : 'No'}`, colors.cyan);
    
    // Second request (should be cache hit)
    log('\nMaking second identical request (expected cache hit)...', colors.yellow);
    
    const startTime2 = performance.now();
    const response2 = await aiService.generateCompletion({
      userId: TEST_USER_ID,
      messages: testQuery,
      forceFresh: false
    });
    const endTime2 = performance.now();
    
    const executionTime2 = Math.round(endTime2 - startTime2);
    log(`✅ Second request completed in ${executionTime2}ms`, colors.green);
    log(`Cached: ${response2.cached ? 'Yes' : 'No'}`, colors.cyan);
    
    if (response2.cached) {
      log(`Cache type: ${response2.cacheType}`, colors.cyan);
    }
    
    // Calculate improvement
    const improvement = executionTime1 > 0 ? 
      Math.round((executionTime1 - executionTime2) / executionTime1 * 100) : 0;
    
    log(`🚀 Performance improvement: ${improvement}% faster (${executionTime1}ms → ${executionTime2}ms)`, 
      improvement > 50 ? colors.green : colors.yellow);
    
    // Third request with slightly different wording (should trigger fingerprint match)
    const similarQuery = [
      { role: 'user', content: 'What are some good foods for heart health?' }
    ];
    
    log('\nMaking similar request (should trigger fingerprint match)...', colors.yellow);
    
    const startTime3 = performance.now();
    const response3 = await aiService.generateCompletion({
      userId: TEST_USER_ID,
      messages: similarQuery,
      forceFresh: false
    });
    const endTime3 = performance.now();
    
    const executionTime3 = Math.round(endTime3 - startTime3);
    log(`✅ Similar request completed in ${executionTime3}ms`, colors.green);
    log(`Cached: ${response3.cached ? 'Yes' : 'No'}`, colors.cyan);
    
    if (response3.cached) {
      log(`Cache type: ${response3.cacheType}`, colors.cyan);
      
      if (response3.similarity) {
        log(`Similarity score: ${response3.similarity}`, colors.cyan);
      }
    }
  } catch (error) {
    log(`❌ Caching test failed: ${error.message}`, colors.red);
  }
}

// Test batch processing
async function testBatchProcessing() {
  log('\n▶️ Testing batch processing for non-urgent requests', colors.cyan);
  
  try {
    // First, get current stats
    const stats = aiService.getStats();
    log(`Current batch processor stats:`, colors.gray);
    log(`Queue sizes: ${JSON.stringify(stats.batchProcessor.queueSizes)}`, colors.gray);
    
    // Submit a low priority request (should be batched)
    log('\nSubmitting low priority request (should be batched)...', colors.yellow);
    
    const response = await aiService.generateCompletion({
      userId: TEST_USER_ID,
      messages: [
        { role: 'user', content: 'What are some good stretching exercises for office workers?' }
      ],
      priority: 'low',
      forceFresh: true
    });
    
    if (response.queued) {
      log(`✅ Request was queued as expected`, colors.green);
      log(`Queue position: ${response.queuePosition}`, colors.cyan);
      log(`Estimated wait time: ${response.estimatedWaitTime} seconds`, colors.cyan);
    } else {
      log(`⚠️ Request was not queued, may have been processed immediately`, colors.yellow);
    }
    
    // Submit a critical priority request (should be processed immediately)
    log('\nSubmitting critical priority request (should process immediately)...', colors.yellow);
    
    const startTime = performance.now();
    const criticalResponse = await aiService.generateCompletion({
      userId: TEST_USER_ID,
      messages: [
        { role: 'user', content: 'What should I do if someone is having a heart attack?' }
      ],
      priority: 'critical',
      forceFresh: true
    });
    const endTime = performance.now();
    
    if (!criticalResponse.queued) {
      log(`✅ Critical request was processed immediately as expected (${Math.round(endTime - startTime)}ms)`, colors.green);
      log(`Model used: ${criticalResponse.model}`, colors.cyan);
    } else {
      log(`❌ Critical request was queued unexpectedly`, colors.red);
    }
    
    // Check updated stats
    const updatedStats = aiService.getStats();
    log(`\nUpdated batch processor stats:`, colors.gray);
    log(`Queue sizes: ${JSON.stringify(updatedStats.batchProcessor.queueSizes)}`, colors.gray);
  } catch (error) {
    log(`❌ Batch processing test failed: ${error.message}`, colors.red);
  }
}

// Test multi-service orchestration
async function testServiceOrchestration() {
  log('\n▶️ Testing multi-service orchestration', colors.cyan);
  
  try {
    // Get health to check available services
    const health = await aiService.getHealth();
    const services = Object.keys(health.orchestrator.services || {});
    
    if (services.length <= 1) {
      log(`⚠️ Only one service available (${services.join(', ')}), skipping fallback test`, colors.yellow);
      return;
    }
    
    // Test with preferred provider
    const providers = ['openai', 'gemini'].filter(p => services.includes(p));
    
    if (providers.length >= 2) {
      // Test with the second provider as preferred (to test something different)
      const preferredProvider = providers[1];
      
      log(`\nTesting with preferred provider: ${preferredProvider}...`, colors.yellow);
      
      const response = await aiService.generateCompletion({
        userId: TEST_USER_ID,
        messages: [
          { role: 'user', content: 'What are some simple meditation techniques?' }
        ],
        preferredProvider,
        forceFresh: true
      });
      
      if (response.provider === preferredProvider) {
        log(`✅ Response used preferred provider: ${response.provider}`, colors.green);
      } else {
        log(`⚠️ Response used ${response.provider} instead of preferred ${preferredProvider}`, colors.yellow);
      }
    } else {
      log(`⚠️ Not enough providers available for preferred provider test`, colors.yellow);
    }
    
    // Get orchestrator stats
    const stats = aiService.getStats();
    log(`\nService usage stats:`, colors.cyan);
    
    const serviceUsage = stats.orchestrator.serviceUsage || {};
    for (const [service, count] of Object.entries(serviceUsage)) {
      log(`${service}: ${count} requests`, colors.gray);
    }
    
    log(`Fallbacks: ${stats.orchestrator.fallbacks || 0}`, colors.gray);
  } catch (error) {
    log(`❌ Service orchestration test failed: ${error.message}`, colors.red);
  }
}

// Run all tests
async function runTests() {
  log('🧪 Starting Adaptive AI Optimization Tests', colors.magenta.bold);
  
  // Check if service is running
  const isHealthy = await checkHealth();
  if (!isHealthy) {
    log('❌ Service is not healthy, aborting tests', colors.red);
    return;
  }
  
  // Run tests
  await testModelSelection();
  await testCaching();
  await testBatchProcessing();
  await testServiceOrchestration();
  
  log('\n✅ All tests completed', colors.magenta.bold);
  
  // Shutdown service
  aiService.shutdown();
  log('Service shutdown complete', colors.cyan);
}

// Run all tests
runTests().catch(error => {
  log(`❌ Test suite failed: ${error.message}`, colors.red);
  
  // Ensure shutdown on error
  try {
    aiService.shutdown();
  } catch (_) {
    // Ignore shutdown errors
  }
});