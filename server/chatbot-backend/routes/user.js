const express = require('express');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();
const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

// Configure multer for avatar uploads
const upload = multer({
  dest: 'uploads/avatars/',
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
  }
});

// Apply authentication to all routes
router.use(authenticateToken);

// ===== PROFILE MANAGEMENT =====

// Get user profile
router.get('/profile', logActivity('user_view_profile'), (req, res) => {
  const userId = req.user.id;
  const db = new sqlite3.Database(DB_PATH);
  
  db.get(`
    SELECT 
      u.id, u.username, u.email, u.role, u.status, u.created_at, u.last_login,
      p.first_name, p.last_name, p.phone, p.department, p.job_title, 
      p.bio, p.avatar_url, p.timezone, p.language, p.date_format
    FROM users u
    LEFT JOIN user_profiles p ON u.id = p.user_id
    WHERE u.id = ?
  `, [userId], (err, user) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ profile: user });
  });
});

// Update user profile
router.put('/profile', logActivity('user_update_profile'), (req, res) => {
  const userId = req.user.id;
  const {
    first_name, last_name, phone, department, job_title, bio,
    timezone, language, date_format
  } = req.body;
  
  const db = new sqlite3.Database(DB_PATH);
  
  // Check if profile exists
  db.get(`SELECT id FROM user_profiles WHERE user_id = ?`, [userId], (err, profile) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (profile) {
      // Update existing profile
      db.run(`
        UPDATE user_profiles 
        SET first_name = ?, last_name = ?, phone = ?, department = ?, 
            job_title = ?, bio = ?, timezone = ?, language = ?, 
            date_format = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [first_name, last_name, phone, department, job_title, bio, 
          timezone, language, date_format, userId], function(err) {
        db.close();
        
        if (err) {
          return res.status(500).json({ error: 'Error updating profile' });
        }
        
        res.json({ message: 'Profile updated successfully' });
      });
    } else {
      // Create new profile
      db.run(`
        INSERT INTO user_profiles 
        (user_id, first_name, last_name, phone, department, job_title, 
         bio, timezone, language, date_format)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [userId, first_name, last_name, phone, department, job_title, 
          bio, timezone, language, date_format], function(err) {
        db.close();
        
        if (err) {
          return res.status(500).json({ error: 'Error creating profile' });
        }
        
        res.json({ message: 'Profile created successfully' });
      });
    }
  });
});

// Upload avatar
router.post('/profile/avatar', upload.single('avatar'), logActivity('user_upload_avatar'), (req, res) => {
  const userId = req.user.id;
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  const db = new sqlite3.Database(DB_PATH);
  
  // Update or create profile with avatar URL
  db.run(`
    INSERT OR REPLACE INTO user_profiles 
    (user_id, avatar_url, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `, [userId, avatarUrl], function(err) {
    db.close();
    
    if (err) {
      return res.status(500).json({ error: 'Error saving avatar' });
    }
    
    res.json({ 
      message: 'Avatar uploaded successfully',
      avatar_url: avatarUrl
    });
  });
});

// ===== SETTINGS MANAGEMENT =====

// Get user settings
router.get('/settings', logActivity('user_view_settings'), (req, res) => {
  const userId = req.user.id;
  const db = new sqlite3.Database(DB_PATH);
  
  db.get(`
    SELECT * FROM user_settings WHERE user_id = ?
  `, [userId], (err, settings) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Return default settings if none exist
    if (!settings) {
      settings = {
        theme: 'light',
        chat_sound_enabled: true,
        email_notifications: true,
        push_notifications: true,
        auto_save_conversations: true,
        conversation_retention_days: 365,
        default_assistant_model: 'gpt-4-1106-preview',
        sidebar_collapsed: false,
        show_timestamps: true,
        compact_mode: false
      };
    }
    
    res.json({ settings });
  });
});

// Update user settings
router.put('/settings', logActivity('user_update_settings'), (req, res) => {
  const userId = req.user.id;
  const {
    theme, chat_sound_enabled, email_notifications, push_notifications,
    auto_save_conversations, conversation_retention_days, default_assistant_model,
    sidebar_collapsed, show_timestamps, compact_mode
  } = req.body;
  
  const db = new sqlite3.Database(DB_PATH);
  
  db.run(`
    INSERT OR REPLACE INTO user_settings 
    (user_id, theme, chat_sound_enabled, email_notifications, push_notifications,
     auto_save_conversations, conversation_retention_days, default_assistant_model,
     sidebar_collapsed, show_timestamps, compact_mode, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [userId, theme, chat_sound_enabled, email_notifications, push_notifications,
      auto_save_conversations, conversation_retention_days, default_assistant_model,
      sidebar_collapsed, show_timestamps, compact_mode], function(err) {
    db.close();
    
    if (err) {
      return res.status(500).json({ error: 'Error updating settings' });
    }
    
    res.json({ message: 'Settings updated successfully' });
  });
});

// ===== PASSWORD MANAGEMENT =====

// Change password
router.put('/password', logActivity('user_change_password'), async (req, res) => {
  const userId = req.user.id;
  const { current_password, new_password } = req.body;
  
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new passwords are required' });
  }
  
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }
  
  const db = new sqlite3.Database(DB_PATH);
  
  // Verify current password
  db.get(`SELECT password_hash FROM users WHERE id = ?`, [userId], async (err, user) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      db.close();
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isValidPassword = await bcrypt.compare(current_password, user.password_hash);
    
    if (!isValidPassword) {
      db.close();
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password and update
    const hashedPassword = await bcrypt.hash(new_password, 10);
    
    db.run(`
      UPDATE users 
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [hashedPassword, userId], function(err) {
      db.close();
      
      if (err) {
        return res.status(500).json({ error: 'Error updating password' });
      }
      
      res.json({ message: 'Password updated successfully' });
    });
  });
});

