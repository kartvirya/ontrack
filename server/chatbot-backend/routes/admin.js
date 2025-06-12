const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const { authenticateToken, requireAdmin, logActivity } = require('../middleware/auth');
const OpenAIAgentManager = require('../services/openai-agent-manager');

const router = express.Router();
const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.pdf', '.doc', '.docx', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// ===== STATISTICS =====

// Get admin dashboard statistics
router.get('/statistics', logActivity('admin_view_statistics'), (req, res) => {
  const db = new sqlite3.Database(DB_PATH);
  
  // Get user statistics
  db.get(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
      COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_users,
      COUNT(CASE WHEN openai_assistant_id IS NOT NULL THEN 1 END) as users_with_assistants
    FROM users
  `, [], (err, userStats) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Get conversation statistics
    db.get(`
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(DISTINCT user_id) as users_with_conversations,
        AVG(message_count) as avg_messages_per_conversation
      FROM conversations
    `, [], (err, conversationStats) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Get message statistics
      db.get(`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(CASE WHEN role = 'user' THEN 1 END) as user_messages,
          COUNT(CASE WHEN role = 'assistant' THEN 1 END) as assistant_messages
        FROM conversation_messages
      `, [], (err, messageStats) => {
        if (err) {
          db.close();
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Get recent activity
        db.all(`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as conversations_created
          FROM conversations
          WHERE created_at >= date('now', '-30 days')
          GROUP BY DATE(created_at)
          ORDER BY date DESC
          LIMIT 30
        `, [], (err, recentActivity) => {
          db.close();
          
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          res.json({
            users: userStats,
            conversations: conversationStats,
            messages: messageStats,
            recentActivity: recentActivity
          });
        });
      });
    });
  });
});

// ===== USER MANAGEMENT =====

// Get all users
router.get('/users', logActivity('admin_view_users'), (req, res) => {
  const db = new sqlite3.Database(DB_PATH);
  
  db.all(`
    SELECT 
      id, username, email, role, status, 
      openai_assistant_id, vector_store_id,
      created_at, updated_at, last_login
    FROM users 
    ORDER BY created_at DESC
  `, [], (err, rows) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({
      users: rows.map(user => ({
        ...user,
        hasAgent: !!(user.openai_assistant_id && user.vector_store_id)
      }))
    });
  });
});

// Get user details
router.get('/users/:userId', logActivity('admin_view_user_details'), (req, res) => {
  const { userId } = req.params;
  const db = new sqlite3.Database(DB_PATH);
  
  db.get(`
    SELECT 
      u.id, u.username, u.email, u.role, u.status,
      u.openai_assistant_id, u.vector_store_id,
      u.created_at, u.updated_at, u.last_login,
      oa.assistant_name, oa.model as assistant_model,
      vs.store_name, vs.file_count
    FROM users u
    LEFT JOIN openai_assistants oa ON u.id = oa.user_id
    LEFT JOIN vector_stores vs ON u.id = vs.user_id
    WHERE u.id = ?
  `, [userId], (err, user) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!user) {
      db.close();
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user activity logs
    db.all(`
      SELECT action, details, ip_address, created_at
      FROM activity_logs 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `, [userId], (err, activities) => {
      db.close();
      
      if (err) {
        return res.status(500).json({ error: 'Error fetching activities' });
      }
      
      res.json({
        user: {
          ...user,
          hasAgent: !!(user.openai_assistant_id && user.vector_store_id)
        },
        activities: activities
      });
    });
  });
});

// Update user status (suspend/activate)
router.patch('/users/:userId/status', logActivity('admin_update_user_status'), (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;
  
  if (!['active', 'suspended', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  const db = new sqlite3.Database(DB_PATH);
  
  db.run(`
    UPDATE users 
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [status, userId], function(err) {
    db.close();
    
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: `User status updated to ${status}` });
  });
});

