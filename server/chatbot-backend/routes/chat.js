const express = require('express');
const { query, getClient } = require('../config/database');
const { authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get conversation history
router.get('/history', logActivity('chat_history_view'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const result = await query(`
      SELECT 
        c.thread_id, 
        c.title, 
        c.message_count, 
        c.created_at, 
        c.updated_at,
        COALESCE(
          (
            SELECT cm.content 
            FROM conversation_messages cm 
            WHERE cm.conversation_id = c.id 
            ORDER BY cm.created_at DESC 
            LIMIT 1
          ),
          'No messages'
        ) as last_message,
        COALESCE(
          (
            SELECT cm.created_at 
            FROM conversation_messages cm 
            WHERE cm.conversation_id = c.id 
            ORDER BY cm.created_at DESC 
            LIMIT 1
          ),
          c.created_at
        ) as last_message_time
      FROM conversations c
      WHERE c.user_id = $1
      ORDER BY c.updated_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), parseInt(offset)]);

    res.json({ 
      conversations: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get specific conversation with messages
router.get('/history/:threadId', logActivity('chat_conversation_view'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { threadId } = req.params;

    // Get conversation details
    const conversationResult = await query(`
      SELECT id, thread_id, title, message_count, created_at, updated_at
      FROM conversations 
      WHERE thread_id = $1 AND user_id = $2
    `, [threadId, userId]);

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversation = conversationResult.rows[0];

    // Get conversation messages
    const messagesResult = await query(`
      SELECT role, content, train_part_data, assistant_type, created_at
      FROM conversation_messages 
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `, [conversation.id]);

    res.json({
      conversation: {
        ...conversation,
        messages: messagesResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete conversation
router.delete('/history/:threadId', logActivity('chat_conversation_delete'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { threadId } = req.params;

    // Get conversation ID first
    const conversationResult = await query(`
      SELECT id FROM conversations 
      WHERE thread_id = $1 AND user_id = $2
    `, [threadId, userId]);

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversationId = conversationResult.rows[0].id;

    // Delete messages first (due to foreign key constraint)
    await query(`
      DELETE FROM conversation_messages 
      WHERE conversation_id = $1
    `, [conversationId]);

    // Delete conversation
    await query(`
      DELETE FROM conversations 
      WHERE id = $1
    `, [conversationId]);

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Error deleting conversation' });
  }
});

// Save or update conversation
router.post('/history', logActivity('chat_history_save'), async (req, res) => {
  const client = await getClient();
  
  try {
    const userId = req.user.id;
    const { threadId, title, messages } = req.body;
    
    console.log('💾 Saving conversation:', { 
      userId, 
      threadId, 
      title: title?.substring(0, 50), 
      messageCount: messages?.length 
    });
    
    if (!threadId || !messages || !Array.isArray(messages)) {
      console.log('❌ Invalid request data:', { threadId: !!threadId, messages: Array.isArray(messages) });
      return res.status(400).json({ error: 'Invalid request data' });
    }

    await client.query('BEGIN');

    // Check if conversation already exists
    const existingResult = await client.query(`
      SELECT id FROM conversations 
      WHERE thread_id = $1 AND user_id = $2
    `, [threadId, userId]);

    let conversationId;

    if (existingResult.rows.length > 0) {
      // Update existing conversation
      conversationId = existingResult.rows[0].id;
      
      await client.query(`
        UPDATE conversations 
        SET title = $1, message_count = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [title, messages.length, conversationId]);

      // Delete existing messages
      await client.query(`
        DELETE FROM conversation_messages 
        WHERE conversation_id = $1
      `, [conversationId]);
    } else {
      // Create new conversation
      const newConversationResult = await client.query(`
        INSERT INTO conversations (user_id, thread_id, title, message_count, created_at, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `, [userId, threadId, title, messages.length]);
      
      conversationId = newConversationResult.rows[0].id;
    }

    // Insert messages
    console.log(`📝 Inserting ${messages.length} messages for conversation ${conversationId}`);
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      try {
        // Handle both trainPart (frontend format) and train_part_data (database format)
        let trainPartData = null;
        if (message.trainPart) {
          trainPartData = JSON.stringify(message.trainPart);
        } else if (message.train_part_data) {
          trainPartData = typeof message.train_part_data === 'string' 
            ? message.train_part_data 
            : JSON.stringify(message.train_part_data);
        }
        
        console.log(`📄 Inserting message ${i + 1}:`, {
          role: message.role,
          contentLength: message.content?.length,
          hasTrainPart: !!trainPartData,
          assistantType: message.assistant_type || message.assistantType || null
        });
        
        // Try with train_part_data first, fallback without it if column doesn't exist
        try {
          await client.query(`
            INSERT INTO conversation_messages 
            (conversation_id, role, content, train_part_data, assistant_type, created_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
          `, [
            conversationId,
            message.role,
            message.content,
            trainPartData,
            message.assistant_type || message.assistantType || null
          ]);
        } catch (insertError) {
          // If column doesn't exist, try without train_part_data and assistant_type
          if (insertError.code === '42703') { // undefined column
            console.log('⚠️ Column missing, trying minimal insert for message:', i + 1);
            await client.query(`
              INSERT INTO conversation_messages 
              (conversation_id, role, content, created_at)
              VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            `, [
              conversationId,
              message.role,
              message.content
            ]);
          } else {
            throw insertError;
          }
        }
        
      } catch (messageError) {
        console.error(`❌ Failed to insert message ${i + 1}:`, messageError);
        throw messageError;
      }
    }

    await client.query('COMMIT');
    console.log('✅ Conversation saved successfully:', { conversationId, messageCount: messages.length });
    res.json({ message: 'Conversation saved successfully' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error saving conversation:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      constraint: error.constraint,
      column: error.column,
      table: error.table
    });
    res.status(500).json({ error: 'Error saving conversation' });
  } finally {
    client.release();
  }
});

