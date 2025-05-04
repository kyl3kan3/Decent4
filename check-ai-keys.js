/**
 * AI API Keys Validation Tool
 * 
 * This script checks if the necessary API keys are configured for the AI services
 * and tests their validity by making a simple test request.
 */

import axios from 'axios';
import colors from 'colors';
import dotenv from 'dotenv';
import { exec } from 'child_process';

// Load environment variables
dotenv.config();

// Configuration for the key validation
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

// Simple test prompts
const OPENAI_TEST_PROMPT = {
  model: "gpt-3.5-turbo",
  messages: [
    {
      role: "system",
      content: "You are a helpful assistant that responds with only one word."
    },
    {
      role: "user",
      content: "Reply with the word 'working' if you can read this message."
    }
  ],
  max_tokens: 10
};

const GEMINI_TEST_PROMPT = {
  contents: [
    {
      role: "user",
      parts: [
        {
          text: "Reply with the word 'working' if you can read this message."
        }
      ]
    }
  ]
};

// Check if a key is present and not empty
function isKeyConfigured(key) {
  return !!process.env[key] && process.env[key].trim() !== '';
}

// Print the key status
function printKeyStatus(key, configured) {
  if (configured) {
    console.log(colors.green(`✓ ${key} is configured`));
  } else {
    console.log(colors.red(`✗ ${key} is not configured`));
  }
}

// Test OpenAI API key
async function testOpenAIKey() {
  if (!isKeyConfigured('OPENAI_API_KEY')) {
    console.log(colors.yellow('⚠️ Skipping OpenAI test: API key not found'));
    return false;
  }
  
  console.log(colors.cyan('Testing OpenAI API key...'));
  
  try {
    const response = await axios.post(
      OPENAI_API_URL,
      OPENAI_TEST_PROMPT,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );
    
    if (response.status === 200) {
      const content = response.data.choices?.[0]?.message?.content?.toLowerCase() || '';
      if (content.includes('working')) {
        console.log(colors.green('✓ OpenAI API key is valid and working correctly'));
        return true;
      } else {
        console.log(colors.yellow(`⚠️ OpenAI API returned unexpected response: ${content}`));
        return false;
      }
    } else {
      console.log(colors.red(`✗ OpenAI API returned status: ${response.status}`));
      return false;
    }
  } catch (error) {
    const status = error.response?.status || 'unknown';
    const message = error.response?.data?.error?.message || error.message;
    console.log(colors.red(`✗ OpenAI API test failed (${status}): ${message}`));
    return false;
  }
}

// Test Gemini API key
async function testGeminiKey() {
  if (!isKeyConfigured('GEMINI_API_KEY')) {
    console.log(colors.yellow('⚠️ Skipping Gemini test: API key not found'));
    return false;
  }
  
  console.log(colors.cyan('Testing Gemini API key...'));
  
  try {
    const url = `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`;
    const response = await axios.post(
      url,
      GEMINI_TEST_PROMPT,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.status === 200) {
      const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.toLowerCase() || '';
      if (content.includes('working')) {
        console.log(colors.green('✓ Gemini API key is valid and working correctly'));
        return true;
      } else {
        console.log(colors.yellow(`⚠️ Gemini API returned unexpected response: ${content}`));
        return false;
      }
    } else {
      console.log(colors.red(`✗ Gemini API returned status: ${response.status}`));
      return false;
    }
  } catch (error) {
    const status = error.response?.status || 'unknown';
    const message = error.response?.data?.error?.message || error.message;
    console.log(colors.red(`✗ Gemini API test failed (${status}): ${message}`));
    return false;
  }
}

// Function to run key validation tests
async function validateKeys() {
  console.log(colors.cyan.bold('AI API Keys Validation Tool'));
  console.log(colors.cyan('------------------------------'));
  
  console.log(colors.cyan.bold('\nChecking environment variables:'));
  printKeyStatus('OPENAI_API_KEY', isKeyConfigured('OPENAI_API_KEY'));
  printKeyStatus('GEMINI_API_KEY', isKeyConfigured('GEMINI_API_KEY'));
  
  console.log(colors.cyan.bold('\nTesting API connectivity:'));
  const openaiValid = await testOpenAIKey();
  const geminiValid = await testGeminiKey();
  
  console.log(colors.cyan.bold('\nSummary:'));
  console.log(colors.cyan('OpenAI API: ') + (openaiValid ? colors.green('Working') : colors.red('Not Working')));
  console.log(colors.cyan('Gemini API: ') + (geminiValid ? colors.green('Working') : colors.red('Not Working')));
  
  if (!openaiValid && !geminiValid) {
    console.log(colors.yellow.bold('\n⚠️ Warning: No working AI APIs found. The AI service will not function properly.'));
    console.log(colors.yellow('Please configure at least one API key using the Secrets tool.'));
    return false;
  } else if (!openaiValid || !geminiValid) {
    console.log(colors.yellow.bold('\n⚠️ Note: One AI API is not working. The system will use the available service as a fallback.'));
    return true;
  } else {
    console.log(colors.green.bold('\n✓ All AI APIs are working properly.'));
    return true;
  }
}

// Execute the validation
validateKeys().catch(error => {
  console.error(colors.red(`Error during validation: ${error.message}`));
  process.exit(1);
});