// Assign assistant to user
router.post('/users/:userId/assign-assistant', logActivity('admin_assign_assistant'), (req, res) => {
  const { userId } = req.params;
  const { assistantId } = req.body;
  
  const db = new sqlite3.Database(DB_PATH);
  
  // First verify the assistant exists
  db.get(`SELECT id FROM openai_assistants WHERE assistant_id = ?`, [assistantId], (err, assistant) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!assistant) {
      db.close();
      return res.status(404).json({ error: 'Assistant not found' });
    }
    
    // Update user with assistant ID
    db.run(`
      UPDATE users 
      SET openai_assistant_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [assistantId, userId], function(err) {
      db.close();
      
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ message: 'Assistant assigned successfully' });
    });
  });
});

// Delete user and their agent
router.delete('/users/:userId', logActivity('admin_delete_user'), async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Delete OpenAI agent first
    const agentManager = new OpenAIAgentManager();
    await agentManager.deleteUserAgent(userId);
    agentManager.close();
    
    // Delete user from database
    const db = new sqlite3.Database(DB_PATH);
    
    db.run(`DELETE FROM users WHERE id = ?`, [userId], function(err) {
      db.close();
      
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ message: 'User and associated agent deleted successfully' });
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Error deleting user and agent' });
  }
});

// ===== ASSISTANT MANAGEMENT =====

// Get all assistants
router.get('/assistants', logActivity('admin_view_assistants'), (req, res) => {
  const db = new sqlite3.Database(DB_PATH);
  
  db.all(`
    SELECT 
      oa.id, oa.assistant_id, oa.assistant_name, oa.instructions, 
      oa.model, oa.vector_store_id, oa.created_at, oa.updated_at,
      vs.store_name
    FROM openai_assistants oa
    LEFT JOIN vector_stores vs ON oa.vector_store_id = vs.store_id
    ORDER BY oa.created_at DESC
  `, [], (err, rows) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ assistants: rows });
  });
});

// Create new assistant
router.post('/assistants', logActivity('admin_create_assistant'), async (req, res) => {
  const { name, instructions, model, vectorStoreId } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Assistant name is required' });
  }
  
  try {
    const agentManager = new OpenAIAgentManager();
    
    // Create assistant in OpenAI
    const assistant = await agentManager.createAssistant({
      name,
      instructions,
      model: model || 'gpt-4-1106-preview',
      vectorStoreId
    });
    
    // Save to database
    const db = new sqlite3.Database(DB_PATH);
    
    db.run(`
      INSERT INTO openai_assistants 
      (assistant_id, assistant_name, instructions, model, vector_store_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [assistant.id, name, instructions, model, vectorStoreId || null], function(err) {
      db.close();
      agentManager.close();
      
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.status(201).json({
        message: 'Assistant created successfully',
        assistant: {
          id: this.lastID,
          assistant_id: assistant.id,
          assistant_name: name,
          instructions,
          model,
          vector_store_id: vectorStoreId
        }
      });
    });
  } catch (error) {
    console.error('Error creating assistant:', error);
    res.status(500).json({ error: 'Failed to create assistant' });
  }
});

// Update assistant
router.patch('/assistants/:assistantId', logActivity('admin_update_assistant'), async (req, res) => {
  const { assistantId } = req.params;
  const { name, instructions, model, vectorStoreId } = req.body;
  
  try {
    const agentManager = new OpenAIAgentManager();
    
    // Update assistant in OpenAI
    await agentManager.updateAssistant(assistantId, {
      name,
      instructions,
      model,
      vectorStoreId
    });
    
    // Update in database
    const db = new sqlite3.Database(DB_PATH);
    
    db.run(`
      UPDATE openai_assistants 
      SET assistant_name = ?, instructions = ?, model = ?, vector_store_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE assistant_id = ?
    `, [name, instructions, model, vectorStoreId || null, assistantId], function(err) {
      db.close();
      agentManager.close();
      
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Assistant not found' });
      }
      
      res.json({ message: 'Assistant updated successfully' });
    });
  } catch (error) {
    console.error('Error updating assistant:', error);
    res.status(500).json({ error: 'Failed to update assistant' });
  }
});

