#!/bin/bash

# Enculture Platform - Simple Startup Script
# This script starts both backend and frontend properly

echo "🚀 Starting Enculture Intelligence Platform..."
echo ""

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -9 -f "uvicorn" 2>/dev/null
pkill -9 -f "main:app" 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 2

# Get the absolute path to the project
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "📁 Project directory: $PROJECT_DIR"
echo ""

# Start backend with explicit Python path
echo "🔧 Starting backend..."
cd "$PROJECT_DIR/backend"

# Use the venv Python directly
"$PROJECT_DIR/backend/venv/bin/python" main.py > "$PROJECT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to start
echo "   Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "   ✅ Backend is ready!"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo "   ⚠️  Backend took too long to start. Check backend.log for errors."
        echo ""
        echo "Backend log:"
        tail -20 "$PROJECT_DIR/backend.log"
        exit 1
    fi
done

cd "$PROJECT_DIR"
echo ""

# Start frontend
echo "🎨 Starting frontend..."
npm run dev > "$PROJECT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
echo "   Waiting for frontend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "   ✅ Frontend is ready!"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo "   ⚠️  Frontend took too long to start."
    fi
done

echo ""
echo "=========================================="
echo "✅ Enculture Platform is running!"
echo "=========================================="
echo ""
echo "📊 Services:"
echo "   • Backend:  http://localhost:8000"
echo "   • Frontend: http://localhost:3000"
echo "   • API Docs: http://localhost:8000/docs"
echo ""
echo "📋 Process IDs:"
echo "   • Backend:  $BACKEND_PID"
echo "   • Frontend: $FRONTEND_PID"
echo ""
echo "📝 Logs:"
echo "   • Backend:  tail -f backend.log"
echo "   • Frontend: tail -f frontend.log"
echo ""
echo "🛑 To stop services:"
echo "   • kill $BACKEND_PID $FRONTEND_PID"
echo "   • Or: pkill -f uvicorn && pkill -f vite"
echo ""
echo "Press Ctrl+C to stop both services..."
echo "=========================================="

# Wait for Ctrl+C
trap "echo ''; echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

# Keep script running
wait

