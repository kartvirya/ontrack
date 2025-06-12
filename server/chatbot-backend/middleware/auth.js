const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
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
  return (req, res, next) => {
    const db = new sqlite3.Database(DB_PATH);
    
    const userId = req.user ? req.user.id : null;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const details = JSON.stringify({
      url: req.originalUrl,
      method: req.method,
      body: req.method === 'POST' ? req.body : undefined
    });

    db.run(`
      INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, action, details, ipAddress, userAgent], (err) => {
      if (err) {
        console.error('Error logging activity:', err);
      }
      db.close();
    });

    next();
  };
};

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Verify user credentials
const verifyUser = (userId) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    
    db.get(`
      SELECT id, username, email, role, status, openai_assistant_id, vector_store_id
      FROM users 
      WHERE id = ? AND status = 'active'
    `, [userId], (err, row) => {
      db.close();
      
      if (err) {
        reject(err);
      } else if (!row) {
        reject(new Error('User not found or inactive'));
      } else {
        resolve(row);
      }
    });
  });
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireActiveUser,
  logActivity,
  generateToken,
  verifyUser,
  JWT_SECRET
}; 