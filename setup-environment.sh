#!/bin/bash

# Lisa AI Assistant - Environment Setup Script
# This script helps set up the environment for the Lisa application

echo "🚀 Lisa AI Assistant - Environment Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if running on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
else
    print_warning "Unsupported operating system. This script is designed for macOS and Linux."
    exit 1
fi

print_info "Detected OS: $OS"
echo

# Check for required dependencies
echo "📦 Checking Dependencies"
echo "------------------------"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "Node.js is installed: $NODE_VERSION"
    
    # Check if Node.js version is 16 or higher
    NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | cut -d'v' -f2)
    if [ "$NODE_MAJOR_VERSION" -ge 16 ]; then
        print_status "Node.js version is compatible"
    else
        print_error "Node.js version 16+ is required. Current version: $NODE_VERSION"
        exit 1
    fi
else
    print_error "Node.js is not installed. Please install Node.js 16+ from https://nodejs.org"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status "npm is installed: $NPM_VERSION"
else
    print_error "npm is not installed. Please install npm."
    exit 1
fi

echo

# Create .env file if it doesn't exist
echo "⚙️  Environment Configuration"
echo "-----------------------------"

if [ ! -f "server/chatbot-backend/.env" ]; then
    print_info "Creating .env file from template..."
    cp server/chatbot-backend/env.template server/chatbot-backend/.env
    print_status ".env file created"
    
    echo
    print_warning "IMPORTANT: You need to configure the following in server/chatbot-backend/.env:"
    echo "  - OPENAI_API_KEY: Your OpenAI API key"
    echo "  - ASSISTANT_ID: Your OpenAI Assistant ID"
    echo "  - JWT_SECRET: A secure JWT secret key"
    echo "  - SESSION_SECRET: A secure session secret"
    echo "  - Email configuration (if using email features)"
    echo
else
    print_status ".env file already exists"
fi

# Install dependencies
echo "📥 Installing Dependencies"
echo "--------------------------"

# Install backend dependencies
print_info "Installing backend dependencies..."
cd server/chatbot-backend
if npm install; then
    print_status "Backend dependencies installed"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi

# Install frontend dependencies
print_info "Installing frontend dependencies..."
cd ../../client/chatbot-frontend-2
if npm install; then
    print_status "Frontend dependencies installed"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi

cd ../..

# Initialize database
echo
echo "🗄️  Database Setup"
echo "------------------"

print_info "Initializing database..."
cd server/chatbot-backend
if npm run init-db; then
    print_status "Database initialized successfully"
else
    print_error "Failed to initialize database"
    exit 1
fi

cd ../..

# Create startup scripts
echo
echo "🔧 Creating Startup Scripts"
echo "---------------------------"

# Create start-backend.sh
cat > start-backend.sh << 'EOF'
#!/bin/bash
echo "🚂 Starting Lisa Backend Server..."
cd server/chatbot-backend
npm start
EOF

chmod +x start-backend.sh
print_status "Created start-backend.sh"

# Create start-frontend.sh
cat > start-frontend.sh << 'EOF'
#!/bin/bash
echo "🖥️  Starting Lisa Frontend..."
cd client/chatbot-frontend-2
npm start
EOF

chmod +x start-frontend.sh
print_status "Created start-frontend.sh"

# Create start-all.sh
cat > start-all.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Lisa Application..."

# Function to cleanup background processes
cleanup() {
    echo "Shutting down servers..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Setup signal handlers
trap cleanup SIGINT SIGTERM

echo "Starting backend server..."
cd server/chatbot-backend
npm start &
BACKEND_PID=$!

echo "Waiting for backend to start..."
sleep 5

echo "Starting frontend server..."
cd ../../client/chatbot-frontend-2
npm start &
FRONTEND_PID=$!

echo "✅ Both servers are starting..."
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:3000"
echo "Press Ctrl+C to stop all servers"

# Wait for all background jobs
wait
EOF

chmod +x start-all.sh
print_status "Created start-all.sh"

echo
echo "🎉 Setup Complete!"
echo "=================="
echo
print_status "Lisa AI Assistant is ready to run!"
echo
echo "📋 Next Steps:"
echo "1. Configure your API keys in server/chatbot-backend/.env"
echo "2. Run the application:"
echo "   • Option A: ./start-all.sh (starts both frontend and backend)"
echo "   • Option B: Run separately:"
echo "     - Backend: ./start-backend.sh"
echo "     - Frontend: ./start-frontend.sh"
echo
echo "🌐 URLs:"
echo "   • Frontend: http://localhost:3000"
echo "   • Backend API: http://localhost:3001"
echo
echo "📚 Documentation:"
echo "   • API endpoints are available at http://localhost:3001/api/"
echo "   • Admin dashboard available after creating an admin user"
echo
print_warning "Remember to configure your OpenAI API key and Assistant ID in the .env file!"
echo 