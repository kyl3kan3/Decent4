#!/bin/bash

# Simple Smart Recommendations Starter Script
# This script starts the simplified Smart Recommendations server

# Print startup message
echo "Starting Simple Smart Recommendations server with pattern detection..."  

# Kill any existing instances
pkill -f "node simple-smart-server.js" || true
pkill -f "node run-simple-smart.js" || true

# Start the server
node run-simple-smart.js
