#!/usr/bin/env bash
# DEFiNE-ZiON-AiTTY — Stop server
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$DIR/data/server.pid"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    rm -f "$PID_FILE"
    echo "[STOPPED] WebSSH server has been stopped. (PID: $PID)"
  else
    echo "[INFO] Server is already stopped."
    rm -f "$PID_FILE"
  fi
else
  # No PID file — find and stop by port
  if lsof -ti:7654 &>/dev/null; then
    kill -9 $(lsof -ti:7654)
    echo "[STOPPED] Process on port 7654 has been terminated."
  else
    echo "[INFO] No running server found."
  fi
fi
