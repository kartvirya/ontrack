const express = require('express');
const bcrypt = require('bcryptjs');
const { query, getClient } = require('../config/database');
const { generateToken, logActivity, authenticateToken } = require('../middleware/auth');
const { authLimiter, passwordResetLimiter, resetRateLimit } = require('../middleware/rateLimiter');
const emailService = require('../services/emailService');
const OpenAIAgentManager = require('../services/openai-agent-manager');
const crypto = require('crypto');

const router = express.Router();

// User registration
router.post('/register', authLimiter, logActivity('user_register'), async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await query(`
      SELECT id FROM users WHERE username = $1 OR email = $2
    `, [username, email]);

    if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
    const result = await query(`
        INSERT INTO users (username, email, password_hash, role, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, role, status, created_at
    `, [username, email, hashedPassword, 'user', 'active']);

    const newUser = result.rows[0];
    let agentInfo = null;

    // Create OpenAI assistant for the user
    try {
          const agentManager = new OpenAIAgentManager();
      agentInfo = await agentManager.createUserAgent(newUser.id, username);
    } catch (agentError) {
      console.error('Failed to create OpenAI assistant:', agentError);
      // Don't fail registration if agent creation fails
    }

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(email, username);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    // Generate token
    const token = generateToken(newUser);
            
            res.status(201).json({
              message: 'User registered successfully',
              user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status
              },
      token,
      agentInfo
            });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// User login
router.post('/login', authLimiter, logActivity('user_login'), async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const result = await query(`
      SELECT id, username, email, password_hash, role, status, openai_assistant_id, vector_store_id
      FROM users 
      WHERE username = $1 OR email = $1
    `, [username]);

    if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

    const user = result.rows[0];

    // Check if user is active
      if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
    await query(`
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [user.id]);
        
    // Generate token
        const token = generateToken(user);
        
        res.json({
          message: 'Login successful',
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status,
            hasAgent: !!(user.openai_assistant_id && user.vector_store_id)
          },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Forgot password
router.post('/forgot-password', passwordResetLimiter, logActivity('forgot_password'), async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user
    const result = await query(`
      SELECT id, username, email 
      FROM users 
      WHERE email = $1 AND status = 'active'
    `, [email]);

    if (result.rows.length === 0) {
      // Don't reveal if email exists or not
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    const user = result.rows[0];
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Store reset token
    await query(`
      UPDATE users 
      SET reset_token = $1, reset_token_expiry = $2 
      WHERE id = $3
    `, [resetToken, resetTokenExpiry, user.id]);

    // Send reset email
    try {
      await emailService.sendPasswordResetEmail(user.email, user.username, resetToken);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      return res.status(500).json({ error: 'Failed to send reset email' });
    }

    res.json({ message: 'If the email exists, a reset link has been sent' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password
router.post('/reset-password', passwordResetLimiter, logActivity('reset_password'), async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }
      
    // Find user with valid reset token
    const result = await query(`
      SELECT id, username, email 
      FROM users 
      WHERE reset_token = $1 AND reset_token_expiry > CURRENT_TIMESTAMP AND status = 'active'
    `, [token]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
      }
      
    const user = result.rows[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await query(`
      UPDATE users 
      SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL 
      WHERE id = $2
    `, [hashedPassword, user.id]);
        
    res.json({ message: 'Password reset successful' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
          }
        });

// Logout (optional - mainly for session cleanup)
router.post('/logout', authenticateToken, logActivity('user_logout'), async (req, res) => {
  try {
    // If using sessions, clean them up here
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      await query(`
        DELETE FROM user_sessions 
        WHERE session_token = $1
      `, [token]);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token (for frontend to check if token is still valid)
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    message: 'Token is valid',
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Change password (for authenticated users)
router.post('/change-password', authenticateToken, logActivity('change_password'), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get current password hash
    const result = await query(`
      SELECT password_hash 
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(`
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [hashedPassword, userId]);

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Development endpoint to reset rate limits (only available in development)
router.post('/dev/reset-rate-limit', (req, res) => {
  // Allow in development (when NODE_ENV is undefined or 'development')
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    // Reset rate limits for the client IP
    resetRateLimit(authLimiter, clientIP);
    resetRateLimit(passwordResetLimiter, clientIP);
    
    res.json({ 
      message: 'Rate limits reset successfully',
      ip: clientIP,
      env: process.env.NODE_ENV || 'development',
      note: 'This endpoint is only available in development mode'
    });
  } catch (error) {
    console.error('Error resetting rate limits:', error);
    res.status(500).json({ error: 'Failed to reset rate limits' });
  }
});

module.exports = router; 