const { Pool } = require('pg');

// Production database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function cleanupProductionActivities() {
  try {
    console.log('🔌 Connecting to production database...');
    
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
    console.log('📊 Current activities in database:');
    const countResult = await pool.query(`
      SELECT action, COUNT(*) as count 
      FROM user_activity 
      GROUP BY action 
      ORDER BY count DESC
    `);
    
    countResult.rows.forEach(row => {
      const isChat = chatActivities.includes(row.action);
      const status = isChat ? '✅ KEEP' : '❌ DELETE';
      console.log(`  ${status} ${row.action}: ${row.count}`);
    });
    
    // Count activities to be deleted
    const deleteCountResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM user_activity 
      WHERE action NOT IN (${chatActivities.map((_, i) => `$${i + 1}`).join(', ')})
    `, chatActivities);
    
    const deleteCount = parseInt(deleteCountResult.rows[0].count);
    console.log(`\n🗑️  Activities to be deleted: ${deleteCount}`);
    
    if (deleteCount === 0) {
      console.log('✅ No activities to delete - database is already clean!');
      return;
    }
    
    // Delete non-chat activities
    console.log('🧹 Deleting non-chat activities...');
    const deleteResult = await pool.query(`
      DELETE FROM user_activity 
      WHERE action NOT IN (${chatActivities.map((_, i) => `$${i + 1}`).join(', ')})
    `, chatActivities);
    
    console.log(`✅ Deleted ${deleteResult.rowCount} non-chat activities`);
    
    // Verify the cleanup
    console.log('\n📈 Remaining activities:');
    const remainingResult = await pool.query(`
      SELECT action, COUNT(*) as count 
      FROM user_activity 
      GROUP BY action 
      ORDER BY count DESC
    `);
    
    if (remainingResult.rows.length === 0) {
      console.log('  🎉 No activities remaining');
    } else {
      remainingResult.rows.forEach(row => {
        console.log(`  ✅ ${row.action}: ${row.count}`);
      });
    }
    
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM user_activity');
    console.log(`\n📊 Total activities remaining: ${totalResult.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Check if DATABASE_URL is provided
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is required');
  console.log('💡 Usage: DATABASE_URL="your_production_db_url" node direct-production-cleanup.js');
  process.exit(1);
}

// Run the cleanup
cleanupProductionActivities(); 