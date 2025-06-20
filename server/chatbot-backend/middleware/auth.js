const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Middleware to check if user account is active
const requireActiveUser = (req, res, next) => {
  if (!req.user || req.user.status !== 'active') {
    return res.status(403).json({ error: 'Account is suspended or inactive' });
  }
  next();
};

// Middleware to log user activity
const logActivity = (action) => {
  return async (req, res, next) => {
    try {
      const userId = req.user ? req.user.id : null;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      
      // Create user-friendly descriptions based on action
      let readableDetails = '';
      
      switch (action) {
        case 'admin_view_activities':
          readableDetails = 'Viewed system activities dashboard';
          break;
        case 'admin_view_vector_stores':
          readableDetails = 'Viewed vector stores management page';
          break;
        case 'admin_view_assistants':
          readableDetails = 'Viewed AI assistants management page';
          break;
        case 'admin_view_users':
          readableDetails = 'Viewed users management page';
          break;
        case 'admin_view_stats':
          readableDetails = 'Viewed system statistics dashboard';
          break;
        case 'user_update_settings':
          readableDetails = 'Updated user profile settings';
          break;
        case 'user_login':
          readableDetails = 'Successfully logged into the system';
          break;
        case 'user_logout':
          readableDetails = 'Logged out from the system';
          break;
        case 'admin_create_user':
          readableDetails = 'Created a new user account';
          break;
        case 'admin_delete_user':
          readableDetails = 'Deleted a user account';
          break;
        case 'admin_update_user_status':
          readableDetails = 'Updated user account status';
          break;
        case 'admin_assign_assistant':
          readableDetails = 'Assigned AI assistant to user';
          break;
        case 'admin_remove_assistant':
          readableDetails = 'Removed AI assistant from user';
          break;
        case 'admin_create_assistant':
          readableDetails = 'Created new AI assistant';
          break;
        case 'admin_update_assistant':
          readableDetails = 'Updated AI assistant configuration';
          break;
        case 'admin_delete_assistant':
          readableDetails = 'Deleted AI assistant';
          break;
        case 'admin_create_vector_store':
          readableDetails = 'Created new document vector store';
          break;
        case 'admin_update_vector_store':
          readableDetails = 'Updated vector store configuration';
          break;
        case 'admin_delete_vector_store':
          readableDetails = 'Deleted document vector store';
          break;
        case 'chat_message_sent':
          readableDetails = 'Sent message in chat conversation';
          break;
        case 'chat_history_save':
          readableDetails = 'Saved chat conversation';
          break;
        case 'chat_history_load':
          readableDetails = 'Loaded chat conversation history';
          break;
        case 'file_upload':
          readableDetails = 'Uploaded file to vector store';
          break;
        case 'file_delete':
          readableDetails = 'Deleted file from vector store';
          break;
        case 'table_recreated':
          readableDetails = 'Database table structure was recreated';
          break;
        case 'system_health_check':
          readableDetails = 'Performed system health check';
          break;
        case 'admin_bulk_update_instructions':
          readableDetails = 'Updated instructions for multiple assistants';
          break;
        case 'admin_view_system_settings':
          readableDetails = 'Viewed system configuration settings';
          break;
        case 'admin_update_system_setting':
          readableDetails = 'Updated system configuration setting';
          break;
        case 'admin_create_system_setting':
          readableDetails = 'Created new system configuration setting';
          break;
        default:
          // For unknown actions, create a readable version
          readableDetails = action
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace(/Api/g, 'API')
            .replace(/Ai/g, 'AI');
      }

      // Add context information if available
      if (req.method && req.originalUrl) {
        const urlParts = req.originalUrl.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        
        // Add specific resource information if available
        if (lastPart && lastPart !== 'api' && !lastPart.includes('?')) {
          if (lastPart.match(/^\d+$/)) {
            readableDetails += ` (ID: ${lastPart})`;
          } else if (lastPart.length < 50 && !lastPart.includes('%')) {
            readableDetails += ` (${lastPart})`;
          }
        }
      }

      // Try to log activity, but don't fail if table doesn't exist
      try {
        await query(`
          INSERT INTO user_activity (user_id, action, details, ip_address, user_agent)
          VALUES ($1, $2, $3, $4, $5)
        `, [userId, action, readableDetails, ipAddress, userAgent]);
      } catch (dbError) {
        // Log the error but don't fail the request
        console.warn('Activity logging failed (table may not exist):', dbError.message);
      }
    } catch (error) {
      console.error('Error in activity logging middleware:', error);
    }

    next();
  };
};

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Helper function to verify user exists and is active
const verifyUser = async (userId) => {
  try {
    const result = await query(`
      SELECT id, username, email, role, status, openai_assistant_id, vector_store_id
      FROM users 
      WHERE id = $1 AND status = 'active'
    `, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error verifying user:', error);
    return null;
  }
};

// Middleware to validate session
const validateSession = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
      
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Check if session exists and is valid
    const result = await query(`
      SELECT us.*, u.username, u.email, u.role, u.status
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.session_token = $1 AND us.expires_at > NOW()
    `, [token]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const session = result.rows[0];
    
    // Check if user is active
    if (session.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended' });
    }

    req.user = {
      id: session.user_id,
      username: session.username,
      email: session.email,
      role: session.role
    };

    next();
  } catch (error) {
    console.error('Session validation error:', error);
    return res.status(500).json({ error: 'Session validation failed' });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireActiveUser,
  logActivity,
  generateToken,
  validateSession,
  verifyUser,
  JWT_SECRET
}; 