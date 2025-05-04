#!/bin/bash

# Simple Smart Recommendations Starter Script (ES Module Version)
# This script starts the simplified Smart Recommendations server

# Print startup message
echo "Starting Simple Smart Recommendations server with pattern detection..."  

# Kill any existing instances
pkill -f "node simple-smart-server-esm.js" || true
pkill -f "node run-simple-smart-esm.js" || true

# Start the server
node run-simple-smart-esm.js
