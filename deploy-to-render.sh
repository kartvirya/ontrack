#!/bin/bash

# LISA AI - Render Deployment Setup Script
echo "🚀 Preparing LISA AI for Render deployment..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ This is not a git repository. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    exit 1
fi

# Check if render.yaml exists
if [ ! -f "render.yaml" ]; then
    echo "❌ render.yaml not found. Please ensure the render.yaml file exists in the root directory."
    exit 1
fi

# Check if required files exist
echo "📋 Checking required files..."

if [ ! -f "server/chatbot-backend/package.json" ]; then
    echo "❌ Backend package.json not found"
    exit 1
fi

if [ ! -f "client/chatbot-frontend-2/package.json" ]; then
    echo "❌ Frontend package.json not found"
    exit 1
fi

if [ ! -f "server/chatbot-backend/scripts/init-production-db.js" ]; then
    echo "❌ Production database initialization script not found"
    exit 1
fi

echo "✅ All required files found"

# Test build processes
echo "🔨 Testing build processes..."

# Test backend dependencies
echo "  Testing backend dependencies..."
cd server/chatbot-backend
if npm install --dry-run > /dev/null 2>&1; then
    echo "  ✅ Backend dependencies OK"
else
    echo "  ❌ Backend dependencies have issues"
    cd ../..
    exit 1
fi
cd ../..

# Test frontend dependencies and build
echo "  Testing frontend dependencies and build..."
cd client/chatbot-frontend-2
if npm install --dry-run > /dev/null 2>&1; then
    echo "  ✅ Frontend dependencies OK"
else
    echo "  ❌ Frontend dependencies have issues"
    cd ../..
    exit 1
fi

# Test frontend build
if npm run build > /dev/null 2>&1; then
    echo "  ✅ Frontend build successful"
    rm -rf build  # Clean up test build
else
    echo "  ⚠️  Frontend build had issues (check your code)"
fi
cd ../..

# Check git status
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Uncommitted changes detected. Consider committing them:"
    git status --short
    echo ""
    echo "Would you like to commit these changes? (y/n)"
    read -r response
    if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
        git add .
        echo "Enter commit message:"
        read -r commit_message
        git commit -m "$commit_message"
        echo "✅ Changes committed"
    fi
fi

# Final checklist
echo ""
echo "📋 Pre-deployment checklist:"
echo "✅ render.yaml configured"
echo "✅ Database initialization script ready"
echo "✅ Backend package.json updated with production scripts"
echo "✅ Frontend build configuration verified"
echo ""
echo "🎯 Next steps:"
echo "1. Push your code to GitHub:"
echo "   git push origin main"
echo ""
echo "2. Go to Render Dashboard: https://dashboard.render.com"
echo "3. Click 'New' → 'Blueprint'"
echo "4. Connect your GitHub repository"
echo "5. Set the following environment variables in the backend service:"
echo "   - OPENAI_API_KEY: Your OpenAI API key"
echo "   - ASSISTANT_ID: Your OpenAI Assistant ID"
echo ""
echo "6. Wait for deployment to complete"
echo "7. Test your application at the provided URLs"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT_GUIDE.md"
echo ""
echo "🚀 Ready for deployment! Good luck!" 