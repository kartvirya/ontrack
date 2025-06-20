const express = require('express');
const { query, getClient } = require('../config/database');
const { authenticateToken, requireAdmin, logActivity } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const OpenAIAgentManager = require('../services/openai-agent-manager');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow text files, PDFs, and documents
    const allowedTypes = ['.txt', '.pdf', '.doc', '.docx', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .txt, .pdf, .doc, .docx, .md files are allowed.'));
    }
  }
});

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// ===== STATISTICS =====

// Get admin dashboard statistics
router.get('/statistics', logActivity('admin_view_statistics'), async (req, res) => {
  try {
    // Get user statistics
    const userStats = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_users,
        COUNT(CASE WHEN openai_assistant_id IS NOT NULL THEN 1 END) as users_with_assistants
      FROM users
    `);
    
    // Get conversation statistics
    const conversationStats = await query(`
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(DISTINCT user_id) as users_with_conversations,
        AVG(message_count) as avg_messages_per_conversation
      FROM conversations
    `);
    
    // Get message statistics
    const messageStats = await query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as user_messages,
        COUNT(CASE WHEN role = 'assistant' THEN 1 END) as assistant_messages
      FROM conversation_messages
    `);
    
    // Get recent activity
    const recentActivity = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as conversations_created
      FROM conversations
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `);
    
    res.json({
      users: userStats.rows[0],
      conversations: conversationStats.rows[0],
      messages: messageStats.rows[0],
      recentActivity: recentActivity.rows
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ===== USER MANAGEMENT =====

// Create new user
router.post('/users', logActivity('admin_create_user'), async (req, res) => {
  try {
    const { username, email, password, role = 'user', status = 'active' } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    // Check if user already exists
    const existingUser = await query(`
      SELECT id FROM users WHERE username = $1 OR email = $2
    `, [username, email]);
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this username or email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await query(`
      INSERT INTO users (username, email, password_hash, role, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, role, status, created_at
    `, [username, email, hashedPassword, role, status]);
    
    const newUser = result.rows[0];
    
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        created_at: newUser.created_at
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all users
router.get('/users', logActivity('admin_view_users'), async (req, res) => {
  try {
    const { limit = 100, offset = 0, status, role, search } = req.query;

    let sql = `
      SELECT 
        u.id, u.username, u.email, u.role, u.status, u.created_at, u.last_login,
        u.openai_assistant_id, u.vector_store_id,
        CASE WHEN u.openai_assistant_id IS NOT NULL THEN true ELSE false END as hasAgent
      FROM users u
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      sql += ` AND u.status = $${++paramCount}`;
      params.push(status);
    }

    if (role) {
      sql += ` AND u.role = $${++paramCount}`;
      params.push(role);
    }

    if (search) {
      sql += ` AND (u.username ILIKE $${++paramCount} OR u.email ILIKE $${++paramCount})`;
      params.push(`%${search}%`, `%${search}%`);
      paramCount++;
    }

    sql += ` ORDER BY u.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get user details
router.get('/users/:userId', logActivity('admin_view_user_details'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    const userResult = await query(`
      SELECT 
        u.id, u.username, u.email, u.role, u.status,
        u.openai_assistant_id, u.vector_store_id,
        u.created_at, u.updated_at, u.last_login,
        oa.assistant_name, oa.model as assistant_model,
        vs.store_name, vs.file_count
      FROM users u
      LEFT JOIN openai_assistants oa ON u.id = oa.user_id
      LEFT JOIN vector_stores vs ON u.id = vs.user_id
      WHERE u.id = $1
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Get user activity logs
    const activitiesResult = await query(`
      SELECT action, details, ip_address, created_at
      FROM activity_logs 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [userId]);
    
    res.json({
      user: {
        ...user,
        hasAgent: !!(user.openai_assistant_id && user.vector_store_id)
      },
      activities: activitiesResult.rows
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update user status (suspend/activate)
router.patch('/users/:userId/status', logActivity('admin_update_user_status'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    
    if (!['active', 'suspended', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const result = await query(`
      UPDATE users 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id
    `, [status, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: `User status updated to ${status}` });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Assign assistant to user
router.post('/users/:userId/assistant', logActivity('admin_assign_assistant'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { assistantId } = req.body;
    
    // First verify the assistant exists
    const assistantResult = await query(`
      SELECT id FROM openai_assistants WHERE assistant_id = $1
    `, [assistantId]);
    
    if (assistantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assistant not found' });
    }
    
    // Update user with assistant ID
    const result = await query(`
      UPDATE users 
      SET openai_assistant_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id
    `, [assistantId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'Assistant assigned successfully' });
  } catch (error) {
    console.error('Error assigning assistant:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Remove assistant from user
router.delete('/users/:userId/assistant', logActivity('admin_remove_assistant'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Update user to remove assistant ID
    const result = await query(`
      UPDATE users 
      SET openai_assistant_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'Assistant removed successfully' });
  } catch (error) {
    console.error('Error removing assistant:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete user and their agent
router.delete('/users/:userId', logActivity('admin_delete_user'), async (req, res) => {
  const client = await getClient();
  
  try {
    const { userId } = req.params;
    
    await client.query('BEGIN');
    
    // Get user's assistant info before deletion
    const userResult = await client.query(`
      SELECT openai_assistant_id, vector_store_id FROM users WHERE id = $1
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Delete OpenAI agent if exists
    if (user.openai_assistant_id) {
      try {
        const agentManager = new OpenAIAgentManager();
        await agentManager.deleteAssistant(user.openai_assistant_id);
      } catch (agentError) {
        console.error('Error deleting OpenAI assistant:', agentError);
        // Continue with user deletion even if agent deletion fails
      }
    }
    
    // Delete user from database (CASCADE will handle related records)
    await client.query(`DELETE FROM users WHERE id = $1`, [userId]);
    
    await client.query('COMMIT');
    res.json({ message: 'User and associated agent deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Error deleting user and agent' });
  } finally {
    client.release();
  }
});

// ===== ASSISTANT MANAGEMENT =====

// Get all assistants
router.get('/assistants', logActivity('admin_view_assistants'), async (req, res) => {
  try {
    const agentManager = new OpenAIAgentManager();
    const assistants = await agentManager.getAllAssistants();
    
    res.json({ assistants });
  } catch (error) {
    console.error('Error fetching assistants:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create new assistant
router.post('/assistants', logActivity('admin_create_assistant'), async (req, res) => {
  try {
    const { name, instructions, model, vectorStoreId } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Assistant name is required' });
    }
    
    const agentManager = new OpenAIAgentManager();
    
    // Create shared assistant in OpenAI
    const assistant = await agentManager.createSharedAssistant(
      name,
      instructions || agentManager.defaultInstructions,
      model || 'gpt-4-1106-preview',
      vectorStoreId
    );
    
    // Save to database with null user_id (shared assistant)
    await agentManager.saveAssistant(
      null, // No specific user - this is a shared assistant
      assistant.id,
      name,
      instructions || agentManager.defaultInstructions,
      model || 'gpt-4-1106-preview',
      vectorStoreId
    );
    
    res.status(201).json({
      message: 'Assistant created successfully',
      assistant: {
        assistant_id: assistant.id,
        assistant_name: name,
        instructions: instructions || agentManager.defaultInstructions,
        model: model || 'gpt-4-1106-preview',
        vector_store_id: vectorStoreId,
        assistant_type: 'shared'
      }
    });
  } catch (error) {
    console.error('Error creating assistant:', error);
    res.status(500).json({ error: 'Failed to create assistant' });
  }
});

// Update assistant
router.patch('/assistants/:assistantId', logActivity('admin_update_assistant'), async (req, res) => {
  try {
    const { assistantId } = req.params;
    const { name, instructions, model, vectorStoreId } = req.body;
    
    console.log('📝 Updating assistant:', assistantId);
    console.log('Request body:', { name, instructions, model, vectorStoreId });
    
    const agentManager = new OpenAIAgentManager();
    
    // Prepare update data for OpenAI
    const updateData = {};
    if (name) updateData.name = name;
    if (instructions) updateData.instructions = instructions;
    if (model) updateData.model = model;
    
    // Handle vector store update
    if (vectorStoreId !== undefined) {
      updateData.tool_resources = {
        file_search: {
          vector_store_ids: vectorStoreId ? [vectorStoreId] : []
        }
      };
    }
    
    console.log('🔄 Sending update to OpenAI:', updateData);
    
    // Update assistant in OpenAI
    await agentManager.updateAssistant(assistantId, updateData);
    
    // Update database
    console.log('💾 Updating database...');
    const result = await query(`
      UPDATE openai_assistants 
      SET assistant_name = COALESCE($1, assistant_name),
          instructions = COALESCE($2, instructions),
          model = COALESCE($3, model),
          vector_store_id = COALESCE($4, vector_store_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE assistant_id = $5
      RETURNING id
    `, [name, instructions, model, vectorStoreId, assistantId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assistant not found in database' });
    }
    
    console.log('✅ Assistant updated successfully');
    res.json({ message: 'Assistant updated successfully' });
  } catch (error) {
    console.error('❌ Error updating assistant:', error);
    res.status(500).json({ error: 'Failed to update assistant: ' + error.message });
  }
});

// Delete assistant
router.delete('/assistants/:assistantId', logActivity('admin_delete_assistant'), async (req, res) => {
  try {
    const { assistantId } = req.params;
    
    const agentManager = new OpenAIAgentManager();
    
    // Delete assistant from OpenAI and database
    await agentManager.deleteAssistant(assistantId);
    
    res.json({ message: 'Assistant deleted successfully' });
  } catch (error) {
    console.error('Error deleting assistant:', error);
    res.status(500).json({ error: 'Failed to delete assistant' });
  }
});

// Get assistant users - shows which users are assigned to which assistant
router.get('/assistants/:assistantId/users', logActivity('admin_view_assistant_users'), async (req, res) => {
  try {
    const { assistantId } = req.params;
    
    const result = await query(`
      SELECT u.id, u.username, u.email, u.status, u.created_at
      FROM users u
      WHERE u.openai_assistant_id = $1
      ORDER BY u.username
    `, [assistantId]);
    
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching assistant users:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ===== VECTOR STORE MANAGEMENT =====

// Get all vector stores
router.get('/vector-stores', logActivity('admin_view_vector_stores'), async (req, res) => {
  try {
    const result = await query(`
    SELECT 
      id, store_id, store_name, description, file_count, created_at, updated_at
    FROM vector_stores 
    ORDER BY created_at DESC
    `);
    
    res.json({ vectorStores: result.rows });
  } catch (error) {
    console.error('Error fetching vector stores:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create new vector store
router.post('/vector-stores', upload.array('files'), logActivity('admin_create_vector_store'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const files = req.files;
    
    console.log('📁 Creating vector store:', name);
    console.log('📁 Description:', description);
    console.log('📁 Files provided:', files ? files.length : 0);
    
    if (!name) {
      return res.status(400).json({ error: 'Vector store name is required' });
    }
    
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Create vector store in OpenAI
    const vectorStore = await openai.beta.vectorStores.create({
      name: name,
      expires_after: {
        anchor: "last_active_at",
        days: 90
      }
    });
    
    console.log(`✅ Vector store created in OpenAI: ${vectorStore.id}`);
    
    let fileCount = 0;
    let uploadResults = [];
    
    // Upload files if provided
    if (files && files.length > 0) {
      console.log(`📄 Uploading ${files.length} files to vector store`);
      
      for (const file of files) {
        try {
          console.log(`⬆️ Uploading file: ${file.originalname} (${file.size} bytes)`);
          
          // Check if file exists
          if (!require('fs').existsSync(file.path)) {
            throw new Error('Uploaded file not found on disk');
          }
          
          // Upload file to OpenAI
          const fileStream = require('fs').createReadStream(file.path);
          const openaiFile = await openai.files.create({
            file: fileStream,
            purpose: 'assistants'
          });
          
          console.log(`✅ File uploaded to OpenAI: ${openaiFile.id}`);
          
          // Add file to vector store
          await openai.beta.vectorStores.files.create(vectorStore.id, {
            file_id: openaiFile.id
          });
          
          uploadResults.push({
            filename: file.originalname,
            fileId: openaiFile.id,
            success: true
          });
          
          fileCount++;
          console.log(`✅ Successfully added to vector store: ${file.originalname}`);
          
          // Clean up uploaded file
          try {
            require('fs').unlinkSync(file.path);
          } catch (cleanupError) {
            console.warn(`⚠️ Failed to cleanup file: ${file.path}`, cleanupError.message);
          }
          
        } catch (fileError) {
          console.error(`❌ Failed to upload ${file.originalname}:`, fileError.message);
          uploadResults.push({
            filename: file.originalname,
            success: false,
            error: fileError.message
          });
          
          // Clean up failed upload file
          try {
            if (file.path && require('fs').existsSync(file.path)) {
              require('fs').unlinkSync(file.path);
            }
          } catch (cleanupError) {
            console.warn(`⚠️ Failed to cleanup failed file: ${file.path}`);
          }
        }
      }
    }
    
    // Save to database
    await query(`
      INSERT INTO vector_stores 
      (user_id, store_id, store_name, description, file_count)
      VALUES ($1, $2, $3, $4, $5)
    `, [req.user.id, vectorStore.id, name, description || '', fileCount]);
    
    console.log('✅ Vector store saved to database');
    
    const successCount = uploadResults.filter(r => r.success).length;
    const failCount = uploadResults.filter(r => !r.success).length;
    
    let message = 'Vector store created successfully';
    if (files && files.length > 0) {
      message += `. Uploaded ${successCount} files${failCount > 0 ? `, ${failCount} failed` : ''}`;
    }
    
    res.status(201).json({
      message,
      vectorStore: {
        id: vectorStore.id,
        store_id: vectorStore.id,
        store_name: name,
        description: description || '',
        file_count: fileCount,
        created_at: new Date().toISOString()
      },
      uploadResults: uploadResults.length > 0 ? uploadResults : undefined
    });
  } catch (error) {
    console.error('❌ Error creating vector store:', error);
    
    // Clean up any uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        try {
          if (file.path && require('fs').existsSync(file.path)) {
            require('fs').unlinkSync(file.path);
          }
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup file on error: ${file.path}`);
        }
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create vector store: ' + error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update vector store
router.patch('/vector-stores/:storeId', logActivity('admin_update_vector_store'), async (req, res) => {
  try {
    const { storeId } = req.params;
    const { name, description } = req.body;
    
    console.log('📝 Updating vector store:', storeId);
    console.log('Request body:', { name, description });
    
    // Update database
    const result = await query(`
      UPDATE vector_stores 
      SET store_name = COALESCE($1, store_name),
          description = COALESCE($2, description),
          updated_at = CURRENT_TIMESTAMP
      WHERE store_id = $3
      RETURNING id
    `, [name, description, storeId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vector store not found' });
    }
    
    console.log('✅ Vector store updated successfully');
    res.json({ message: 'Vector store updated successfully' });
  } catch (error) {
    console.error('❌ Error updating vector store:', error);
    res.status(500).json({ error: 'Failed to update vector store: ' + error.message });
  }
});

// Delete vector store
router.delete('/vector-stores/:storeId', logActivity('admin_delete_vector_store'), async (req, res) => {
  try {
    const { storeId } = req.params;
    
    console.log('🗑️ Deleting vector store:', storeId);
    
    // Check if any assistants are using this vector store
    const assistantCheck = await query(`
      SELECT COUNT(*) as count FROM openai_assistants WHERE vector_store_id = $1
    `, [storeId]);
    
    if (parseInt(assistantCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete vector store that is being used by assistants. Please remove it from assistants first.' 
      });
    }
    
    // Delete from OpenAI first
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      await openai.beta.vectorStores.del(storeId);
      console.log('✅ Vector store deleted from OpenAI');
    } catch (openaiError) {
      console.error('⚠️ Error deleting from OpenAI (continuing with database cleanup):', openaiError.message);
    }
    
    // Delete from database
    const result = await query(`
      DELETE FROM vector_stores WHERE store_id = $1 RETURNING id
    `, [storeId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vector store not found in database' });
    }
    
    console.log('✅ Vector store deleted successfully');
    res.json({ message: 'Vector store deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting vector store:', error);
    res.status(500).json({ error: 'Failed to delete vector store: ' + error.message });
  }
});

// Get vector store files
router.get('/vector-stores/:storeId/files', logActivity('admin_view_vector_store_files'), async (req, res) => {
  try {
    const { storeId } = req.params;
    
    console.log('📁 Fetching files for vector store:', storeId);
    
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Get files from OpenAI
    const files = await openai.beta.vectorStores.files.list(storeId);
    
    // Get file details for each file
    const fileDetails = await Promise.all(
      files.data.map(async (file) => {
        try {
          const fileInfo = await openai.files.retrieve(file.id);
          return {
            id: file.id,
            filename: fileInfo.filename,
            bytes: fileInfo.bytes,
            created_at: new Date(fileInfo.created_at * 1000).toISOString(),
            status: file.status,
            usage_bytes: file.usage_bytes || 0
          };
        } catch (error) {
          console.error(`Error fetching file details for ${file.id}:`, error);
          return {
            id: file.id,
            filename: 'Unknown',
            bytes: 0,
            created_at: new Date().toISOString(),
            status: file.status,
            usage_bytes: 0
          };
        }
      })
    );
    
    console.log(`✅ Found ${fileDetails.length} files in vector store`);
    res.json({ files: fileDetails });
  } catch (error) {
    console.error('❌ Error fetching vector store files:', error);
    res.status(500).json({ error: 'Failed to fetch vector store files: ' + error.message });
  }
});

// Add files to vector store
router.post('/vector-stores/:storeId/files', upload.array('files'), logActivity('admin_add_files_to_vector_store'), async (req, res) => {
  try {
    const { storeId } = req.params;
    const files = req.files;
    
    console.log(`📁 File upload request for vector store: ${storeId}`);
    console.log(`📁 User: ${req.user.username} (${req.user.role})`);
    console.log(`📁 Files received: ${files ? files.length : 0}`);
    
    if (!files || files.length === 0) {
      console.log('❌ No files provided in request');
      return res.status(400).json({ error: 'No files provided' });
    }
    
    // Validate vector store exists
    const vectorStoreCheck = await query('SELECT * FROM vector_stores WHERE store_id = $1', [storeId]);
    if (vectorStoreCheck.rows.length === 0) {
      console.log(`❌ Vector store not found: ${storeId}`);
      return res.status(404).json({ error: 'Vector store not found' });
    }
    
    console.log(`📁 Adding ${files.length} files to vector store: ${storeId}`);
    
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const uploadResults = [];
    
    for (const file of files) {
      try {
        console.log(`⬆️ Uploading file: ${file.originalname} (${file.size} bytes)`);
        
        // Check if file exists
        if (!require('fs').existsSync(file.path)) {
          throw new Error('Uploaded file not found on disk');
        }
        
        // Upload file to OpenAI
        const fileStream = require('fs').createReadStream(file.path);
        const openaiFile = await openai.files.create({
          file: fileStream,
          purpose: 'assistants'
        });
        
        console.log(`✅ File uploaded to OpenAI: ${openaiFile.id}`);
        
        // Add file to vector store
        await openai.beta.vectorStores.files.create(storeId, {
          file_id: openaiFile.id
        });
        
        uploadResults.push({
          filename: file.originalname,
          fileId: openaiFile.id,
          success: true
        });
        
        console.log(`✅ Successfully added to vector store: ${file.originalname}`);
        
        // Clean up uploaded file
        try {
          require('fs').unlinkSync(file.path);
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup file: ${file.path}`, cleanupError.message);
        }
        
      } catch (fileError) {
        console.error(`❌ Failed to upload ${file.originalname}:`, fileError.message);
        uploadResults.push({
          filename: file.originalname,
          success: false,
          error: fileError.message
        });
        
        // Clean up failed upload file
        try {
          if (file.path && require('fs').existsSync(file.path)) {
            require('fs').unlinkSync(file.path);
          }
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup failed file: ${file.path}`);
        }
      }
    }
    
    // Update file count in database
    try {
      const fileCount = await openai.beta.vectorStores.files.list(storeId);
      await query(`
        UPDATE vector_stores 
        SET file_count = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE store_id = $2
      `, [fileCount.data.length, storeId]);
      console.log(`📊 Updated file count: ${fileCount.data.length}`);
    } catch (updateError) {
      console.warn('⚠️ Failed to update file count in database:', updateError.message);
    }
    
    const successCount = uploadResults.filter(r => r.success).length;
    const failCount = uploadResults.filter(r => !r.success).length;
    
    const message = `Successfully uploaded ${successCount} files${failCount > 0 ? `, ${failCount} failed` : ''}`;
    console.log(`✅ Upload complete: ${message}`);
    
    res.json({
      message,
      results: uploadResults,
      successCount,
      failCount
    });
  } catch (error) {
    console.error('❌ Error adding files to vector store:', error);
    
    // Clean up any uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        try {
          if (file.path && require('fs').existsSync(file.path)) {
            require('fs').unlinkSync(file.path);
          }
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup file on error: ${file.path}`);
        }
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to add files to vector store: ' + error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Remove file from vector store
router.delete('/vector-stores/:storeId/files/:fileId', logActivity('admin_remove_file_from_vector_store'), async (req, res) => {
  try {
    const { storeId, fileId } = req.params;
    
    console.log(`🗑️ Removing file ${fileId} from vector store ${storeId}`);
    
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Remove file from vector store
    await openai.beta.vectorStores.files.del(storeId, fileId);
    
    // Update file count in database
    const fileCount = await openai.beta.vectorStores.files.list(storeId);
    await query(`
      UPDATE vector_stores 
      SET file_count = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE store_id = $2
    `, [fileCount.data.length, storeId]);
    
    console.log('✅ File removed successfully');
    res.json({ message: 'File removed from vector store successfully' });
  } catch (error) {
    console.error('❌ Error removing file from vector store:', error);
    res.status(500).json({ error: 'Failed to remove file from vector store: ' + error.message });
  }
});

// Get vector store analytics
router.get('/vector-stores/:storeId/analytics', logActivity('admin_view_vector_store_analytics'), async (req, res) => {
  try {
    const { storeId } = req.params;
    
    console.log('📊 Fetching analytics for vector store:', storeId);
    
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Get vector store details
    const vectorStore = await openai.beta.vectorStores.retrieve(storeId);
    const files = await openai.beta.vectorStores.files.list(storeId);
    
    // Calculate analytics
    const analytics = {
      totalFiles: files.data.length,
      totalBytes: files.data.reduce((sum, file) => sum + (file.usage_bytes || 0), 0),
      fileTypes: {},
      statusDistribution: {},
      createdAt: new Date(vectorStore.created_at * 1000).toISOString(),
      lastModified: new Date(vectorStore.last_active_at * 1000).toISOString()
    };
    
    // Get detailed file information
    for (const file of files.data) {
      try {
        const fileInfo = await openai.files.retrieve(file.id);
        const extension = fileInfo.filename.split('.').pop()?.toLowerCase() || 'unknown';
        
        analytics.fileTypes[extension] = (analytics.fileTypes[extension] || 0) + 1;
        analytics.statusDistribution[file.status] = (analytics.statusDistribution[file.status] || 0) + 1;
      } catch (error) {
        console.error(`Error getting file info for ${file.id}:`, error);
      }
    }
    
    console.log('✅ Analytics calculated successfully');
    res.json({ analytics });
  } catch (error) {
    console.error('❌ Error fetching vector store analytics:', error);
    res.status(500).json({ error: 'Failed to fetch vector store analytics: ' + error.message });
  }
});

// ===== ACTIVITY MONITORING =====

// Get recent activities
router.get('/activities', logActivity('admin_view_activities'), async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        al.action, al.details, al.ip_address, al.created_at,
        u.username
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 100
    `);
    
    res.json({ activities: result.rows });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ===== SYSTEM STATISTICS =====

// Get system statistics
router.get('/stats', logActivity('admin_view_stats'), async (req, res) => {
  try {
    // Get user counts
    const userStats = await query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_users,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended_users,
        SUM(CASE WHEN openai_assistant_id IS NOT NULL THEN 1 ELSE 0 END) as users_with_agents
      FROM users
    `);
    
    // Get activity counts for last 30 days
    const activityStats = await query(`
      SELECT 
        COUNT(*) as total_activities,
        COUNT(DISTINCT user_id) as active_users_30d
      FROM activity_logs 
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `);
    
    // Get assistant and vector store counts
    const systemStats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM openai_assistants) as total_assistants,
        (SELECT COUNT(*) FROM vector_stores) as total_vector_stores
    `);
    
    // Get recent registrations
    const registrationStats = await query(`
      SELECT DATE(created_at) as date, COUNT(*) as registrations
      FROM users 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    res.json({
      users: userStats.rows[0],
      activity: activityStats.rows[0],
      system: systemStats.rows[0],
      registrations: registrationStats.rows
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ===== BULK OPERATIONS =====

// Bulk update all assistant instructions
router.put('/assistants/bulk-update-instructions', logActivity('admin_bulk_update_instructions'), async (req, res) => {
  try {
    const { instructions } = req.body;
    
    if (!instructions) {
      return res.status(400).json({ error: 'Instructions are required' });
    }
    
    const agentManager = new OpenAIAgentManager();
    
    // Get all assistants
    const assistantsResult = await query(`
      SELECT assistant_id, user_id FROM openai_assistants
    `);
    
    const updatePromises = assistantsResult.rows.map(async (assistant) => {
      try {
        // Personalize instructions with user ID
        const personalizedInstructions = instructions.replace('{USER_ID}', assistant.user_id);
        
        // Update assistant in OpenAI
        await agentManager.updateAssistant(assistant.assistant_id, {
          instructions: personalizedInstructions
        });
        
        return { assistantId: assistant.assistant_id, success: true };
      } catch (error) {
        console.error(`Failed to update assistant ${assistant.assistant_id}:`, error);
        return { assistantId: assistant.assistant_id, success: false, error: error.message };
      }
    });
    
    const results = await Promise.all(updatePromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);
    
    res.json({
      message: `Bulk update completed. ${successful} assistants updated successfully.`,
      successful_count: successful,
      failed_count: failed.length,
      failed_assistants: failed
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({ error: 'Failed to perform bulk update' });
  }
});

// ===== SYSTEM SETTINGS =====

// Get all system settings
router.get('/settings', logActivity('admin_view_system_settings'), async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM system_settings 
      ORDER BY category, setting_key
    `);
    
    // Group settings by category
    const groupedSettings = result.rows.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {});
    
    res.json({ settings: groupedSettings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update system setting
router.put('/settings/:settingKey', logActivity('admin_update_system_setting'), async (req, res) => {
  try {
    const { settingKey } = req.params;
    const { setting_value, description } = req.body;
    
    const result = await query(`
      UPDATE system_settings 
      SET setting_value = $1, description = $2, updated_at = CURRENT_TIMESTAMP
      WHERE setting_key = $3
      RETURNING id
    `, [setting_value, description, settingKey]);
    
    if (result.rows.length === 0) {
      // Create new setting if it doesn't exist
      await query(`
        INSERT INTO system_settings (setting_key, setting_value, description)
        VALUES ($1, $2, $3)
      `, [settingKey, setting_value, description]);
      
      res.json({ message: 'System setting created successfully' });
    } else {
      res.json({ message: 'System setting updated successfully' });
    }
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create system setting
router.post('/settings', logActivity('admin_create_system_setting'), async (req, res) => {
  try {
    const { setting_key, setting_value, setting_type, description, category, is_public } = req.body;
    
    if (!setting_key || setting_value === undefined) {
      return res.status(400).json({ error: 'Setting key and value are required' });
    }
    
    const result = await query(`
      INSERT INTO system_settings 
      (setting_key, setting_value, setting_type, description, category, is_public)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [setting_key, setting_value, setting_type || 'string', description, category || 'general', is_public || false]);
    
    res.status(201).json({ 
      message: 'System setting created successfully',
      setting_id: result.rows[0].id
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Setting key already exists' });
    }
    console.error('Error creating setting:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete system setting
router.delete('/settings/:settingKey', logActivity('admin_delete_system_setting'), async (req, res) => {
  try {
    const { settingKey } = req.params;
    
    const result = await query(`
      DELETE FROM system_settings WHERE setting_key = $1 RETURNING id
    `, [settingKey]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    res.json({ message: 'System setting deleted successfully' });
  } catch (error) {
    console.error('Error deleting setting:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ===== NOTIFICATION MANAGEMENT =====

// Get all notifications
router.get('/notifications', logActivity('admin_view_all_notifications'), async (req, res) => {
  try {
    const { limit = 100, offset = 0, type, user_id } = req.query;
    
    let sql = `
      SELECT n.*, u.username 
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;
    
    if (type) {
      sql += ` AND n.type = $${++paramCount}`;
      params.push(type);
    }
    
    if (user_id) {
      sql += ` AND n.user_id = $${++paramCount}`;
      params.push(user_id);
    }
    
    sql += ` ORDER BY n.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await query(sql, params);
    res.json({ notifications: result.rows });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create notification for user(s)
router.post('/notifications', logActivity('admin_create_notification'), async (req, res) => {
  const client = await getClient();
  
  try {
    const { user_ids, title, message, type, action_url, expires_at } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }
    
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'At least one user ID is required' });
    }
    
    await client.query('BEGIN');
    
    const notificationIds = [];
    
    // Insert notification for each user
    for (const userId of user_ids) {
      const result = await client.query(`
        INSERT INTO notifications (user_id, title, message, type, action_url, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [userId, title, message, type || 'info', action_url, expires_at]);
      
      notificationIds.push(result.rows[0].id);
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Notifications created successfully',
      notification_ids: notificationIds,
      count: notificationIds.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating notifications:', error);
    res.status(500).json({ error: 'Error creating notifications' });
  } finally {
    client.release();
  }
});

// Broadcast notification to all users
router.post('/notifications/broadcast', logActivity('admin_broadcast_notification'), async (req, res) => {
  const client = await getClient();
  
  try {
    const { title, message, type, action_url, expires_at, exclude_admins } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }
    
    // Get all user IDs
    let userQuery = `SELECT id FROM users WHERE status = 'active'`;
    if (exclude_admins) {
      userQuery += ` AND role != 'admin'`;
    }
    
    const usersResult = await client.query(userQuery);
    const users = usersResult.rows;
    
    if (users.length === 0) {
      return res.json({ message: 'No users to notify', count: 0 });
    }
    
    await client.query('BEGIN');
    
    const notificationIds = [];
    
    // Insert notification for each user
    for (const user of users) {
      const result = await client.query(`
        INSERT INTO notifications (user_id, title, message, type, action_url, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [user.id, title, message, type || 'info', action_url, expires_at]);
      
      notificationIds.push(result.rows[0].id);
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Broadcast notification sent successfully',
      count: notificationIds.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error broadcasting notification:', error);
    res.status(500).json({ error: 'Error broadcasting notification' });
  } finally {
    client.release();
  }
});

// Delete notification
router.delete('/notifications/:notificationId', logActivity('admin_delete_notification'), async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const result = await query(`
      DELETE FROM notifications WHERE id = $1 RETURNING id
    `, [notificationId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ===== ADMIN PROFILE =====

// Get admin profile
router.get('/profile', logActivity('admin_view_profile'), async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await query(`
      SELECT 
        u.id, u.username, u.email, u.role, u.status, u.created_at, u.last_login,
        p.first_name, p.last_name, p.phone, p.department, p.job_title, 
        p.bio, p.avatar_url, p.timezone, p.language, p.date_format
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin profile not found' });
    }
    
    res.json({ profile: result.rows[0] });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update admin profile
router.put('/profile', logActivity('admin_update_profile'), async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      first_name, last_name, phone, department, job_title, bio,
      timezone, language, date_format
    } = req.body;
    
    // Check if profile exists
    const profileResult = await query(`
      SELECT id FROM user_profiles WHERE user_id = $1
    `, [userId]);
    
    if (profileResult.rows.length > 0) {
      // Update existing profile
      await query(`
        UPDATE user_profiles 
        SET first_name = $1, last_name = $2, phone = $3, department = $4, 
            job_title = $5, bio = $6, timezone = $7, language = $8, 
            date_format = $9, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $10
      `, [first_name, last_name, phone, department, job_title, bio, 
          timezone, language, date_format, userId]);
    } else {
      // Create new profile
      await query(`
        INSERT INTO user_profiles 
        (user_id, first_name, last_name, phone, department, job_title, 
         bio, timezone, language, date_format)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [userId, first_name, last_name, phone, department, job_title, 
          bio, timezone, language, date_format]);
    }
    
    res.json({ message: 'Admin profile updated successfully' });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    res.status(500).json({ error: 'Error updating admin profile' });
  }
});

// ===== SYSTEM HEALTH =====

// System health check
router.get('/health', logActivity('admin_health_check'), async (req, res) => {
  try {
    const health = {
      database: false,
      openai: false,
      storage: false,
      memory: 0,
      timestamp: new Date().toISOString()
    };

    // Check database connection
    try {
      await query('SELECT 1');
      health.database = true;
    } catch (dbError) {
      console.error('Database health check failed:', dbError);
    }

    // Check OpenAI API
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      await openai.models.list();
      health.openai = true;
    } catch (openaiError) {
      console.error('OpenAI health check failed:', openaiError);
    }

    // Check file storage
    try {
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      fs.accessSync(uploadsDir, fs.constants.R_OK | fs.constants.W_OK);
      health.storage = true;
    } catch (storageError) {
      console.error('Storage health check failed:', storageError);
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    health.memory = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

    res.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Cleanup old data
router.post('/system/cleanup', logActivity('admin_system_cleanup'), async (req, res) => {
  const client = await getClient();
  
  try {
    const { days_old = 90 } = req.body;
    
    const cutoffDate = new Date(Date.now() - (days_old * 24 * 60 * 60 * 1000)).toISOString();
    
    await client.query('BEGIN');
    
    let cleanupResults = {};
    
    // Clean old activity logs
    const activityResult = await client.query(`
      DELETE FROM activity_logs WHERE created_at < $1
    `, [cutoffDate]);
    cleanupResults.activity_logs = { status: 'success', deleted: activityResult.rowCount };
    
    // Clean expired password reset tokens
    const resetTokensResult = await client.query(`
      DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP
    `);
    cleanupResults.reset_tokens = { status: 'success', deleted: resetTokensResult.rowCount };
    
    // Clean expired notifications
    const notificationsResult = await client.query(`
      DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP
    `);
    cleanupResults.notifications = { status: 'success', deleted: notificationsResult.rowCount };
    
    await client.query('COMMIT');
    
    res.json({
      message: 'System cleanup completed',
      results: cleanupResults
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Error during system cleanup' });
  } finally {
    client.release();
  }
});

module.exports = router; 