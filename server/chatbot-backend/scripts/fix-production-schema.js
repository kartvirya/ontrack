const { query } = require('../config/database');

async function fixProductionSchema() {
  console.log('🔧 Starting production schema fix...');
  
  try {
    // Check current conversations table structure
    console.log('📋 Checking conversations table structure...');
    const tableInfo = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'conversations' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('Current conversations columns:', tableInfo.rows.map(r => r.column_name));
    
    // Add missing columns to conversations table
    const existingColumns = tableInfo.rows.map(r => r.column_name);
    
    if (!existingColumns.includes('message_count')) {
      console.log('➕ Adding message_count column...');
      await query(`
        ALTER TABLE conversations 
        ADD COLUMN message_count INTEGER DEFAULT 0
      `);
    }
    
    if (!existingColumns.includes('updated_at')) {
      console.log('➕ Adding updated_at column...');
      await query(`
        ALTER TABLE conversations 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
    }
    
    // Check conversation_messages table structure
    console.log('📋 Checking conversation_messages table structure...');
    const messagesTableInfo = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'conversation_messages' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('Current conversation_messages columns:', messagesTableInfo.rows.map(r => r.column_name));
    
    // Add missing columns to conversation_messages table
    const existingMessageColumns = messagesTableInfo.rows.map(r => r.column_name);
    
    if (!existingMessageColumns.includes('train_part_data')) {
      console.log('➕ Adding train_part_data column...');
      await query(`
        ALTER TABLE conversation_messages 
        ADD COLUMN train_part_data TEXT
      `);
    }
    
    if (!existingMessageColumns.includes('assistant_type')) {
      console.log('➕ Adding assistant_type column...');
      await query(`
        ALTER TABLE conversation_messages 
        ADD COLUMN assistant_type VARCHAR(100)
      `);
    }
    
    // Update message_count for existing conversations
    console.log('🔄 Updating message counts for existing conversations...');
    await query(`
      UPDATE conversations 
      SET message_count = (
        SELECT COUNT(*) 
        FROM conversation_messages 
        WHERE conversation_messages.conversation_id = conversations.id
      )
      WHERE message_count IS NULL OR message_count = 0
    `);
    
    console.log('✅ Production schema fix completed successfully!');
    
    // Verify the fix
    const finalCheck = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name IN ('conversations', 'conversation_messages') AND table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
    
    console.log('📊 Final schema verification:');
    const conversationCols = finalCheck.rows.filter(r => r.column_name).length;
    console.log(`Total columns verified: ${conversationCols}`);
    
    return {
      success: true,
      message: 'Schema fixed successfully',
      columns: finalCheck.rows
    };
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  fixProductionSchema()
    .then(() => {
      console.log('Schema fix completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Schema fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixProductionSchema }; 