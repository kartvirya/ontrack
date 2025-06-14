const express = require('express');
const { query, getClient } = require('../config/database');
const { authenticateToken, logActivity } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const router = express.Router();

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

// Apply authentication middleware to all routes
router.use(authenticateToken);

// ===== PROFILE MANAGEMENT =====

// Get user profile
router.get('/profile', logActivity('user_view_profile'), async (req, res) => {
  try {
  const userId = req.user.id;
  
    const result = await query(`
    SELECT 
      u.id, u.username, u.email, u.role, u.status, u.created_at, u.last_login,
        u.openai_assistant_id, u.vector_store_id,
        up.first_name, up.last_name, up.phone, up.department, up.job_title,
        up.bio, up.avatar_url, up.timezone, up.language, up.date_format
    FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        hasAgent: !!(user.openai_assistant_id && user.vector_store_id),
        profile: {
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          department: user.department,
          jobTitle: user.job_title,
          bio: user.bio,
          avatarUrl: user.avatar_url,
          timezone: user.timezone || 'UTC',
          language: user.language || 'en',
          dateFormat: user.date_format || 'MM/DD/YYYY'
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update user profile
router.put('/profile', logActivity('user_update_profile'), async (req, res) => {
  const client = await getClient();
  
  try {
  const userId = req.user.id;
  const {
      firstName, lastName, phone, department, jobTitle, bio, avatarUrl,
      timezone, language, dateFormat
  } = req.body;
  
    await client.query('BEGIN');
  
    // Update or insert profile
    await client.query(`
      INSERT INTO user_profiles 
      (user_id, first_name, last_name, phone, department, job_title, bio, 
       avatar_url, timezone, language, date_format, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        department = EXCLUDED.department,
        job_title = EXCLUDED.job_title,
        bio = EXCLUDED.bio,
        avatar_url = EXCLUDED.avatar_url,
        timezone = EXCLUDED.timezone,
        language = EXCLUDED.language,
        date_format = EXCLUDED.date_format,
        updated_at = CURRENT_TIMESTAMP
    `, [userId, firstName, lastName, phone, department, jobTitle, bio, 
        avatarUrl, timezone, language, dateFormat]);

    // Update users table timestamp
    await client.query(`
      UPDATE users 
      SET updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [userId]);

    await client.query('COMMIT');
        res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Error updating profile' });
  } finally {
    client.release();
  }
});

// Upload avatar
router.post('/profile/avatar', upload.single('avatar'), logActivity('user_upload_avatar'), async (req, res) => {
  try {
  const userId = req.user.id;
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  
  // Update or create profile with avatar URL
    await query(`
      INSERT INTO user_profiles 
    (user_id, avatar_url, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id)
      DO UPDATE SET 
        avatar_url = EXCLUDED.avatar_url,
        updated_at = CURRENT_TIMESTAMP
    `, [userId, avatarUrl]);
    
    res.json({ 
      message: 'Avatar uploaded successfully',
      avatar_url: avatarUrl
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Error saving avatar' });
  }
});

// ===== SETTINGS MANAGEMENT =====

// Get user settings
router.get('/settings', logActivity('user_view_settings'), async (req, res) => {
  try {
  const userId = req.user.id;
    
    const result = await query(`
      SELECT * FROM user_settings WHERE user_id = $1
    `, [userId]);

    let settings;
    if (result.rows.length === 0) {
    // Return default settings if none exist
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
    } else {
      settings = result.rows[0];
    }
    
    res.json({ settings });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update user settings
router.put('/settings', logActivity('user_update_settings'), async (req, res) => {
  try {
  const userId = req.user.id;
  const {
    theme, chat_sound_enabled, email_notifications, push_notifications,
    auto_save_conversations, conversation_retention_days, default_assistant_model,
    sidebar_collapsed, show_timestamps, compact_mode
  } = req.body;
  
    await query(`
      INSERT INTO user_settings 
    (user_id, theme, chat_sound_enabled, email_notifications, push_notifications,
     auto_save_conversations, conversation_retention_days, default_assistant_model,
     sidebar_collapsed, show_timestamps, compact_mode, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        theme = EXCLUDED.theme,
        chat_sound_enabled = EXCLUDED.chat_sound_enabled,
        email_notifications = EXCLUDED.email_notifications,
        push_notifications = EXCLUDED.push_notifications,
        auto_save_conversations = EXCLUDED.auto_save_conversations,
        conversation_retention_days = EXCLUDED.conversation_retention_days,
        default_assistant_model = EXCLUDED.default_assistant_model,
        sidebar_collapsed = EXCLUDED.sidebar_collapsed,
        show_timestamps = EXCLUDED.show_timestamps,
        compact_mode = EXCLUDED.compact_mode,
        updated_at = CURRENT_TIMESTAMP
  `, [userId, theme, chat_sound_enabled, email_notifications, push_notifications,
      auto_save_conversations, conversation_retention_days, default_assistant_model,
        sidebar_collapsed, show_timestamps, compact_mode]);
    
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Error updating settings' });
  }
});

// ===== PASSWORD MANAGEMENT =====

// Change password
router.put('/password', logActivity('user_change_password'), async (req, res) => {
  try {
  const userId = req.user.id;
  const { current_password, new_password } = req.body;
  
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new passwords are required' });
  }
  
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }
  
  // Verify current password
    const userResult = await query(`
      SELECT password_hash FROM users WHERE id = $1
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    const isValidPassword = await bcrypt.compare(current_password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password and update
    const hashedPassword = await bcrypt.hash(new_password, 10);
    
    await query(`
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [hashedPassword, userId]);
      
      res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Error updating password' });
  }
});

// Request password reset
router.post('/password/reset-request', logActivity('user_request_password_reset'), async (req, res) => {
  try {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
    const userResult = await query(`
      SELECT id FROM users WHERE email = $1
    `, [email]);
    
    if (userResult.rows.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }
    
    const user = userResult.rows[0];
    
    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
    
    await query(`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
    `, [user.id, token, expiresAt]);
      
      // TODO: Send email with reset link
      // For now, just return success
      res.json({ 
        message: 'If the email exists, a reset link has been sent',
        // In development, return the token
        ...(process.env.NODE_ENV === 'development' && { reset_token: token })
      });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({ error: 'Error creating reset token' });
  }
});

// ===== NOTIFICATIONS =====

// Get user notifications
router.get('/notifications', logActivity('user_view_notifications'), async (req, res) => {
  try {
  const userId = req.user.id;
  const { limit = 50, offset = 0, unread_only = false } = req.query;
  
    let sql = `
    SELECT * FROM notifications 
      WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
  `;
    const params = [userId];
    let paramCount = 1;
  
  if (unread_only === 'true') {
      sql += ` AND read_status = false`;
  }
  
    sql += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);
    res.json({ notifications: result.rows });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Database error' });
    }
});

// Mark notification as read
router.put('/notifications/:id/read', logActivity('user_mark_notification_read'), async (req, res) => {
  try {
  const userId = req.user.id;
    const { id } = req.params;
  
    const result = await query(`
    UPDATE notifications 
      SET read_status = true 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Error updating notification' });
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', logActivity('user_mark_all_notifications_read'), async (req, res) => {
  try {
  const userId = req.user.id;
  
    await query(`
    UPDATE notifications 
      SET read_status = true 
      WHERE user_id = $1 AND read_status = false
    `, [userId]);

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Error updating notifications' });
  }
});

// Delete notification
router.delete('/notifications/:id', logActivity('user_delete_notification'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(`
      DELETE FROM notifications 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Error deleting notification' });
  }
});

// ===== ACCOUNT MANAGEMENT =====

// Get account statistics
router.get('/account/stats', logActivity('user_view_account_stats'), async (req, res) => {
  try {
  const userId = req.user.id;
  
  // Get conversation count
    const convStatsResult = await query(`
      SELECT COUNT(*) as conversation_count FROM conversations WHERE user_id = $1
    `, [userId]);
    
    // Get message count
    const msgStatsResult = await query(`
      SELECT COUNT(cm.id) as message_count 
      FROM conversation_messages cm
      JOIN conversations c ON cm.conversation_id = c.id
      WHERE c.user_id = $1
    `, [userId]);
      
      // Get activity count (last 30 days)
    const activityStatsResult = await query(`
        SELECT COUNT(*) as recent_activity_count
        FROM activity_logs 
      WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    `, [userId]);
    
    // Get user creation date for account age calculation
    const userResult = await query(`
      SELECT created_at FROM users WHERE id = $1
    `, [userId]);
    
    const accountAgeMs = Date.now() - new Date(userResult.rows[0].created_at).getTime();
    const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));
        
        res.json({
          stats: {
        conversations: convStatsResult.rows[0].conversation_count,
        messages: msgStatsResult.rows[0].message_count,
        recent_activities: activityStatsResult.rows[0].recent_activity_count,
        account_age_days: accountAgeDays
      }
    });
  } catch (error) {
    console.error('Error fetching account stats:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Export user data
router.get('/account/export', logActivity('user_export_data'), async (req, res) => {
  try {
  const userId = req.user.id;
  
  const exportData = {};
  
  // Get user profile
    const profileResult = await query(`
    SELECT u.*, p.* FROM users u
    LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.id = $1
    `, [userId]);
    
    exportData.profile = profileResult.rows[0];
    
    // Get conversations with messages
    const conversationsResult = await query(`
      SELECT 
        c.*,
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'role', cm.role,
            'content', cm.content,
            'created_at', cm.created_at
          ) ORDER BY cm.created_at
        ) as messages
      FROM conversations c
      LEFT JOIN conversation_messages cm ON c.id = cm.conversation_id
      WHERE c.user_id = $1
      GROUP BY c.id
    `, [userId]);
      
    exportData.conversations = conversationsResult.rows;
      
      // Get activity logs
    const activitiesResult = await query(`
        SELECT * FROM activity_logs 
      WHERE user_id = $1
        ORDER BY created_at DESC
    `, [userId]);
        
    exportData.activities = activitiesResult.rows;
        exportData.exported_at = new Date().toISOString();
        
        res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="lisa-data-export-${userId}-${Date.now()}.json"`);
        res.json(exportData);
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete account
router.delete('/account', logActivity('user_delete_account'), async (req, res) => {
  const client = await getClient();
  
  try {
  const userId = req.user.id;
  const { password } = req.body;
  
  if (!password) {
      return res.status(400).json({ error: 'Password confirmation required' });
  }
  
  // Verify password
    const userResult = await client.query(`
      SELECT password_hash FROM users WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isValidPassword = await bcrypt.compare(password, userResult.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Password is incorrect' });
    }
    
    await client.query('BEGIN');

    // The CASCADE constraints will handle deleting related records
    await client.query(`
      DELETE FROM users WHERE id = $1
    `, [userId]);
      
    await client.query('COMMIT');
      res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Error deleting account' });
  } finally {
    client.release();
  }
});

module.exports = router; 