// Get conversation statistics
router.get('/stats', logActivity('chat_stats_view'), async (req, res) => {
  try {
    const userId = req.user.id;

    const statsResult = await query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_conversations,
        COALESCE(SUM(c.message_count), 0) as total_messages,
        COALESCE(AVG(c.message_count), 0) as avg_messages_per_conversation,
        MIN(c.created_at) as first_conversation_date,
        MAX(c.updated_at) as last_activity_date
      FROM conversations c
      WHERE c.user_id = $1
    `, [userId]);

    const recentActivityResult = await query(`
      SELECT 
        DATE(c.created_at) as date,
        COUNT(*) as conversations_created
      FROM conversations c
      WHERE c.user_id = $1 
        AND c.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(c.created_at)
      ORDER BY date DESC
    `, [userId]);

    res.json({
      stats: statsResult.rows[0],
      recentActivity: recentActivityResult.rows
    });
  } catch (error) {
    console.error('Error fetching chat stats:', error);
    res.status(500).json({ error: 'Error fetching statistics' });
  }
});

// Search chat history
router.get('/search', logActivity('search_chat_history'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { q: query_text, dateRange, messageType, sortBy, limit = 50 } = req.query;

    if (!query_text || query_text.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    let sql = `
      SELECT DISTINCT c.thread_id, c.title, c.updated_at, c.message_count,
             cm.content, cm.role, cm.created_at as message_created_at
      FROM conversations c
      JOIN conversation_messages cm ON c.id = cm.conversation_id
      WHERE c.user_id = $1 AND (
        c.title ILIKE $2 OR 
        cm.content ILIKE $2
      )
    `;
    
    const params = [userId, `%${query_text}%`];
    let paramCount = 2;

    // Add date range filter
    if (dateRange && dateRange !== 'all') {
      paramCount++;
      switch (dateRange) {
        case 'today':
          sql += ` AND c.updated_at >= CURRENT_DATE`;
          break;
        case 'week':
          sql += ` AND c.updated_at >= CURRENT_DATE - INTERVAL '7 days'`;
          break;
        case 'month':
          sql += ` AND c.updated_at >= CURRENT_DATE - INTERVAL '1 month'`;
          break;
        case 'quarter':
          sql += ` AND c.updated_at >= CURRENT_DATE - INTERVAL '3 months'`;
          break;
        case 'year':
          sql += ` AND c.updated_at >= CURRENT_DATE - INTERVAL '1 year'`;
          break;
      }
    }

    // Add message type filter
    if (messageType && messageType !== 'all') {
      paramCount++;
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
          sql += ` AND (cm.content ILIKE '%schematic%' OR cm.content ILIKE '%diagram%')`;
          break;
      }
    }

    // Add sorting
    switch (sortBy) {
      case 'oldest':
        sql += ` ORDER BY c.updated_at ASC`;
        break;
      case 'relevance':
        // PostgreSQL has basic text search ranking
        sql += ` ORDER BY LENGTH(cm.content) ASC, c.updated_at DESC`;
        break;
      case 'newest':
      default:
        sql += ` ORDER BY c.updated_at DESC`;
        break;
    }

    sql += ` LIMIT $${paramCount + 1}`;
    params.push(parseInt(limit));

    const result = await query(sql, params);

    // Group results by conversation
    const conversationMap = new Map();
    
    result.rows.forEach(row => {
      if (!conversationMap.has(row.thread_id)) {
        conversationMap.set(row.thread_id, {
          threadId: row.thread_id,
          title: row.title,
          updatedAt: row.updated_at,
          messageCount: row.message_count,
          matchingMessages: []
        });
      }
      
      conversationMap.get(row.thread_id).matchingMessages.push({
        role: row.role,
        content: row.content.substring(0, 200) + (row.content.length > 200 ? '...' : ''),
        createdAt: row.message_created_at
      });
    });

    const searchResults = Array.from(conversationMap.values());

    res.json({
      results: searchResults,
      total: searchResults.length,
      query: query_text
    });
  } catch (error) {
    console.error('Error searching chat history:', error);
    res.status(500).json({ error: 'Error searching conversations' });
  }
});

// Export conversation (for backup/download)
router.get('/export/:threadId', logActivity('chat_export'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { threadId } = req.params;
    const { format = 'json' } = req.query;

    // Get conversation with messages
    const conversationResult = await query(`
      SELECT c.*, u.username
      FROM conversations c
      JOIN users u ON c.user_id = u.id
      WHERE c.thread_id = $1 AND c.user_id = $2
    `, [threadId, userId]);

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversation = conversationResult.rows[0];

    const messagesResult = await query(`
      SELECT role, content, train_part_data, assistant_type, created_at
      FROM conversation_messages 
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `, [conversation.id]);

    const exportData = {
      conversation: {
        threadId: conversation.thread_id,
        title: conversation.title,
        username: conversation.username,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
        messageCount: conversation.message_count
      },
      messages: messagesResult.rows
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="conversation-${threadId}.json"`);
      res.json(exportData);
    } else if (format === 'txt') {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="conversation-${threadId}.txt"`);
      
      let textContent = `Conversation: ${exportData.conversation.title}\n`;
      textContent += `User: ${exportData.conversation.username}\n`;
      textContent += `Created: ${exportData.conversation.createdAt}\n`;
      textContent += `Messages: ${exportData.conversation.messageCount}\n`;
      textContent += `\n${'='.repeat(50)}\n\n`;
      
      exportData.messages.forEach(message => {
        textContent += `[${message.created_at}] ${message.role.toUpperCase()}:\n`;
        textContent += `${message.content}\n\n`;
      });
      
      res.send(textContent);
    } else {
      res.status(400).json({ error: 'Unsupported export format' });
    }
  } catch (error) {
    console.error('Error exporting conversation:', error);
    res.status(500).json({ error: 'Error exporting conversation' });
  }
});

module.exports = router; 