// Delete assistant
router.delete('/assistants/:assistantId', logActivity('admin_delete_assistant'), async (req, res) => {
  const { assistantId } = req.params;
  
  try {
    const agentManager = new OpenAIAgentManager();
    
    // Delete assistant from OpenAI
    await agentManager.deleteAssistant(assistantId);
    
    // Delete from database
    const db = new sqlite3.Database(DB_PATH);
    
    db.run(`DELETE FROM openai_assistants WHERE assistant_id = ?`, [assistantId], function(err) {
      db.close();
      agentManager.close();
      
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Assistant not found' });
      }
      
      res.json({ message: 'Assistant deleted successfully' });
    });
  } catch (error) {
    console.error('Error deleting assistant:', error);
    res.status(500).json({ error: 'Failed to delete assistant' });
  }
});

// ===== VECTOR STORE MANAGEMENT =====

// Get all vector stores
router.get('/vector-stores', logActivity('admin_view_vector_stores'), (req, res) => {
  const db = new sqlite3.Database(DB_PATH);
  
  db.all(`
    SELECT 
      id, store_id, store_name, description, file_count, created_at, updated_at
    FROM vector_stores 
    ORDER BY created_at DESC
  `, [], (err, rows) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ vectorStores: rows });
  });
});

// Create new vector store
router.post('/vector-stores', upload.array('files'), logActivity('admin_create_vector_store'), async (req, res) => {
  const { name, description } = req.body;
  const files = req.files;
  
  if (!name) {
    return res.status(400).json({ error: 'Vector store name is required' });
  }
  
  try {
    const agentManager = new OpenAIAgentManager();
    
    // Create vector store in OpenAI
    const vectorStore = await agentManager.createVectorStore({
      name,
      description,
      files
    });
    
    // Save to database
    const db = new sqlite3.Database(DB_PATH);
    
    db.run(`
      INSERT INTO vector_stores 
      (store_id, store_name, description, file_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [vectorStore.id, name, description, files ? files.length : 0], function(err) {
      db.close();
      agentManager.close();
      
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.status(201).json({
        message: 'Vector store created successfully',
        vectorStore: {
          id: this.lastID,
          store_id: vectorStore.id,
          store_name: name,
          description,
          file_count: files ? files.length : 0
        }
      });
    });
  } catch (error) {
    console.error('Error creating vector store:', error);
    res.status(500).json({ error: 'Failed to create vector store' });
  }
});

// ===== ACTIVITY MONITORING =====

// Get recent activities
router.get('/activities', logActivity('admin_view_activities'), (req, res) => {
  const db = new sqlite3.Database(DB_PATH);
  
  db.all(`
    SELECT 
      al.action, al.details, al.ip_address, al.created_at,
      u.username
    FROM activity_logs al
    LEFT JOIN users u ON al.user_id = u.id
    ORDER BY al.created_at DESC
    LIMIT 100
  `, [], (err, rows) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ activities: rows });
  });
});

// ===== SYSTEM STATISTICS =====

// Get system statistics
router.get('/stats', logActivity('admin_view_stats'), (req, res) => {
  const db = new sqlite3.Database(DB_PATH);
  
  const stats = {};
  
  // Get user counts
  db.get(`
    SELECT 
      COUNT(*) as total_users,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_users,
      SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended_users,
      SUM(CASE WHEN openai_assistant_id IS NOT NULL THEN 1 ELSE 0 END) as users_with_agents
    FROM users
  `, [], (err, userStats) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }
    
    stats.users = userStats;
    
    // Get activity counts for last 30 days
    db.get(`
      SELECT 
        COUNT(*) as total_activities,
        COUNT(DISTINCT user_id) as active_users_30d
      FROM activity_logs 
      WHERE created_at >= datetime('now', '-30 days')
    `, [], (err, activityStats) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }
      
      stats.activity = activityStats;
      
      // Get assistant and vector store counts
      db.get(`
        SELECT 
          (SELECT COUNT(*) FROM openai_assistants) as total_assistants,
          (SELECT COUNT(*) FROM vector_stores) as total_vector_stores
      `, [], (err, systemStats) => {
        if (err) {
          db.close();
          return res.status(500).json({ error: 'Database error' });
        }
        
        stats.system = systemStats;
        
        // Get recent registrations
        db.all(`
          SELECT DATE(created_at) as date, COUNT(*) as registrations
          FROM users 
          WHERE created_at >= datetime('now', '-7 days')
          GROUP BY DATE(created_at)
          ORDER BY date DESC
        `, [], (err, registrationStats) => {
          db.close();
          
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          stats.registrations = registrationStats;
          
          res.json(stats);
        });
      });
    });
  });
});

// ===== BULK OPERATIONS =====

// Bulk update assistant instructions (for updating all assistants when backend changes)
router.post('/assistants/bulk-update-instructions', logActivity('admin_bulk_update_instructions'), async (req, res) => {
  const { instructions } = req.body;
  
  if (!instructions) {
    return res.status(400).json({ error: 'Instructions are required' });
  }
  
  try {
    const agentManager = new OpenAIAgentManager();
    const db = new sqlite3.Database(DB_PATH);
    
    // Get all assistants
    db.all(`SELECT assistant_id FROM openai_assistants`, [], async (err, assistants) => {
      if (err) {
        db.close();
        agentManager.close();
        return res.status(500).json({ error: 'Database error' });
      }
      
      let updated = 0;
      let errors = 0;
      
      // Update each assistant
      for (const assistant of assistants) {
        try {
          await agentManager.updateAssistant(assistant.assistant_id, { instructions });
          updated++;
        } catch (error) {
          console.error(`Error updating assistant ${assistant.assistant_id}:`, error);
          errors++;
        }
      }
      
      // Update database
      db.run(`
        UPDATE openai_assistants 
        SET instructions = ?, updated_at = CURRENT_TIMESTAMP
      `, [instructions], function(err) {
        db.close();
        agentManager.close();
        
        if (err) {
          return res.status(500).json({ error: 'Database update error' });
        }
        
        res.json({
          message: 'Bulk update completed',
          updated,
          errors,
          total: assistants.length
        });
      });
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({ error: 'Failed to perform bulk update' });
  }
});

// ===== SYSTEM SETTINGS =====

// Get all system settings
router.get('/settings', logActivity('admin_view_system_settings'), (req, res) => {
  const db = new sqlite3.Database(DB_PATH);
  
  db.all(`
    SELECT * FROM system_settings 
    ORDER BY category, setting_key
  `, [], (err, settings) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Group settings by category
    const groupedSettings = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {});
    
    res.json({ settings: groupedSettings });
  });
});

// Update system setting
router.put('/settings/:settingKey', logActivity('admin_update_system_setting'), (req, res) => {
  const { settingKey } = req.params;
  const { setting_value, description } = req.body;
  
  const db = new sqlite3.Database(DB_PATH);
  
  db.run(`
    UPDATE system_settings 
    SET setting_value = ?, description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE setting_key = ?
  `, [setting_value, description, settingKey], function(err) {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      // Create new setting if it doesn't exist
      db.run(`
        INSERT INTO system_settings (setting_key, setting_value, description)
        VALUES (?, ?, ?)
      `, [settingKey, setting_value, description], function(err) {
        db.close();
        
        if (err) {
          return res.status(500).json({ error: 'Error creating setting' });
        }
        
        res.json({ message: 'System setting created successfully' });
      });
    } else {
      db.close();
      res.json({ message: 'System setting updated successfully' });
    }
  });
});

// Create system setting
router.post('/settings', logActivity('admin_create_system_setting'), (req, res) => {
  const { setting_key, setting_value, setting_type, description, category, is_public } = req.body;
  
  if (!setting_key || setting_value === undefined) {
    return res.status(400).json({ error: 'Setting key and value are required' });
  }
  
  const db = new sqlite3.Database(DB_PATH);
  
  db.run(`
    INSERT INTO system_settings 
    (setting_key, setting_value, setting_type, description, category, is_public)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [setting_key, setting_value, setting_type || 'string', description, category || 'general', is_public || false], function(err) {
    db.close();
    
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: 'Setting key already exists' });
      }
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.status(201).json({ 
      message: 'System setting created successfully',
      setting_id: this.lastID
    });
  });
});

