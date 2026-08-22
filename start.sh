#!/bin/bash
# Start backend and frontend for NARCOS BAY.
# The frontend dev server is the exposed port; it reverse-proxies /api and /uploads to the backend.

# Start backend server in background
cd backend && npm run dev &
BACKEND_PID=$!

# Start frontend server (exposed port)
cd frontend && npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
