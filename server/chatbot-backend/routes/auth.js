const express = require('express');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { generateToken, logActivity, authenticateToken } = require('../middleware/auth');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const emailService = require('../services/emailService');
const OpenAIAgentManager = require('../services/openai-agent-manager');

const router = express.Router();
const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

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

    const db = new sqlite3.Database(DB_PATH);

    // Check if user already exists
    db.get(`SELECT id FROM users WHERE username = ? OR email = ?`, [username, email], async (err, row) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }

      if (row) {
        db.close();
        return res.status(400).json({ error: 'Username or email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      db.run(`
        INSERT INTO users (username, email, password_hash, role, status)
        VALUES (?, ?, ?, ?, ?)
      `, [username, email, hashedPassword, 'user', 'active'], async function(err) {
        if (err) {
          db.close();
          return res.status(500).json({ error: 'Error creating user' });
        }

        const userId = this.lastID;
        
        try {
          // Provision OpenAI agent for new user
          console.log(`🚀 Provisioning agent for new user: ${username} (ID: ${userId})`);
          const agentManager = new OpenAIAgentManager();
          const agentSetup = await agentManager.provisionUserAgent(userId, username);
          agentManager.close();

          // Send welcome email
          try {
            await emailService.sendWelcomeEmail(email, username);
          } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail registration if email fails
          }

          // Get the complete user data
          db.get(`SELECT id, username, email, role, status FROM users WHERE id = ?`, [userId], (err, user) => {
            db.close();
            
            if (err) {
              return res.status(500).json({ error: 'Error retrieving user data' });
            }

            const token = generateToken(user);
            
            res.status(201).json({
              message: 'User registered successfully',
              user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                status: user.status
              },
              token: token,
              agentInfo: {
                assistantId: agentSetup.assistant.id,
                vectorStoreId: agentSetup.vectorStore.id
              }
            });
          });
        } catch (agentError) {
          console.error('Error provisioning agent:', agentError);
          
          // Still return success for user creation, but note agent provisioning failed
          db.get(`SELECT id, username, email, role, status FROM users WHERE id = ?`, [userId], (err, user) => {
            db.close();
            
            if (err) {
              return res.status(500).json({ error: 'Error retrieving user data' });
            }

            const token = generateToken(user);
            
            res.status(201).json({
              message: 'User registered successfully, but agent provisioning failed',
              user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                status: user.status
              },
              token: token,
              agentError: 'Agent provisioning failed - contact admin'
            });
          });
        }
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
router.post('/login', authLimiter, logActivity('user_login'), async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const db = new sqlite3.Database(DB_PATH);

    db.get(`
      SELECT id, username, email, password_hash, role, status, openai_assistant_id, vector_store_id
      FROM users 
      WHERE username = ? OR email = ?
    `, [username, username], async (err, user) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        db.close();
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (user.status !== 'active') {
        db.close();
        return res.status(403).json({ error: 'Account is suspended or inactive' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        db.close();
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      db.run(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, [user.id], (err) => {
        db.close();
        
        if (err) {
          console.error('Error updating last login:', err);
        }

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
          token: token
        });
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Provision agent for existing user (admin only)
router.post('/provision-agent/:userId', logActivity('provision_agent'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    const db = new sqlite3.Database(DB_PATH);
    
    // Get user info
    db.get(`SELECT id, username, openai_assistant_id FROM users WHERE id = ?`, [userId], async (err, user) => {
      db.close();
      
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (user.openai_assistant_id) {
        return res.status(400).json({ error: 'User already has an agent' });
      }
      
      try {
        const agentManager = new OpenAIAgentManager();
        const agentSetup = await agentManager.provisionUserAgent(userId, user.username);
        agentManager.close();
        
        res.json({
          message: 'Agent provisioned successfully',
          agentInfo: {
            assistantId: agentSetup.assistant.id,
            vectorStoreId: agentSetup.vectorStore.id
          }
        });
      } catch (agentError) {
        console.error('Error provisioning agent:', agentError);
        res.status(500).json({ error: 'Failed to provision agent' });
      }
    });
  } catch (error) {
    console.error('Provision agent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user info
router.get('/me', authenticateToken, (req, res) => {
  // The authenticateToken middleware adds the user to req.user
  const user = req.user;
  
  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      hasAgent: !!(user.openai_assistant_id && user.vector_store_id)
    }
  });
});

// User logout
router.post('/logout', authenticateToken, logActivity('user_logout'), (req, res) => {
  res.json({ message: 'Logout successful' });
});

// Forgot password
router.post('/forgot-password', passwordResetLimiter, logActivity('forgot_password'), async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const db = new sqlite3.Database(DB_PATH);

    // Check if user exists
    db.get(`SELECT id, username, email FROM users WHERE email = ?`, [email], async (err, user) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        db.close();
        // Don't reveal if email exists or not for security
        return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
      }

      // Generate reset token (in production, use crypto.randomBytes)
      const resetToken = require('crypto').randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Store reset token in database
      db.run(`
        UPDATE users 
        SET reset_token = ?, reset_token_expiry = ? 
        WHERE id = ?
      `, [resetToken, resetTokenExpiry.toISOString(), user.id], async (err) => {
        db.close();
        
        if (err) {
          console.error('Error storing reset token:', err);
          return res.status(500).json({ error: 'Error processing password reset' });
        }

        try {
          // Send password reset email
          await emailService.sendPasswordResetEmail(email, resetToken, user.username);
          
          res.json({ 
            message: 'If an account with that email exists, a password reset link has been sent.'
          });
        } catch (emailError) {
          console.error('Error sending password reset email:', emailError);
          res.status(500).json({ error: 'Error sending password reset email' });
        }
      });
    });
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

    const db = new sqlite3.Database(DB_PATH);

    // Find user with valid reset token
    db.get(`
      SELECT id, username, email 
      FROM users 
      WHERE reset_token = ? AND reset_token_expiry > datetime('now')
    `, [token], async (err, user) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        db.close();
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and clear reset token
      db.run(`
        UPDATE users 
        SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL 
        WHERE id = ?
      `, [hashedPassword, user.id], (err) => {
        db.close();
        
        if (err) {
          console.error('Error updating password:', err);
          return res.status(500).json({ error: 'Error updating password' });
        }

        res.json({ message: 'Password reset successful' });
      });
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 