// Request password reset
router.post('/password/reset-request', logActivity('user_request_password_reset'), (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  const db = new sqlite3.Database(DB_PATH);
  
  db.get(`SELECT id FROM users WHERE email = ?`, [email], (err, user) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      db.close();
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }
    
    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
    
    db.run(`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `, [user.id, token, expiresAt], function(err) {
      db.close();
      
      if (err) {
        return res.status(500).json({ error: 'Error creating reset token' });
      }
      
      // TODO: Send email with reset link
      // For now, just return success
      res.json({ 
        message: 'If the email exists, a reset link has been sent',
        // In development, return the token
        ...(process.env.NODE_ENV === 'development' && { reset_token: token })
      });
    });
  });
});

// ===== NOTIFICATIONS =====

// Get user notifications
router.get('/notifications', logActivity('user_view_notifications'), (req, res) => {
  const userId = req.user.id;
  const { limit = 50, offset = 0, unread_only = false } = req.query;
  
  const db = new sqlite3.Database(DB_PATH);
  
  let query = `
    SELECT * FROM notifications 
    WHERE user_id = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
  `;
  
  if (unread_only === 'true') {
    query += ` AND read_status = 0`;
  }
  
  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  
  db.all(query, [userId, parseInt(limit), parseInt(offset)], (err, notifications) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ notifications });
  });
});

// Mark notification as read
router.patch('/notifications/:notificationId/read', logActivity('user_mark_notification_read'), (req, res) => {
  const userId = req.user.id;
  const { notificationId } = req.params;
  
  const db = new sqlite3.Database(DB_PATH);
  
  db.run(`
    UPDATE notifications 
    SET read_status = 1 
    WHERE id = ? AND user_id = ?
  `, [notificationId, userId], function(err) {
    db.close();
    
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification marked as read' });
  });
});

// Mark all notifications as read
router.patch('/notifications/read-all', logActivity('user_mark_all_notifications_read'), (req, res) => {
  const userId = req.user.id;
  
  const db = new sqlite3.Database(DB_PATH);
  
  db.run(`
    UPDATE notifications 
    SET read_status = 1 
    WHERE user_id = ? AND read_status = 0
  `, [userId], function(err) {
    db.close();
    
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ 
      message: 'All notifications marked as read',
      updated_count: this.changes
    });
  });
});

// ===== ACCOUNT MANAGEMENT =====

// Get account statistics
router.get('/account/stats', logActivity('user_view_account_stats'), (req, res) => {
  const userId = req.user.id;
  const db = new sqlite3.Database(DB_PATH);
  
  // Get conversation count
  db.get(`SELECT COUNT(*) as conversation_count FROM conversations WHERE user_id = ?`, [userId], (err, convStats) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Get message count
    db.get(`
      SELECT COUNT(cm.id) as message_count 
      FROM conversation_messages cm
      JOIN conversations c ON cm.conversation_id = c.id
      WHERE c.user_id = ?
    `, [userId], (err, msgStats) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Get activity count (last 30 days)
      db.get(`
        SELECT COUNT(*) as recent_activity_count
        FROM activity_logs 
        WHERE user_id = ? AND created_at >= datetime('now', '-30 days')
      `, [userId], (err, activityStats) => {
        db.close();
        
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        res.json({
          stats: {
            conversations: convStats.conversation_count,
            messages: msgStats.message_count,
            recent_activities: activityStats.recent_activity_count,
            account_age_days: Math.floor((Date.now() - new Date(req.user.created_at).getTime()) / (1000 * 60 * 60 * 24))
          }
        });
      });
    });
  });
});

// Export user data
router.get('/account/export', logActivity('user_export_data'), (req, res) => {
  const userId = req.user.id;
  const db = new sqlite3.Database(DB_PATH);
  
  const exportData = {};
  
  // Get user profile
  db.get(`
    SELECT u.*, p.* FROM users u
    LEFT JOIN user_profiles p ON u.id = p.user_id
    WHERE u.id = ?
  `, [userId], (err, profile) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }
    
    exportData.profile = profile;
    
    // Get conversations
    db.all(`
      SELECT c.*, GROUP_CONCAT(cm.role || ': ' || cm.content, '\n---\n') as messages
      FROM conversations c
      LEFT JOIN conversation_messages cm ON c.id = cm.conversation_id
      WHERE c.user_id = ?
      GROUP BY c.id
    `, [userId], (err, conversations) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }
      
      exportData.conversations = conversations;
      
      // Get activity logs
      db.all(`
        SELECT * FROM activity_logs 
        WHERE user_id = ?
        ORDER BY created_at DESC
      `, [userId], (err, activities) => {
        db.close();
        
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        exportData.activities = activities;
        exportData.exported_at = new Date().toISOString();
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="ontrack-data-export-${userId}-${Date.now()}.json"`);
        res.json(exportData);
      });
    });
  });
});

// Delete account
router.delete('/account', logActivity('user_delete_account'), async (req, res) => {
  const userId = req.user.id;
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Password confirmation is required' });
  }
  
  const db = new sqlite3.Database(DB_PATH);
  
  // Verify password
  db.get(`SELECT password_hash FROM users WHERE id = ?`, [userId], async (err, user) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      db.close();
      return res.status(400).json({ error: 'Password is incorrect' });
    }
    
    // Delete user (CASCADE will handle related records)
    db.run(`DELETE FROM users WHERE id = ?`, [userId], function(err) {
      db.close();
      
      if (err) {
        return res.status(500).json({ error: 'Error deleting account' });
      }
      
      res.json({ message: 'Account deleted successfully' });
    });
  });
});

module.exports = router; 