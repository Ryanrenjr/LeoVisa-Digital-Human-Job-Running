#!/bin/bash
# LeoVisa Digital Human — Start Script
set -e

WORKSPACE=~/AI-Workspace
LOGS_DIR=$WORKSPACE/logs
BACKEND_DIR=$WORKSPACE/app/backend
FRONTEND_DIR=$WORKSPACE/app/frontend
UVICORN=$HOME/miniconda3/bin/uvicorn

mkdir -p "$LOGS_DIR"

# ── Backend ──
echo "[LeoVisa] Starting backend on http://127.0.0.1:8008 ..."
cd "$BACKEND_DIR"
nohup "$UVICORN" main:app --host 127.0.0.1 --port 8008 \
  >> "$LOGS_DIR/app_backend.log" 2>&1 &
BACKEND_PID=$!
echo "[LeoVisa] Backend PID: $BACKEND_PID"

# ── Frontend ──
echo "[LeoVisa] Starting frontend on http://127.0.0.1:5173 ..."
cd "$FRONTEND_DIR"
nohup npm run dev -- --host 127.0.0.1 --port 5173 \
  >> "$LOGS_DIR/app_frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "[LeoVisa] Frontend PID: $FRONTEND_PID"

echo "[LeoVisa] Done. Logs: $LOGS_DIR/"
echo "[LeoVisa]   Backend  → $LOGS_DIR/app_backend.log"
echo "[LeoVisa]   Frontend → $LOGS_DIR/app_frontend.log"
