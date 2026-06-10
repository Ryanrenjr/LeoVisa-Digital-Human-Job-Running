#!/bin/bash
# LeoVisa Digital Human — Stop Script

echo "[LeoVisa] Stopping services..."

# ── Backend: kill process using port 8008 ──
BACKEND_PID=$(lsof -ti:8008 2>/dev/null)
if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null && echo "[LeoVisa] Backend stopped (PID $BACKEND_PID)."
else
    echo "[LeoVisa] Backend was not running on port 8008."
fi

# ── Frontend: kill process using port 5173 ──
FRONTEND_PID=$(lsof -ti:5173 2>/dev/null)
if [ -n "$FRONTEND_PID" ]; then
    kill "$FRONTEND_PID" 2>/dev/null && echo "[LeoVisa] Frontend stopped (PID $FRONTEND_PID)."
else
    echo "[LeoVisa] Frontend was not running on port 5173."
fi

# ── Fallback: pkill by path (catches child processes) ──
pkill -f "AI-Workspace/app/backend" 2>/dev/null || true
pkill -f "AI-Workspace/app/frontend" 2>/dev/null || true

echo "[LeoVisa] Done."
