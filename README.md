# 🚂 Lisa AI - Train Maintenance Assistant

Lisa is an AI-powered assistant designed to help with train maintenance tasks, troubleshooting, and technical support. Built with modern technologies, it provides intelligent assistance through natural language processing and machine learning.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### 🤖 AI-Powered Assistance
- Intelligent train maintenance guidance
- Technical troubleshooting support
- Component identification and specifications
- Maintenance scheduling recommendations

### 🗄️ Data Management
- PostgreSQL database for robust data storage
- Conversation history and user management
- File upload and processing capabilities
- Export functionality for maintenance logs

### 🔐 Security & Authentication
- Secure user authentication with JWT tokens
- Role-based access control (Admin/User)
- Rate limiting and input validation
- Password reset functionality

### 🎨 Modern UI/UX
- Clean, responsive interface built with React
- Real-time chat interface
- Admin dashboard for system management
- Mobile-friendly design

## 🏗️ Architecture

Lisa AI
├── Frontend (React)
│   ├── User Interface
│   ├── Authentication
│   ├── Chat Interface
│   └── Admin Dashboard
├── Backend (Node.js/Express)
│   ├── RESTful API
│   ├── Authentication & Authorization
│   ├── Database Management
│   └── OpenAI Integration
├── Database (PostgreSQL)
│   ├── User Management
│   ├── Conversation Storage
│   ├── File Management
│   └── Activity Logging
└── AI Integration (OpenAI)
    ├── GPT-4 Assistant
    ├── Vector Store
    └── File Processing

## 📋 Prerequisites

Before installing Lisa, ensure you have:

- **Node.js** (v18.0.0 or higher)
- **npm** (v8.0.0 or higher)
- **PostgreSQL** (v13.0 or higher)
- **OpenAI API Key** (for AI functionality)
- **SMTP Server** (for email notifications)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/kartvirya/lisa.git
cd lisa
```

### 2. Set Up PostgreSQL Database

   ```bash
sudo -u postgres psql
CREATE DATABASE lisa_db;
CREATE USER lisa_user WITH PASSWORD 'lisa_password';
GRANT ALL PRIVILEGES ON DATABASE lisa_db TO lisa_user;
ALTER USER lisa_user CREATEDB;
\q
```

### 3. Install Dependencies

**Backend:**
   ```bash
   cd server/chatbot-backend
   npm install
   ```

**Frontend:**
   ```bash
cd client/chatbot-frontend-2
   npm install
   ```

### 4. Environment Configuration

Create environment files:

**Backend (.env):**
```bash
cd server/chatbot-backend
cp env.example .env
```

Update the `.env` file with your configuration:

   ```env
# Lisa AI - Environment Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lisa_db
DB_USER=lisa_user
DB_PASSWORD=lisa_password

# OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=Lisa AI <your-email@gmail.com>

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Application Configuration
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# System Configuration
MAX_CONVERSATION_LENGTH=100
SESSION_TIMEOUT=86400000
LOG_LEVEL=info
APP_NAME=Lisa AI
```

### 5. Initialize Database

   ```bash
   cd server/chatbot-backend
   npm run init-db
   ```

### 6. Start the Application

**Development Mode:**

Terminal 1 (Backend):
```bash
cd server/chatbot-backend
npm run dev
```

Terminal 2 (Frontend):
   ```bash
cd client/chatbot-frontend-2
   npm start
   ```

**Production Mode:**
   ```bash
# Build frontend
cd client/chatbot-frontend-2
npm run build

# Start backend
cd server/chatbot-backend
   npm start
   ```

## ⚙️ Configuration

### OpenAI Setup

1. Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/)
2. Add the key to your `.env` file
3. The system will automatically create assistants for new users

### Email Configuration

1. Set up an SMTP server (Gmail, SendGrid, etc.)
2. Configure SMTP settings in your `.env` file
3. Enable email notifications in user settings

### Database Configuration

For production, ensure your PostgreSQL instance is properly configured:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Optimize for performance
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET track_activity_query_size = 2048;
ALTER SYSTEM SET log_min_duration_statement = 1000;
```

## 🔧 Usage

### User Interface

1. **Registration**: Create a new account
2. **Login**: Access your personal dashboard
3. **Chat**: Interact with your AI assistant
4. **History**: View conversation history
5. **Profile**: Manage your account settings

