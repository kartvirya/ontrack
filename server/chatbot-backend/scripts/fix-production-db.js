const { Pool } = require('pg');
require('dotenv').config();

// Production database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixProductionDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing production database...');
    
    // First, check if user_activity table exists
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_activity'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ user_activity table missing - creating now...');
      
      // Create user_activity table
      await client.query(`
        CREATE TABLE user_activity (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          action VARCHAR(100) NOT NULL,
          details TEXT,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ user_activity table created');
      
      // Create index for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id)
      `);
      console.log('✅ Index created on user_activity.user_id');
      
      // Create index on created_at for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at)
      `);
      console.log('✅ Index created on user_activity.created_at');
    } else {
      console.log('✅ user_activity table already exists');
    }
    
    // Also ensure other critical tables exist
    
    // User Settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        theme VARCHAR(20) DEFAULT 'light',
        chat_sound_enabled BOOLEAN DEFAULT true,
        email_notifications BOOLEAN DEFAULT true,
        push_notifications BOOLEAN DEFAULT true,
        auto_save_conversations BOOLEAN DEFAULT true,
        conversation_retention_days INTEGER DEFAULT 365,
        default_assistant_model VARCHAR(50) DEFAULT 'gpt-4-1106-preview',
        sidebar_collapsed BOOLEAN DEFAULT false,
        show_timestamps BOOLEAN DEFAULT true,
        compact_mode BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ User Settings table verified');
    
    // Notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        read_status BOOLEAN DEFAULT false,
        action_url VARCHAR(255),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Notifications table verified');
    
    // Create necessary indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_read_status ON notifications(read_status)
    `);
    
    console.log('✅ All indexes created');
    
    // Add update triggers for timestamp management
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
      CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);
    
    console.log('✅ Update triggers created');
    
    // Check total table count
    const tableCount = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log(`✅ Production database fixed! Total tables: ${tableCount.rows[0].count}`);
    console.log('✅ All critical tables and indexes are now in place');
    
  } catch (error) {
    console.error('❌ Error fixing production database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
if (require.main === module) {
  fixProductionDatabase()
    .then(() => {
      console.log('🎉 Production database fix completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Production database fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixProductionDatabase }; 