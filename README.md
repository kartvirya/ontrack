# OnTrack - AI-Powered Train Maintenance Assistant

OnTrack is a comprehensive AI-powered chatbot application designed specifically for train maintenance professionals. It provides intelligent assistance for troubleshooting, maintenance procedures, and accessing technical documentation for train components.

## 🚀 Features

### Core Functionality
- **AI-Powered Chat Interface**: Intelligent responses powered by OpenAI's GPT models
- **Train Component Recognition**: Automatic identification and display of train parts with images
- **Schematic Access**: Quick access to electrical schematics and technical diagrams
- **Multi-Assistant Support**: Personal assistants for authenticated users, default assistant for anonymous users
- **Real-time Notifications**: Toast notifications for user feedback and system status

### User Management & Authentication
- **User Authentication**: Secure login/registration system with JWT tokens
- **Role-Based Access Control**: Admin and regular user roles with different permissions
- **User Profiles**: Comprehensive user profile management with avatar upload
- **Account Settings**: Customizable preferences and notification settings
- **Password Management**: Secure password change functionality
- **Account Export/Delete**: Data export and account deletion options

### Chat Features
- **Persistent Chat History**: Automatic saving and loading of conversations
- **Advanced Search**: Full-text search across chat history with filters
- **Search Suggestions**: Intelligent search suggestions based on user history
- **Export Functionality**: Export chat history as JSON files
- **Message Filtering**: Filter by date range, message type, and content
- **Conversation Management**: Create, load, and delete conversations
- **Keyboard Shortcuts**: Global keyboard shortcuts for enhanced productivity

### Admin Dashboard
- **User Management**: View, edit, suspend, and delete user accounts
- **Assistant Management**: Create, update, and manage AI assistants
- **Vector Store Management**: Upload and manage knowledge base files
- **System Statistics**: Comprehensive analytics and usage statistics
- **Activity Monitoring**: Track user activities and system usage
- **Bulk Operations**: Assign assistants to users and manage permissions

### UI/UX Enhancements
- **Responsive Design**: Mobile-first design that works on all devices
- **Modern Interface**: Clean, professional design with smooth animations
- **Loading States**: Skeleton loaders and loading spinners for better UX
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Accessibility**: Keyboard navigation and screen reader support
- **Dark/Light Theme**: Theme switching capabilities (in settings)

### Technical Features
- **Component Architecture**: Modular React components for maintainability
- **State Management**: Efficient state management with React hooks
- **API Integration**: RESTful API with proper error handling
- **Database Management**: SQLite database with proper relationships
- **File Upload**: Secure file upload for avatars and documents
- **Search Engine**: Full-text search with ranking and filtering
- **Caching**: Efficient data caching for improved performance

## 🛠️ Technology Stack

### Frontend
- **React 18**: Modern React with hooks and functional components
- **React Router**: Client-side routing for SPA navigation
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Context API**: State management for authentication and notifications
- **Fetch API**: HTTP client for API communication

### Backend
- **Node.js**: JavaScript runtime for server-side development
- **Express.js**: Web framework for building REST APIs
- **SQLite**: Lightweight database for data persistence
- **JWT**: JSON Web Tokens for secure authentication
- **Multer**: File upload middleware
- **OpenAI API**: Integration with GPT models

### Development Tools
- **ESLint**: Code linting for consistent code quality
- **Create React App**: Development environment and build tools
- **npm**: Package management
- **Git**: Version control

## 📁 Project Structure

```
ontrack/
├── client/chatbot-frontend-2/          # React frontend application
│   ├── public/                         # Static assets
│   ├── src/
│   │   ├── components/                 # React components
│   │   │   ├── AdminDashboard.jsx      # Admin panel
│   │   │   ├── ChatInterface.jsx       # Main chat interface
│   │   │   ├── ChatHistory.jsx         # Chat history sidebar
│   │   │   ├── UserProfile.jsx         # User profile management
│   │   │   ├── AuthContext.jsx         # Authentication context
│   │   │   ├── NotificationSystem.jsx  # Toast notifications
│   │   │   ├── SearchComponent.jsx     # Advanced search
│   │   │   ├── LoadingSpinner.jsx      # Loading components
│   │   │   ├── KeyboardShortcuts.jsx   # Keyboard shortcuts
│   │   │   └── ...                     # Other components
│   │   ├── App.js                      # Main app component
│   │   └── index.js                    # App entry point
│   └── package.json                    # Frontend dependencies
├── server/chatbot-backend/             # Node.js backend
│   ├── routes/                         # API routes
│   │   ├── auth.js                     # Authentication routes
│   │   ├── admin.js                    # Admin routes
│   │   ├── chat.js                     # Chat and history routes
│   │   └── user.js                     # User profile routes
│   ├── middleware/                     # Express middleware
│   ├── scripts/                        # Database scripts
│   ├── uploads/                        # File uploads
│   ├── server.js                       # Main server file
│   └── package.json                    # Backend dependencies
└── README.md                           # Project documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ontrack
   ```

