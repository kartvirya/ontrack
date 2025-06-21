const { query } = require('../config/database');

async function cleanupActivities() {
  try {
    console.log('🧹 Starting activity cleanup...');
    
    // Define chat-related activities to keep
    const chatActivities = [
      'chat_message_sent',
      'chat_message_received', 
      'chat_conversation_started',
      'chat_conversation_ended',
      'chat_history_save',
      'chat_history_load',
      'user_login',
      'user_logout'
    ];
    
    // First, let's see what we have
    const countResult = await query(`
      SELECT action, COUNT(*) as count 
      FROM user_activity 
      GROUP BY action 
      ORDER BY count DESC
    `);
    
    console.log('📊 Current activities in database:');
    countResult.rows.forEach(row => {
      const isChat = chatActivities.includes(row.action);
      console.log(`  ${row.action}: ${row.count} ${isChat ? '✅ (keep)' : '❌ (remove)'}`);
    });
    
    // Delete non-chat activities
    const deleteResult = await query(`
      DELETE FROM user_activity 
      WHERE action NOT IN (${chatActivities.map((_, i) => `$${i + 1}`).join(', ')})
    `, chatActivities);
    
    console.log(`🗑️  Deleted ${deleteResult.rowCount} non-chat activities`);
    
    // Show remaining activities
    const remainingResult = await query(`
      SELECT action, COUNT(*) as count 
      FROM user_activity 
      GROUP BY action 
      ORDER BY count DESC
    `);
    
    console.log('📊 Remaining activities after cleanup:');
    remainingResult.rows.forEach(row => {
      console.log(`  ${row.action}: ${row.count}`);
    });
    
    console.log('✅ Activity cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during activity cleanup:', error);
    throw error;
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupActivities()
    .then(() => {
      console.log('🎉 Cleanup finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupActivities }; 