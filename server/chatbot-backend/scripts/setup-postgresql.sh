#!/bin/bash

# Lisa AI - PostgreSQL Setup Script
# This script helps set up PostgreSQL for the Lisa application

echo "🐘 Lisa AI - PostgreSQL Setup"
echo "=================================="

# Check if running on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="linux"
else
    echo "❌ Unsupported platform: $OSTYPE"
    exit 1
fi

# Function to install PostgreSQL on macOS
install_postgresql_macos() {
    echo "📦 Installing PostgreSQL on macOS..."
    
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew is required but not installed."
        echo "Please install Homebrew first: https://brew.sh"
        exit 1
    fi
    
    # Install PostgreSQL
    brew install postgresql@15
    
    # Start PostgreSQL service
    brew services start postgresql@15
    
    echo "✅ PostgreSQL installed and started via Homebrew"
}

# Function to install PostgreSQL on Linux
install_postgresql_linux() {
    echo "📦 Installing PostgreSQL on Linux..."
    
    # Update package list
    sudo apt update
    
    # Install PostgreSQL
    sudo apt install -y postgresql postgresql-contrib
    
    # Start and enable PostgreSQL service
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    echo "✅ PostgreSQL installed and started"
}

# Function to create database and user
setup_database() {
    echo "🗄️ Setting up database and user..."
    
    # Database configuration
    DB_NAME="lisa_db"
    DB_USER="lisa_user"
    DB_PASSWORD="lisa_password"
    
    if [[ "$PLATFORM" == "macos" ]]; then
        # On macOS with Homebrew, we can connect directly
        psql postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database already exists"
        psql postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo "User already exists"
        psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
        psql postgres -c "ALTER USER $DB_USER CREATEDB;"
    else
        # On Linux, use sudo to connect as postgres user
        sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database already exists"
        sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo "User already exists"
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
        sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;"
    fi
    
    echo "✅ Database setup complete"
    echo ""
    echo "📋 Database Information:"
    echo "   Database: $DB_NAME"
    echo "   Username: $DB_USER"
    echo "   Password: $DB_PASSWORD"
    echo "   Host: localhost"
    echo "   Port: 5432"
}

# Function to create .env file
create_env_file() {
    echo "📝 Creating .env file..."
    
    ENV_FILE="../.env"
    
    if [[ -f "$ENV_FILE" ]]; then
        echo "⚠️  .env file already exists. Creating backup..."
        cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    cat > "$ENV_FILE" << EOF
# Lisa AI - Environment Configuration

# JWT Secret (Change this in production!)
JWT_SECRET=your-super-secret-jwt-key-change-me-in-production

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lisa_db
DB_USER=lisa_user
DB_PASSWORD=lisa_password

# Email Configuration (for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-email-password
EMAIL_FROM=Lisa AI <your-email@gmail.com>

# Server Configuration
PORT=3001
NODE_ENV=development

# Rate Limiting Configuration
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=5
PASSWORD_RESET_RATE_LIMIT_WINDOW_MS=3600000
PASSWORD_RESET_RATE_LIMIT_MAX=3
CHAT_RATE_LIMIT_WINDOW_MS=60000
CHAT_RATE_LIMIT_MAX=20

# Session Configuration
SESSION_SECRET=your-session-secret-change-me-in-production

# Application Configuration
APP_NAME=Lisa AI
APP_URL=http://localhost:3000
API_URL=http://localhost:3001
EOF
    
    echo "✅ .env file created"
    echo "⚠️  Please update the following in your .env file:"
    echo "   - OPENAI_API_KEY: Add your OpenAI API key"
    echo "   - JWT_SECRET: Change to a secure random string"
    echo "   - SESSION_SECRET: Change to a secure random string"
    echo "   - Email settings: Configure SMTP settings for password reset"
}

# Function to install Node.js dependencies
install_dependencies() {
    echo "📦 Installing Node.js dependencies..."
    
    cd ..
    npm install
    
    echo "✅ Dependencies installed"
}

# Function to initialize database schema
initialize_database() {
    echo "🗄️ Initializing database schema..."
    
    cd ..
    npm run init-db
    
    echo "✅ Database schema initialized"
}

# Main setup process
main() {
    echo "Starting PostgreSQL setup..."
    echo ""
    
    # Check if PostgreSQL is already installed
    if command -v psql &> /dev/null; then
        echo "✅ PostgreSQL is already installed"
    else
        echo "📦 PostgreSQL not found. Installing..."
        if [[ "$PLATFORM" == "macos" ]]; then
            install_postgresql_macos
        else
            install_postgresql_linux
        fi
    fi
    
    echo ""
    setup_database
    echo ""
    create_env_file
    echo ""
    install_dependencies
    echo ""
    initialize_database
    
    echo ""
    echo "🎉 PostgreSQL setup complete!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Update your .env file with proper configuration"
    echo "2. Get your OpenAI API key from https://platform.openai.com/"
    echo "3. Run 'npm start' to start the application"
    echo ""
    echo "🚀 Happy coding with Lisa AI!"
}

# Run main function
main "$@" 