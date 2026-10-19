#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PYTHON_BIN="${PYTHON_BIN:-python}"
API_PORT="${BEE2BEE_API_PORT:-4002}"
P2P_PORT="${BEE2BEE_PORT:-4003}"

cleanup() {
  if [[ -n "${NODE_PID:-}" ]]; then
    kill "$NODE_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if [[ -n "${BEE2BEE_MODEL:-}" ]]; then
  echo "Starting Bee2Bee node with model: $BEE2BEE_MODEL"
  "$PYTHON_BIN" -m bee2bee serve-ollama \
    --model "$BEE2BEE_MODEL" \
    --host 127.0.0.1 \
    --port "$P2P_PORT" \
    --api-port "$API_PORT" &
else
  echo "Starting Bee2Bee node (no model). Set BEE2BEE_MODEL to serve one."
  "$PYTHON_BIN" -m bee2bee api \
    --host 127.0.0.1 \
    --port "$API_PORT" \
    --p2p-port "$P2P_PORT" &
fi
NODE_PID=$!

cd app
if [[ ! -d node_modules ]]; then
  npm install
fi

echo "Local web app: http://localhost:3000"
npm run dev
