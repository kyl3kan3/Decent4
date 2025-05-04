#!/bin/bash
# Run the application in the background
echo "Starting application in background..."
nohup ./start-app.sh > server-bg.log 2>&1 &
echo $! > .app.pid
echo "Started application with PID $(cat .app.pid)"
echo "You can view logs with: tail -f server-bg.log"