// Delete system setting
router.delete('/settings/:settingKey', logActivity('admin_delete_system_setting'), (req, res) => {
  const { settingKey } = req.params;
  
  const db = new sqlite3.Database(DB_PATH);
  
  db.run(`DELETE FROM system_settings WHERE setting_key = ?`, [settingKey], function(err) {
    db.close();
    
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    res.json({ message: 'System setting deleted successfully' });
  });
});

// ===== NOTIFICATION MANAGEMENT =====

// Get all notifications
router.get('/notifications', logActivity('admin_view_all_notifications'), (req, res) => {
  const { limit = 100, offset = 0, type, user_id } = req.query;
  
  const db = new sqlite3.Database(DB_PATH);
  
  let query = `
    SELECT n.*, u.username 
    FROM notifications n
    LEFT JOIN users u ON n.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (type) {
    query += ` AND n.type = ?`;
    params.push(type);
  }
  
  if (user_id) {
    query += ` AND n.user_id = ?`;
    params.push(user_id);
  }
  
  query += ` ORDER BY n.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));
  
  db.all(query, params, (err, notifications) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({ notifications });
  });
});

// Create notification for user(s)
router.post('/notifications', logActivity('admin_create_notification'), (req, res) => {
  const { user_ids, title, message, type, action_url, expires_at } = req.body;
  
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }
  
  if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
    return res.status(400).json({ error: 'At least one user ID is required' });
  }
  
  const db = new sqlite3.Database(DB_PATH);
  
  // Insert notification for each user
  const insertPromises = user_ids.map(userId => {
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO notifications (user_id, title, message, type, action_url, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [userId, title, message, type || 'info', action_url, expires_at], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  });
  
  Promise.all(insertPromises)
    .then(notificationIds => {
      db.close();
      res.status(201).json({
        message: 'Notifications created successfully',
        notification_ids: notificationIds,
        count: notificationIds.length
      });
    })
    .catch(err => {
      db.close();
      console.error('Error creating notifications:', err);
      res.status(500).json({ error: 'Error creating notifications' });
    });
});