### Admin Interface

1. **Dashboard**: System overview and statistics
2. **User Management**: Manage user accounts
3. **AI Assistants**: Configure AI assistants
4. **System Settings**: Configure application settings
5. **Monitoring**: View system logs and activities

### API Usage

```javascript
// Authentication
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});

// Chat with AI
const chatResponse = await fetch('/api/chat/send', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ message: 'Hello Lisa!' })
});
```

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Chat Endpoints

- `POST /api/chat/send` - Send message to AI
- `GET /api/chat/history` - Get conversation history
- `POST /api/chat/conversation` - Start new conversation
- `DELETE /api/chat/conversation/:id` - Delete conversation

### User Management

- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/settings` - Get user settings
- `PUT /api/user/settings` - Update user settings

### Admin Endpoints

- `GET /api/admin/users` - Get all users
- `GET /api/admin/statistics` - Get system statistics
- `POST /api/admin/assistants` - Create AI assistant
- `GET /api/admin/activities` - Get activity logs

## 🛠️ Development

### Project Structure

```
lisa/
├── client/chatbot-frontend-2/          # React frontend
│   ├── src/
│   │   ├── components/              # React components
│   │   ├── pages/                  # Page components
│   │   ├── hooks/                  # Custom hooks
│   │   └── utils/                  # Utility functions
│   └── public/                     # Static assets
├── server/chatbot-backend/             # Node.js backend
│   ├── routes/                     # API routes
│   ├── middleware/                 # Express middleware
│   ├── services/                   # Business logic
│   ├── config/                     # Configuration files
│   └── scripts/                    # Database scripts
└── docs/                           # Documentation
```

### Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run database migrations
npm run migrate

# Initialize database
npm run init-db

# Run tests
npm test

# Build for production
npm run build
```

### Database Migrations

```bash
# Create migration
npm run migrate:create migration_name

# Run migrations
npm run migrate:up

# Rollback migration
npm run migrate:down
```

## 🚀 Production Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Scale services
docker-compose up -d --scale backend=3
```

### Manual Deployment

1. **Server Setup**
   ```bash
   # Install dependencies
   sudo apt update
   sudo apt install nodejs npm postgresql nginx

   # Configure PostgreSQL
   sudo -u postgres createdb lisa_db
   ```

2. **Application Deployment**
   ```bash
   # Clone repository
   git clone https://github.com/kartvirya/lisa.git
   cd lisa

   # Install dependencies
   npm install --production

   # Build frontend
   cd client/chatbot-frontend-2
   npm run build

   # Start backend with PM2
   pm2 start server/chatbot-backend/server.js --name lisa-backend
   ```

3. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       location /api/ {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### Health Check

```bash
# Check database connection
pg_isready -d lisa_db -h localhost -p 5432

# Check API health
curl http://localhost:5000/api/health

# Check frontend
curl http://localhost:3000
```

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Error**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Restart PostgreSQL
   sudo systemctl restart postgresql
   ```

2. **OpenAI API Errors**
   - Verify API key is correct
   - Check API quota and billing
   - Review OpenAI service status

3. **Frontend Build Issues**
   ```bash
   # Clear cache and rebuild
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

4. **Email Not Sending**
   - Verify SMTP credentials
   - Check firewall settings
   - Enable "Less secure app access" for Gmail

### Logs

```bash
# View application logs
tail -f server/chatbot-backend/logs/app.log

# View database logs
sudo tail -f /var/log/postgresql/postgresql-13-main.log

# View system logs
journalctl -u nginx -f
```

## 🤝 Contributing

We welcome contributions to Lisa AI! Please follow these guidelines:

1. **Fork the Repository**
2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit Changes**
   ```bash
   git commit -m "Add your feature description"
   ```
4. **Push to Branch**
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Create Pull Request**

### Code Style

- Use ESLint for JavaScript linting
- Follow React best practices
- Write meaningful commit messages
- Add tests for new features

### Bug Reports

Please include:
- Lisa version
- Node.js version
- Operating system
- Steps to reproduce
- Expected vs actual behavior

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for providing AI capabilities
- React team for the excellent frontend framework
- PostgreSQL community for the robust database
- All contributors and users of Lisa AI

---

**Lisa AI** - Intelligent Train Maintenance Assistant