2. **Install backend dependencies**
   ```bash
   cd server/chatbot-backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../../client/chatbot-frontend-2
   npm install
   ```

4. **Set up environment variables**
   
   Create a `.env` file in `server/chatbot-backend/`:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   JWT_SECRET=your_jwt_secret_here
   PORT=3001
   ```

5. **Initialize the database**
   ```bash
   cd server/chatbot-backend
   npm run init-db
   ```

6. **Start the backend server**
   ```bash
   npm start
   ```

7. **Start the frontend development server**
   ```bash
   cd ../../client/chatbot-frontend-2
   npm start
   ```

8. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## 🎯 Usage

### For Regular Users
1. **Registration/Login**: Create an account or sign in
2. **Chat Interface**: Start conversations with the AI assistant
3. **Chat History**: Access previous conversations via the sidebar
4. **Search**: Use the search feature to find specific conversations
5. **Profile Management**: Update your profile and settings
6. **Export Data**: Export your chat history for backup

### For Administrators
1. **Admin Access**: Use admin credentials to access the admin panel
2. **User Management**: View and manage user accounts
3. **Assistant Management**: Create and configure AI assistants
4. **System Monitoring**: View system statistics and user activities
5. **Content Management**: Upload and manage knowledge base files

### Keyboard Shortcuts
- `Ctrl/Cmd + K`: Focus input field
- `Ctrl/Cmd + N`: Start new chat
- `Ctrl/Cmd + H`: Toggle chat history
- `Ctrl/Cmd + P`: Go to profile
- `Ctrl/Cmd + A`: Go to admin (admin only)
- `Ctrl/Cmd + /`: Show keyboard shortcuts help
- `Home`: Go to chat interface
- `Escape`: Close modals/sidebars

## 🔧 Configuration

### Environment Variables
- `OPENAI_API_KEY`: Your OpenAI API key for GPT integration
- `JWT_SECRET`: Secret key for JWT token signing
- `PORT`: Backend server port (default: 3001)
- `NODE_ENV`: Environment mode (development/production)

### Database Configuration
The application uses SQLite for data persistence. The database file is automatically created when you run the initialization script.

### OpenAI Configuration
Configure your OpenAI assistant settings in the admin panel:
- Model selection (GPT-4, GPT-3.5-turbo)
- Custom instructions and prompts
- Vector store integration for knowledge base

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify JWT token

### Chat Endpoints
- `POST /api/chat` - Send message to AI
- `GET /api/chat/history` - Get user's chat history
- `GET /api/chat/history/:threadId` - Get specific conversation
- `POST /api/chat/history` - Save conversation
- `DELETE /api/chat/history/:threadId` - Delete conversation
- `GET /api/chat/search` - Search chat history
- `GET /api/chat/search/suggestions` - Get search suggestions

### User Endpoints
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `POST /api/user/profile/avatar` - Upload avatar
- `GET /api/user/settings` - Get user settings
- `PUT /api/user/settings` - Update user settings
- `PUT /api/user/password` - Change password
- `GET /api/user/account/stats` - Get account statistics
- `GET /api/user/account/export` - Export user data
- `DELETE /api/user/account` - Delete user account

### Admin Endpoints
- `GET /api/admin/users` - Get all users
- `PATCH /api/admin/users/:id/status` - Update user status
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/assistants` - Get all assistants
- `POST /api/admin/assistants` - Create assistant
- `PATCH /api/admin/assistants/:id` - Update assistant
- `DELETE /api/admin/assistants/:id` - Delete assistant
- `GET /api/admin/statistics` - Get system statistics
- `GET /api/admin/activities` - Get user activities

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt for secure password storage
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Prevention**: Parameterized queries
- **File Upload Security**: File type and size validation
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Configuration**: Proper cross-origin resource sharing
- **Environment Variables**: Sensitive data stored in environment variables

## 🚀 Deployment

### Production Build
```bash
cd client/chatbot-frontend-2
npm run build
```

### Environment Setup
1. Set production environment variables
2. Configure database for production
3. Set up reverse proxy (nginx recommended)
4. Configure SSL certificates
5. Set up monitoring and logging

### Docker Deployment (Optional)
Create Dockerfile for containerized deployment:
```dockerfile
# Frontend Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation for common solutions

## 🔄 Version History

- **v1.0.0** - Initial release with basic chat functionality
- **v1.1.0** - Added user authentication and profiles
- **v1.2.0** - Implemented chat history and search
- **v1.3.0** - Added admin dashboard and user management
- **v1.4.0** - Enhanced UI/UX with notifications and shortcuts
- **v1.5.0** - Added advanced search and export functionality

## 🎯 Roadmap

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Voice chat integration
- [ ] Advanced AI model fine-tuning
- [ ] Integration with external maintenance systems
- [ ] Real-time collaboration features
- [ ] Advanced reporting and insights

---

**OnTrack** - Empowering train maintenance professionals with AI-powered assistance. # ontrack
