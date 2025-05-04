#!/bin/bash

# Run OpenAI Smart Recommendations Test
# This script starts the OpenAI server and runs the test script

# Text formatting
BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
RESET="\033[0m"

echo -e "${BOLD}${BLUE}OpenAI Smart Recommendations Test Runner${RESET}"
echo -e "Running tests for AI-powered supplement recommendations"
echo 

# Check if the OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
  echo -e "${YELLOW}⚠️  WARNING: OPENAI_API_KEY is not set in environment!${RESET}"
  echo -e "${YELLOW}Test will likely fail without a valid API key.${RESET}"
  echo -e "${YELLOW}Please set the OPENAI_API_KEY environment variable.${RESET}"
  echo
  # Prompt user to continue or exit
  read -p "Continue anyway? (y/n): " continue_choice
  if [ "$continue_choice" != "y" ]; then
    echo "Test aborted."
    exit 1
  fi
else
  echo -e "${GREEN}✓ OpenAI API key is configured.${RESET}"
fi

echo "Starting OpenAI test in 3 seconds..."
sleep 3

# Run the test script
node test-openai-recommendations.js
