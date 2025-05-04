# Deployment Instructions for Health Recommendation System

This document provides guidelines for deploying the health recommendation system with AI-powered personalized recommendations.

## Prerequisites

Before deploying this application, ensure you have the following:

1. **API Keys:**
   - OpenAI API key (for primary AI recommendations)
   - Google AI API key (for fallback AI recommendations)

2. **Database:**
   - PostgreSQL database setup with proper credentials

## Deployment Steps

1. **Configure Environment Variables:**
   Make sure the following environment variables are set:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `GOOGLE_AI_API_KEY`: Your Google AI/Gemini API key

2. **Build the Application:**
   Run the following command to build the production version:
   ```bash
   npm run build
   ```

3. **Start the Production Server:**
   Use one of the following methods:
   - Start directly: `node start-deployment.js`
   - Use the workflow: Select "Start production server" from the workflow menu

4. **Monitor Logs:**
   Logs will be stored in the `/logs` directory for troubleshooting:
   - `deployment.log`: Deployment script logs
   - `server-out.log`: Server stdout logs
   - `server-err.log`: Server error logs
   - `production-server.log`: Combined logs

## Health Recommendation Features

The deployed application provides AI-powered health recommendations through:

1. **Context-Aware Health Recommendations:**
   - Personalized health advice based on comprehensive user health context
   - Intelligent analysis of bloodwork, questionnaires, and health patterns

2. **Supplement Recommendations:**
   - Tailored supplement suggestions with dosage and timing information
   - Scientific rationale based on user's specific health needs

3. **User Health Context API:**
   - Complete health profile synthesis for recommendation generation
   - Integration of bloodwork, user preferences, and historical data

## Troubleshooting

If you encounter issues with the AI recommendation system:

1. **API Key Problems:**
   - Verify that both OpenAI and Google AI API keys are correctly set
   - Check API quota limits and billing status

2. **Database Connectivity:**
   - Ensure the PostgreSQL database is running and accessible
   - Verify the DATABASE_URL environment variable format

3. **Server Issues:**
   - Check the logs directory for detailed error information
   - The deployment script will automatically attempt to restart the server on failure

4. **AI Service Failures:**
   - The system will automatically fall back to Gemini if OpenAI fails
   - If both fail, check for error logs and network connectivity