#!/bin/bash

# AGGRESSIVE CLEANUP
echo "🔥 KILLING EVERYTHING..."
pkill -9 -f "python" 2>/dev/null
pkill -9 -f "node" 2>/dev/null
pkill -9 -f "npm" 2>/dev/null
pkill -9 -f "vite" 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

sleep 3

# START BACKEND
echo "🚀 Starting backend..."
cd backend
source venv/bin/activate
python main.py &
cd ..

# Wait for backend
sleep 5

# START FRONTEND DIRECTLY
echo "🎨 Starting frontend with vite directly..."
./node_modules/.bin/vite &
npm run dev &

sleep 5

# CHECK EVERYTHING
echo ""
echo "🔍 Checking services..."
echo ""

if curl -s http://localhost:8000/api/v1/chat/health >/dev/null; then
    echo "✅ Backend: http://localhost:8000"
else
    echo "❌ Backend FAILED"
fi

if curl -s http://localhost:3000 >/dev/null; then
    echo "✅ Frontend: http://localhost:3000"
else
    echo "❌ Frontend FAILED - trying alternate approach..."
    pkill -9 -f vite
    sleep 2
    npx vite --port 3000 --host
fi
