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

# Node.js 설치 확인
if ! command -v node &>/dev/null; then
  echo "[오류] Node.js가 설치되어 있지 않습니다."
  echo "       https://nodejs.org 에서 설치 후 다시 실행하세요."
  exit 1
fi

# 의존성 설치
if [ ! -d "$DIR/node_modules" ]; then
  echo "[설치] npm 패키지를 설치합니다..."
  cd "$DIR" && npm install
  echo ""
fi

# 기존 프로세스 종료
if lsof -ti:$PORT &>/dev/null; then
  echo "[정리] 포트 $PORT 사용 중인 프로세스를 종료합니다..."
  kill -9 $(lsof -ti:$PORT) 2>/dev/null || true
  sleep 1
fi

# 서버 시작 (백그라운드)
echo "[시작] WebSSH 서버를 시작합니다... ($URL)"
cd "$DIR"
nohup node server.js > data/server.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > data/server.pid

# 서버 준비 대기
for i in {1..10}; do
  if curl -s "$URL" &>/dev/null; then
    break
  fi
  sleep 0.5
done

# 브라우저 열기
echo "[브라우저] $URL 를 엽니다..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  open "$URL"
elif command -v xdg-open &>/dev/null; then
  xdg-open "$URL"
fi

echo ""
echo "  서버 실행 중: $URL  (PID: $SERVER_PID)"
echo "  종료하려면: ./stop.sh  또는  kill $SERVER_PID"
echo ""
