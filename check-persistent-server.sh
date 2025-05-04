#!/bin/bash
# Script to check the status of the persistent VitalGradient server

echo "=== VitalGradient Server Status Check ==="
echo "Date: $(date)"
echo ""

# Check for PID files
LAUNCHER_PID=$(cat .vitalgradient-launcher.pid 2>/dev/null || echo "Not found")
SERVER_PID=$(cat .vitalgradient.pid 2>/dev/null || echo "Not found")

echo "Launcher PID file: $LAUNCHER_PID"
echo "Server PID file: $SERVER_PID"
echo ""

# Check if PIDs are active
if [[ "$LAUNCHER_PID" != "Not found" ]]; then
  if ps -p $LAUNCHER_PID > /dev/null; then
    echo "✅ Launcher process is RUNNING (PID: $LAUNCHER_PID)"
  else
    echo "❌ Launcher process is NOT RUNNING (PID: $LAUNCHER_PID)"
  fi
else
  echo "❌ Launcher process PID file not found"
fi

if [[ "$SERVER_PID" != "Not found" ]]; then
  if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Server process is RUNNING (PID: $SERVER_PID)"
  else
    echo "❌ Server process is NOT RUNNING (PID: $SERVER_PID)"
  fi
else
  echo "❌ Server process PID file not found"
fi

echo ""

# Check for ready status
if [[ -f .ready ]]; then
  echo "✅ Server ready status: YES"
  echo "   $(cat .ready)"
else
  echo "❌ Server ready status: NO"
fi

echo ""

# Check for running Node.js processes
echo "=== Active Node.js Processes ==="
ps aux | grep node | grep -v grep

echo ""

# Check listening ports
echo "=== Listening Ports ==="
netstat -tulpn 2>/dev/null | grep LISTEN | grep node

echo ""

# Check health endpoint if server port is available
PORT=$(cat .replit.port 2>/dev/null || echo "3001")
echo "=== Testing API Health Endpoint (Port: $PORT) ==="
curl -s "http://localhost:$PORT/api/health" || echo "Failed to connect to health endpoint"

echo ""
echo "=== Server Status Check Complete ==="