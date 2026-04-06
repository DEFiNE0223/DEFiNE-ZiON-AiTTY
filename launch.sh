#!/usr/bin/env bash
# DEFiNE-ZiON-AiTTY — macOS / Linux launcher
set -e

PORT=7654
URL="http://127.0.0.1:$PORT"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "  ██████╗ ███████╗███████╗██╗███╗   ██╗███████╗"
echo "  ██╔══██╗██╔════╝██╔════╝██║████╗  ██║██╔════╝"
echo "  ██║  ██║█████╗  █████╗  ██║██╔██╗ ██║█████╗  "
echo "  ██║  ██║██╔══╝  ██╔══╝  ██║██║╚██╗██║██╔══╝  "
echo "  ██████╔╝███████╗██║     ██║██║ ╚████║███████╗"
echo "  ╚═════╝ ╚══════╝╚═╝     ╚═╝╚═╝  ╚═══╝╚══════╝"
echo "           ZiON-AiTTY — Mission Control"
echo ""

# Check Node.js installation
if ! command -v node &>/dev/null; then
  echo "[ERROR] Node.js is not installed."
  echo "        Install from https://nodejs.org and try again."
  exit 1
fi

# Install dependencies
if [ ! -d "$DIR/node_modules" ]; then
  echo "[INSTALL] Installing npm packages..."
  cd "$DIR" && npm install
  echo ""
fi

# Stop existing process
if lsof -ti:$PORT &>/dev/null; then
  echo "[CLEANUP] Stopping process using port $PORT..."
  kill -9 $(lsof -ti:$PORT) 2>/dev/null || true
  sleep 1
fi

# Start server (background)
echo "[START] Starting WebSSH server... ($URL)"
cd "$DIR"
nohup node server.js > data/server.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > data/server.pid

# Wait for server to be ready
for i in {1..10}; do
  if curl -s "$URL" &>/dev/null; then
    break
  fi
  sleep 0.5
done

# Open browser
echo "[BROWSER] Opening $URL..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  open "$URL"
elif command -v xdg-open &>/dev/null; then
  xdg-open "$URL"
fi

echo ""
echo "  Server running: $URL  (PID: $SERVER_PID)"
echo "  To stop: ./stop.sh  or  kill $SERVER_PID"
echo ""
