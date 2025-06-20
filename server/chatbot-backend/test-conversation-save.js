const { query, getClient } = require('./config/database');

async function testConversationSave() {
  console.log('🧪 Testing conversation save functionality...');
  
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const result = await query('SELECT 1 as test');
    console.log('✅ Database connected successfully');
    
    // Check if conversations table exists and its structure
    console.log('📋 Checking conversations table structure...');
    const tableStructure = await query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'conversations' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('Conversations table columns:');
    tableStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check if users table has data
    console.log('👥 Checking users table...');
    const users = await query('SELECT id, username FROM users LIMIT 1');
    if (users.rows.length === 0) {
      throw new Error('No users found in database');
    }
    
    const testUserId = users.rows[0].id;
    console.log(`✅ Found test user: ${users.rows[0].username} (ID: ${testUserId})`);
    
    // Test conversation save
    console.log('💾 Testing conversation save...');
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      const testThreadId = 'test-thread-' + Date.now();
      const testTitle = 'Test Conversation';
      const testMessages = [
        { role: 'user', content: 'Hello test' },
        { role: 'assistant', content: 'Hello there!' }
      ];
      
      // Create conversation
      const newConversationResult = await client.query(`
        INSERT INTO conversations (user_id, thread_id, title, message_count, created_at, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `, [testUserId, testThreadId, testTitle, testMessages.length]);
      
      const conversationId = newConversationResult.rows[0].id;
      console.log(`✅ Created conversation with ID: ${conversationId}`);
      
      // Insert messages
      for (const message of testMessages) {
        await client.query(`
          INSERT INTO conversation_messages 
          (conversation_id, role, content, train_part_data, assistant_type, created_at)
          VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        `, [
          conversationId,
          message.role,
          message.content,
          null,
          null
        ]);
      }
      
      await client.query('COMMIT');
      console.log('✅ Messages inserted successfully');
      
      // Verify save
      const savedConversation = await query(`
        SELECT c.*, 
               COUNT(cm.id) as actual_message_count
        FROM conversations c
        LEFT JOIN conversation_messages cm ON c.id = cm.conversation_id
        WHERE c.id = $1
        GROUP BY c.id
      `, [conversationId]);
      
      if (savedConversation.rows.length > 0) {
        const conv = savedConversation.rows[0];
        console.log('✅ Conversation saved successfully:');
        console.log(`   Title: ${conv.title}`);
        console.log(`   Message Count: ${conv.message_count}`);
        console.log(`   Actual Messages: ${conv.actual_message_count}`);
      }
      
      // Clean up test data
      await query('DELETE FROM conversation_messages WHERE conversation_id = $1', [conversationId]);
      await query('DELETE FROM conversations WHERE id = $1', [conversationId]);
      console.log('🧹 Test data cleaned up');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
    console.log('🎉 All tests passed! Conversation save functionality is working.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testConversationSave().then(() => {
  console.log('✅ Test completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
}); 