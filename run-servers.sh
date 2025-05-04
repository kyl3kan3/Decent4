#!/bin/bash

# Kill any existing node processes and free the ports
echo "Stopping any existing servers..."
pkill -f "node server.js" || true
pkill -f "node server-cors.js" || true
pkill -f "node proxy-setup.js" || true
lsof -ti:5001 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

# Small delay to ensure ports are released
sleep 1

# Start both servers
echo "Starting both servers..."
node run-both-servers.js