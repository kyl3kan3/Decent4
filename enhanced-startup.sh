#!/bin/bash
# Start the VitalGradient application with persistent monitoring and enhanced database support

# Set up environment variables for better database connection
export DB_RETRY_COUNT=5
export DB_RETRY_DELAY=2000
export DB_CONNECT_TIMEOUT=10
export DB_KEEP_ALIVE=60
export PORT=3001

# Kill any existing server processes to avoid conflicts
pkill -f "node run-dev.js" || true
pkill -f "node start-enhanced-server.js" || true
pkill -f "node main-server-manager.js" || true

# Wait a moment for processes to terminate
sleep 1

# Remove any stale PID or lock files
rm -f .app.pid
rm -f .ready
rm -f .enhanced-server-launcher.pid
rm -f .server-crash.log

# Start the enhanced server manager
echo "Starting enhanced VitalGradient server..."
node start-enhanced-server.js