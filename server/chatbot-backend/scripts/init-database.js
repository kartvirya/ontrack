const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// PostgreSQL connection configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'lisa_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
};

// Create database and tables
const pool = new Pool(dbConfig);

// Create tables
const createTables = async () => {
  const client = await pool.connect();
  
  try {
      // Users table
    await client.query(`
        CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'user',
          status VARCHAR(20) DEFAULT 'active',
          openai_assistant_id VARCHAR(100),
          vector_store_id VARCHAR(100),
        reset_token VARCHAR(255),
        reset_token_expiry TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
        )
    `);
          console.log('✅ Users table created/verified');

      // OpenAI Assistants table
    await client.query(`
        CREATE TABLE IF NOT EXISTS openai_assistants (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          assistant_id VARCHAR(100) UNIQUE NOT NULL,
          assistant_name VARCHAR(100) NOT NULL,
          instructions TEXT,
          model VARCHAR(50) DEFAULT 'gpt-4-1106-preview',
          vector_store_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
          console.log('✅ OpenAI Assistants table created/verified');

      // Vector Stores table
    await client.query(`
        CREATE TABLE IF NOT EXISTS vector_stores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          store_id VARCHAR(100) UNIQUE NOT NULL,
          store_name VARCHAR(100) NOT NULL,
          description TEXT,
          file_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
          console.log('✅ Vector Stores table created/verified');

      // Conversations table
    await client.query(`
        CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          thread_id VARCHAR(100) NOT NULL,
          title VARCHAR(255),
          message_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, thread_id)
        )
    `);
          console.log('✅ Conversations table created/verified');

      // Conversation Messages table
    await client.query(`
        CREATE TABLE IF NOT EXISTS conversation_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          role VARCHAR(20) NOT NULL,
          content TEXT NOT NULL,
          train_part_data TEXT,
          assistant_type VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
          console.log('✅ Conversation Messages table created/verified');

      // User Sessions table
    await client.query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          session_token VARCHAR(255) UNIQUE NOT NULL,
          thread_id VARCHAR(100),
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
          console.log('✅ User Sessions table created/verified');

      // Activity Logs table
    await client.query(`
        CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(100) NOT NULL,
          details TEXT,
          ip_address VARCHAR(45),
          user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
          console.log('✅ Activity Logs table created/verified');

      // User Profiles table
    await client.query(`
        CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          first_name VARCHAR(50),
          last_name VARCHAR(50),
          phone VARCHAR(20),
          department VARCHAR(100),
          job_title VARCHAR(100),
          bio TEXT,
          avatar_url VARCHAR(255),
          timezone VARCHAR(50) DEFAULT 'UTC',
          language VARCHAR(10) DEFAULT 'en',
          date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
          console.log('✅ User Profiles table created/verified');

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
          console.log('✅ User Settings table created/verified');

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
          console.log('✅ Notifications table created/verified');

      // System Settings table
    await client.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
          setting_key VARCHAR(100) UNIQUE NOT NULL,
          setting_value TEXT,
          setting_type VARCHAR(20) DEFAULT 'string',
          description TEXT,
          category VARCHAR(50) DEFAULT 'general',
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
          console.log('✅ System Settings table created/verified');

      // Password Reset Tokens table
    await client.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
          console.log('✅ Password Reset Tokens table created/verified');

  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    client.release();
        }
};

// Create default admin user
const createAdminUser = async () => {
  const client = await pool.connect();
  
  try {
    const adminPassword = 'admin123'; // Change this in production!
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    
    const result = await client.query(`
      INSERT INTO users (username, email, password_hash, role, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (username) DO NOTHING
      RETURNING id
    `, ['admin', 'admin@lisa.com', hashedPassword, 'admin', 'active']);
    
    if (result.rows.length > 0) {
          console.log('👤 Default admin user created');
          console.log('   Username: admin');
          console.log('   Password: admin123');
          console.log('   ⚠️  Please change the password after first login!');
        } else {
          console.log('👤 Admin user already exists');
        }
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  } finally {
    client.release();
      }
};

// Main initialization function
const initializeDatabase = async () => {
  try {
    console.log('🚀 Initializing Lisa Database (PostgreSQL)...');
    console.log('📁 Connected to PostgreSQL database');
    await createTables();
    await createAdminUser();
    console.log('✅ Database initialization complete!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('📁 Database connection closed');
  }
};

// Run initialization if this script is called directly
if (require.main === module) {
initializeDatabase(); 
}

module.exports = { initializeDatabase }; 