// Broadcast notification to all users
router.post('/notifications/broadcast', logActivity('admin_broadcast_notification'), (req, res) => {
  const { title, message, type, action_url, expires_at, exclude_admins } = req.body;
  
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }
  
  const db = new sqlite3.Database(DB_PATH);
  
  // Get all user IDs
  let userQuery = `SELECT id FROM users WHERE status = 'active'`;
  if (exclude_admins) {
    userQuery += ` AND role != 'admin'`;
  }
  
  db.all(userQuery, [], (err, users) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (users.length === 0) {
      db.close();
      return res.json({ message: 'No users to notify', count: 0 });
    }
    
    // Insert notification for each user
    const insertPromises = users.map(user => {
      return new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO notifications (user_id, title, message, type, action_url, expires_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [user.id, title, message, type || 'info', action_url, expires_at], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      });
    });
    
    Promise.all(insertPromises)
      .then(notificationIds => {
        db.close();
        res.status(201).json({
          message: 'Broadcast notification sent successfully',
          count: notificationIds.length
        });
      })
      .catch(err => {
        db.close();
        console.error('Error broadcasting notification:', err);
        res.status(500).json({ error: 'Error broadcasting notification' });
      });
  });
});

// Delete notification
router.delete('/notifications/:notificationId', logActivity('admin_delete_notification'), (req, res) => {
  const { notificationId } = req.params;
  
  const db = new sqlite3.Database(DB_PATH);
  
  db.run(`DELETE FROM notifications WHERE id = ?`, [notificationId], function(err) {
    db.close();
    
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted successfully' });
  });
});

// ===== ADMIN PROFILE =====

// Get admin profile
router.get('/profile', logActivity('admin_view_profile'), (req, res) => {
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
  `, [userId], (err, profile) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!profile) {
      return res.status(404).json({ error: 'Admin profile not found' });
    }
    
    res.json({ profile });
  });
});

// Update admin profile
router.put('/profile', logActivity('admin_update_profile'), (req, res) => {
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
          return res.status(500).json({ error: 'Error updating admin profile' });
        }
        
        res.json({ message: 'Admin profile updated successfully' });
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
          return res.status(500).json({ error: 'Error creating admin profile' });
        }
        
        res.json({ message: 'Admin profile created successfully' });
      });
    }
  });
});

// ===== SYSTEM MAINTENANCE =====

// Get system health
router.get('/system/health', logActivity('admin_view_system_health'), (req, res) => {
  const db = new sqlite3.Database(DB_PATH);
  
  const healthData = {};
  
  // Check database connectivity
  db.get(`SELECT COUNT(*) as user_count FROM users`, [], (err, userCount) => {
    if (err) {
      healthData.database = { status: 'error', error: err.message };
    } else {
      healthData.database = { status: 'healthy', user_count: userCount.user_count };
    }
    
    // Check OpenAI connectivity (basic check)
    healthData.openai = { status: 'unknown', message: 'Manual check required' };
    
    // System uptime
    healthData.system = {
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      node_version: process.version,
      platform: process.platform
    };
    
    // Get recent error logs
    db.all(`
      SELECT * FROM activity_logs 
      WHERE action LIKE '%error%' 
      ORDER BY created_at DESC 
      LIMIT 10
    `, [], (err, errorLogs) => {
      db.close();
      
      if (!err) {
        healthData.recent_errors = errorLogs;
      }
      
      res.json({ health: healthData });
    });
  });
});

// Cleanup old data
router.post('/system/cleanup', logActivity('admin_system_cleanup'), (req, res) => {
  const { days_old = 90 } = req.body;
  
  const db = new sqlite3.Database(DB_PATH);
  
  const cutoffDate = new Date(Date.now() - (days_old * 24 * 60 * 60 * 1000)).toISOString();
  
  let cleanupResults = {};
  
  // Clean old activity logs
  db.run(`DELETE FROM activity_logs WHERE created_at < ?`, [cutoffDate], function(err) {
    if (err) {
      cleanupResults.activity_logs = { status: 'error', error: err.message };
    } else {
      cleanupResults.activity_logs = { status: 'success', deleted: this.changes };
    }
    
    // Clean expired password reset tokens
    db.run(`DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP`, [], function(err) {
      if (err) {
        cleanupResults.reset_tokens = { status: 'error', error: err.message };
      } else {
        cleanupResults.reset_tokens = { status: 'success', deleted: this.changes };
      }
      
      // Clean expired notifications
      db.run(`DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP`, [], function(err) {
        db.close();
        
        if (err) {
          cleanupResults.notifications = { status: 'error', error: err.message };
        } else {
          cleanupResults.notifications = { status: 'success', deleted: this.changes };
        }
        
        res.json({
          message: 'System cleanup completed',
          results: cleanupResults
        });
      });
    });
  });
});

module.exports = router; 