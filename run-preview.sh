#!/bin/bash
# Simple script to run the preview server in the background

echo "Starting preview server in the background..."
npx tsx preview-server.ts > preview-server.log 2>&1 &
echo $! > .preview-server.pid
echo "Preview server started. Log file: preview-server.log"
echo "You can access it at the URL shown in the logs"