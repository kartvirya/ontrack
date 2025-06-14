#!/bin/bash

echo "🚀 Starting Lisa Chatbot Application..."

# Function to kill background processes on script exit
cleanup() {
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Set up trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Start backend server
echo "📡 Starting backend server on port 3001..."
cd server/chatbot-backend
npm start &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend server
echo "🌐 Starting frontend server on port 3000..."
cd ../../client/chatbot-frontend-2
npm start &
FRONTEND_PID=$!

echo "✅ Both servers are starting up!"
echo "📡 Backend: http://localhost:3001"
echo "🌐 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID 