const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();
const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get user's conversation history
router.get('/history', logActivity('chat_history_view'), (req, res) => {
  const userId = req.user.id;
  const db = new sqlite3.Database(DB_PATH);
  
  db.all(`
    SELECT 
      thread_id,
      title,
      message_count,
      created_at,
      updated_at
    FROM conversations 
    WHERE user_id = ?
    ORDER BY updated_at DESC
    LIMIT 50
  `, [userId], (err, rows) => {
    db.close();
    
    if (err) {
      console.error('Error fetching conversation history:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({
      conversations: rows
    });
  });
});

// Get specific conversation messages
router.get('/history/:threadId', logActivity('chat_history_load'), (req, res) => {
  const userId = req.user.id;
  const { threadId } = req.params;
  const db = new sqlite3.Database(DB_PATH);
  
  // First verify the conversation belongs to the user
  db.get(`
    SELECT id FROM conversations 
    WHERE thread_id = ? AND user_id = ?
  `, [threadId, userId], (err, conversation) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!conversation) {
      db.close();
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Get messages for this conversation
    db.all(`
      SELECT role, content, train_part_data, assistant_type, created_at
      FROM conversation_messages 
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `, [conversation.id], (err, messages) => {
      db.close();
      
      if (err) {
        console.error('Error fetching conversation messages:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Parse train_part_data if it exists
      const formattedMessages = messages.map(msg => {
        const message = {
          role: msg.role,
          content: msg.content,
          assistantType: msg.assistant_type
        };
        
        if (msg.train_part_data) {
          try {
            message.trainPart = JSON.parse(msg.train_part_data);
          } catch (e) {
            console.error('Error parsing train part data:', e);
          }
        }
        
        return message;
      });
      
      res.json({
        messages: formattedMessages
      });
    });
  });
});

// Save or update conversation
router.post('/history', logActivity('chat_history_save'), (req, res) => {
  const userId = req.user.id;
  const { threadId, title, messages } = req.body;
  
  if (!threadId || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request data' });
  }
  
  const db = new sqlite3.Database(DB_PATH);
  
  // Check if conversation already exists
  db.get(`
    SELECT id FROM conversations 
    WHERE thread_id = ? AND user_id = ?
  `, [threadId, userId], (err, existingConversation) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (existingConversation) {
      // Update existing conversation
      updateConversation(db, existingConversation.id, title, messages, res);
    } else {
      // Create new conversation
      createConversation(db, userId, threadId, title, messages, res);
    }
  });
});

// Delete conversation
router.delete('/history/:threadId', logActivity('chat_history_delete'), (req, res) => {
  const userId = req.user.id;
  const { threadId } = req.params;
  const db = new sqlite3.Database(DB_PATH);
  
  // First verify the conversation belongs to the user
  db.get(`
    SELECT id FROM conversations 
    WHERE thread_id = ? AND user_id = ?
  `, [threadId, userId], (err, conversation) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!conversation) {
      db.close();
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Delete conversation and its messages (cascade should handle messages)
    db.run(`DELETE FROM conversations WHERE id = ?`, [conversation.id], function(err) {
      db.close();
      
      if (err) {
        console.error('Error deleting conversation:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({ message: 'Conversation deleted successfully' });
    });
  });
});

// Helper function to create new conversation
function createConversation(db, userId, threadId, title, messages, res) {
  db.run(`
    INSERT INTO conversations (user_id, thread_id, title, message_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [userId, threadId, title, messages.length], function(err) {
    if (err) {
      db.close();
      console.error('Error creating conversation:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const conversationId = this.lastID;
    saveMessages(db, conversationId, messages, res);
  });
}

// Helper function to update existing conversation
function updateConversation(db, conversationId, title, messages, res) {
  // Delete existing messages
  db.run(`DELETE FROM conversation_messages WHERE conversation_id = ?`, [conversationId], (err) => {
    if (err) {
      db.close();
      console.error('Error deleting old messages:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Update conversation metadata
    db.run(`
      UPDATE conversations 
      SET title = ?, message_count = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, messages.length, conversationId], (err) => {
      if (err) {
        db.close();
        console.error('Error updating conversation:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      saveMessages(db, conversationId, messages, res);
    });
  });
}

// Helper function to save messages
function saveMessages(db, conversationId, messages, res) {
  if (messages.length === 0) {
    db.close();
    return res.json({ message: 'Conversation saved successfully' });
  }
  
  const stmt = db.prepare(`
    INSERT INTO conversation_messages 
    (conversation_id, role, content, train_part_data, assistant_type, created_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  let completed = 0;
  let hasError = false;
  
  messages.forEach((message, index) => {
    const trainPartData = message.trainPart ? JSON.stringify(message.trainPart) : null;
    
    stmt.run([
      conversationId,
      message.role,
      message.content,
      trainPartData,
      message.assistantType || null
    ], (err) => {
      completed++;
      
      if (err && !hasError) {
        hasError = true;
        stmt.finalize();
        db.close();
        console.error('Error saving message:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (completed === messages.length && !hasError) {
        stmt.finalize();
        db.close();
        res.json({ message: 'Conversation saved successfully' });
      }
    });
  });
}

// Search chat history
router.get('/search', authenticateToken, logActivity('search_chat_history'), (req, res) => {
  const userId = req.user.id;
  const { q: query, dateRange, messageType, sortBy, limit = 50 } = req.query;

  if (!query || query.trim().length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }

  const db = new sqlite3.Database(DB_PATH);

  let sql = `
    SELECT DISTINCT c.thread_id, c.title, c.updated_at, c.message_count,
           cm.content, cm.role, cm.created_at as message_created_at
    FROM conversations c
    JOIN conversation_messages cm ON c.thread_id = cm.thread_id
    WHERE c.user_id = ? AND (
      c.title LIKE ? OR 
      cm.content LIKE ?
    )
  `;
  
  const params = [userId, `%${query}%`, `%${query}%`];

  // Add date range filter
  if (dateRange && dateRange !== 'all') {
    switch (dateRange) {
      case 'today':
        sql += ` AND c.updated_at >= date('now')`;
        break;
      case 'week':
        sql += ` AND c.updated_at >= date('now', '-7 days')`;
        break;
      case 'month':
        sql += ` AND c.updated_at >= date('now', '-1 month')`;
        break;
      case 'quarter':
        sql += ` AND c.updated_at >= date('now', '-3 months')`;
        break;
      case 'year':
        sql += ` AND c.updated_at >= date('now', '-1 year')`;
        break;
    }
  }

  // Add message type filter
  if (messageType && messageType !== 'all') {
    switch (messageType) {
      case 'user':
        sql += ` AND cm.role = 'user'`;
        break;
      case 'assistant':
        sql += ` AND cm.role = 'assistant'`;
        break;
      case 'images':
        sql += ` AND cm.train_part_data IS NOT NULL`;
        break;
      case 'schematics':
        sql += ` AND (cm.content LIKE '%schematic%' OR cm.content LIKE '%diagram%')`;
        break;
    }
  }

  // Add sorting
  switch (sortBy) {
    case 'oldest':
      sql += ` ORDER BY c.updated_at ASC`;
      break;
    case 'relevance':
      sql += ` ORDER BY (CASE WHEN c.title LIKE ? THEN 1 ELSE 2 END), c.updated_at DESC`;
      params.push(`%${query}%`);
      break;
    case 'length':
      sql += ` ORDER BY LENGTH(cm.content) DESC, c.updated_at DESC`;
      break;
    default:
      sql += ` ORDER BY c.updated_at DESC`;
  }

  sql += ` LIMIT ?`;
  params.push(parseInt(limit));

  db.all(sql, params, (err, rows) => {
    db.close();

    if (err) {
      console.error('Search error:', err);
      return res.status(500).json({ error: 'Search failed' });
    }

    // Group results by conversation
    const conversations = {};
    rows.forEach(row => {
      if (!conversations[row.thread_id]) {
        conversations[row.thread_id] = {
          thread_id: row.thread_id,
          title: row.title,
          updated_at: row.updated_at,
          message_count: row.message_count,
          matching_messages: []
        };
      }
      
      conversations[row.thread_id].matching_messages.push({
        content: row.content,
        role: row.role,
        created_at: row.message_created_at
      });
    });

    res.json({
      results: Object.values(conversations),
      total: Object.keys(conversations).length,
      query: query
    });
  });
});

// Get search suggestions
router.get('/search/suggestions', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { q: query } = req.query;

  if (!query || query.trim().length < 2) {
    return res.json({ suggestions: [] });
  }

  const db = new sqlite3.Database(DB_PATH);

  // Get common phrases and topics from user's chat history
  const sql = `
    SELECT DISTINCT 
      CASE 
        WHEN cm.content LIKE '%show me%' THEN SUBSTR(cm.content, 1, 50)
        WHEN cm.content LIKE '%what is%' THEN SUBSTR(cm.content, 1, 50)
        WHEN cm.content LIKE '%how to%' THEN SUBSTR(cm.content, 1, 50)
        WHEN cm.content LIKE '%schematic%' THEN 'schematic page'
        WHEN cm.content LIKE '%diagram%' THEN 'electrical diagram'
        ELSE SUBSTR(cm.content, 1, 30)
      END as suggestion
    FROM conversations c
    JOIN conversation_messages cm ON c.thread_id = cm.thread_id
    WHERE c.user_id = ? 
      AND cm.role = 'user'
      AND cm.content LIKE ?
      AND LENGTH(cm.content) > 10
    ORDER BY c.updated_at DESC
    LIMIT 10
  `;

  db.all(sql, [userId, `%${query}%`], (err, rows) => {
    db.close();

    if (err) {
      console.error('Suggestions error:', err);
      return res.json({ suggestions: [] });
    }

    const suggestions = rows
      .map(row => row.suggestion.trim())
      .filter(s => s.length > 5)
      .slice(0, 5);

    // Add some common train maintenance suggestions if no user history
    if (suggestions.length < 3) {
      const commonSuggestions = [
        'show me the alerter',
        'schematic page 15',
        'how to troubleshoot',
        'distributed power system',
        'relay panel location',
        'IETMS schematic',
        'circuit breaker panel'
      ].filter(s => s.toLowerCase().includes(query.toLowerCase()));
      
      suggestions.push(...commonSuggestions.slice(0, 5 - suggestions.length));
    }

    res.json({ suggestions: [...new Set(suggestions)] });
  });
});

module.exports = router; 