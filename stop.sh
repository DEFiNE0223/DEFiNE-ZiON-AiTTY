#!/usr/bin/env bash
# DEFiNE-ZiON-AiTTY — 서버 종료
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$DIR/data/server.pid"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    rm -f "$PID_FILE"
    echo "[종료] WebSSH 서버가 종료되었습니다. (PID: $PID)"
  else
    echo "[정보] 서버가 이미 종료되어 있습니다."
    rm -f "$PID_FILE"
  fi
else
  # PID 파일 없으면 포트로 찾아서 종료
  if lsof -ti:7654 &>/dev/null; then
    kill -9 $(lsof -ti:7654)
    echo "[종료] 포트 7654 프로세스를 종료했습니다."
  else
    echo "[정보] 실행 중인 서버가 없습니다."
  fi
fi
