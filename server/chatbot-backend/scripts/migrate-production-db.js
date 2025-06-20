#!/usr/bin/env node

/**
 * Production Database Migration Script
 * 
 * This script ensures all required tables exist in the production database.
 * Run this if you're experiencing database table errors in production.
 * 
 * Usage:
 *   node scripts/migrate-production-db.js
 * 
 * Or with specific DATABASE_URL:
 *   DATABASE_URL="your_db_url" node scripts/migrate-production-db.js
 */

const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateDatabase() {
  console.log('🚀 Starting database migration...');
  console.log(`📍 Connecting to: ${process.env.DATABASE_URL ? 'Production Database' : 'Local Database'}`);
  
  const client = await pool.connect();
  
  try {
    // Check current tables
    console.log('📋 Checking existing tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    const existingTables = tablesResult.rows.map(row => row.table_name);
    console.log('✅ Existing tables:', existingTables);
    
    const requiredTables = [
      'users',
      'openai_assistants', 
      'vector_stores',
      'conversations',
      'conversation_messages',
      'user_activity',
      'user_sessions',
      'activity_logs',
      'user_profiles',
      'password_reset_tokens'
    ];
    
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length === 0) {
      console.log('✅ All required tables exist!');
    } else {
      console.log('⚠️  Missing tables:', missingTables);
      console.log('🔧 Creating missing tables...');
    }
    
    // Users table
    if (!existingTables.includes('users')) {
      await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
          openai_assistant_id VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP,
          profile_data JSONB DEFAULT '{}'
        )
      `);
      console.log('✅ Created users table');
    }

    // OpenAI Assistants table
    if (!existingTables.includes('openai_assistants')) {
      await client.query(`
        CREATE TABLE openai_assistants (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          assistant_id VARCHAR(100) UNIQUE NOT NULL,
          assistant_name VARCHAR(100) NOT NULL,
          instructions TEXT,
          model VARCHAR(50) DEFAULT 'gpt-4-1106-preview',
          vector_store_id VARCHAR(100),
          assistant_type VARCHAR(20) DEFAULT 'personal' CHECK (assistant_type IN ('personal', 'shared')),
          user_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created openai_assistants table');
    }

    // Vector Stores table
    if (!existingTables.includes('vector_stores')) {
      await client.query(`
        CREATE TABLE vector_stores (
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
      console.log('✅ Created vector_stores table');
    }

    // Conversations table
    if (!existingTables.includes('conversations')) {
      await client.query(`
        CREATE TABLE conversations (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          thread_id VARCHAR(255) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL,
          messages JSONB NOT NULL DEFAULT '[]',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created conversations table');
    }

    // Conversation Messages table
    if (!existingTables.includes('conversation_messages')) {
      await client.query(`
        CREATE TABLE conversation_messages (
          id SERIAL PRIMARY KEY,
          conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          role VARCHAR(20) NOT NULL,
          content TEXT NOT NULL,
          train_part_data TEXT,
          assistant_type VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created conversation_messages table');
    }

    // User Activity table
    if (!existingTables.includes('user_activity')) {
      await client.query(`
        CREATE TABLE user_activity (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          activity_type VARCHAR(50) NOT NULL,
          activity_data JSONB DEFAULT '{}',
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created user_activity table');
    }

    // User Sessions table
    if (!existingTables.includes('user_sessions')) {
      await client.query(`
        CREATE TABLE user_sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          session_token VARCHAR(255) UNIQUE NOT NULL,
          thread_id VARCHAR(100),
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created user_sessions table');
    }

    // Activity Logs table
    if (!existingTables.includes('activity_logs')) {
      await client.query(`
        CREATE TABLE activity_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(100) NOT NULL,
          details TEXT,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created activity_logs table');
    }

    // User Profiles table
    if (!existingTables.includes('user_profiles')) {
      await client.query(`
        CREATE TABLE user_profiles (
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
      console.log('✅ Created user_profiles table');
    }

    // Password Reset Tokens table
    if (!existingTables.includes('password_reset_tokens')) {
      await client.query(`
        CREATE TABLE password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created password_reset_tokens table');
    }

    // Create indexes
    console.log('🔍 Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_openai_assistant_id ON users(openai_assistant_id);
      CREATE INDEX IF NOT EXISTS idx_openai_assistants_user_id ON openai_assistants(user_id);
      CREATE INDEX IF NOT EXISTS idx_openai_assistants_assistant_id ON openai_assistants(assistant_id);
      CREATE INDEX IF NOT EXISTS idx_vector_stores_user_id ON vector_stores(user_id);
      CREATE INDEX IF NOT EXISTS idx_vector_stores_store_id ON vector_stores(store_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_thread_id ON conversations(thread_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
    `);
    console.log('✅ Indexes created/verified');

    // Check final state
    const finalTablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    const finalTables = finalTablesResult.rows.map(row => row.table_name);
    console.log('📋 Final tables in database:', finalTables);
    
    const stillMissing = requiredTables.filter(table => !finalTables.includes(table));
    if (stillMissing.length === 0) {
      console.log('🎉 Database migration completed successfully!');
      console.log('✅ All required tables are now present');
    } else {
      console.log('⚠️  Some tables are still missing:', stillMissing);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrateDatabase()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }); 