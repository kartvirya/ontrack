const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Migration script to transfer data from SQLite to PostgreSQL
console.log('🔄 Lisa AI - SQLite to PostgreSQL Migration');
console.log('===============================================');

// SQLite database path
const SQLITE_PATH = path.join(__dirname, '..', 'database.sqlite');

// PostgreSQL connection
const pgPool = new Pool({
  user: process.env.DB_USER || 'lisa_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'lisa_db',
  password: process.env.DB_PASSWORD || 'lisa_password',
  port: process.env.DB_PORT || 5432,
});

// Check if SQLite database exists
if (!fs.existsSync(SQLITE_PATH)) {
  console.log('❌ SQLite database not found at:', SQLITE_PATH);
  console.log('Please ensure your SQLite database exists before running migration.');
  process.exit(1);
}

// Open SQLite database
const sqliteDb = new sqlite3.Database(SQLITE_PATH, (err) => {
  if (err) {
    console.error('❌ Error opening SQLite database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// Helper function to get all data from a SQLite table
function getSQLiteData(tableName) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
      if (err) {
        if (err.message.includes('no such table')) {
          console.log(`⚠️  Table ${tableName} doesn't exist in SQLite, skipping...`);
          resolve([]);
        } else {
          reject(err);
        }
      } else {
        resolve(rows);
      }
    });
  });
}

// Helper function to insert data into PostgreSQL
async function insertPostgreSQLData(tableName, data, mapping) {
  if (data.length === 0) {
    console.log(`ℹ️  No data to migrate for table: ${tableName}`);
    return;
  }

  const client = await pgPool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const row of data) {
      const columns = Object.keys(mapping);
      const values = columns.map((col, index) => `$${index + 1}`);
      const params = columns.map(col => {
        const sqliteCol = mapping[col];
        let value = row[sqliteCol];
        
        // Handle data type conversions
        if (value === null || value === undefined) {
          return null;
        }
        
        // Convert SQLite datetime strings to proper timestamps
        if (sqliteCol.includes('_at') || sqliteCol.includes('login') || sqliteCol.includes('expiry')) {
          if (typeof value === 'string') {
            const date = new Date(value);
            return isNaN(date.getTime()) ? null : date.toISOString();
          }
        }
        
        // Convert SQLite boolean integers to PostgreSQL booleans
        if (typeof value === 'number' && (value === 0 || value === 1)) {
          if (sqliteCol.includes('enabled') || sqliteCol.includes('status') || 
              sqliteCol.includes('read') || sqliteCol.includes('used') || 
              sqliteCol.includes('collapsed') || sqliteCol.includes('timestamps') || 
              sqliteCol.includes('mode') || sqliteCol.includes('public') ||
              sqliteCol.includes('notifications') || sqliteCol.includes('save')) {
            return value === 1;
          }
        }
        
        return value;
      });
      
      const sql = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${values.join(', ')})
        ON CONFLICT DO NOTHING
      `;
      
      try {
        await client.query(sql, params);
      } catch (insertError) {
        console.log(`⚠️  Error inserting row into ${tableName}:`, insertError.message);
        console.log('Row data:', row);
      }
    }
    
    await client.query('COMMIT');
    console.log(`✅ Migrated ${data.length} rows to ${tableName}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Error migrating ${tableName}:`, error.message);
  } finally {
    client.release();
  }
}

// Table mappings (PostgreSQL column -> SQLite column)
const tableMappings = {
  users: {
    id: 'id',
    username: 'username',
    email: 'email',
    password_hash: 'password_hash',
    role: 'role',
    status: 'status',
    openai_assistant_id: 'openai_assistant_id',
    vector_store_id: 'vector_store_id',
    reset_token: 'reset_token',
    reset_token_expiry: 'reset_token_expiry',
    created_at: 'created_at',
    updated_at: 'updated_at',
    last_login: 'last_login'
  },
  
  user_profiles: {
    id: 'id',
    user_id: 'user_id',
    first_name: 'first_name',
    last_name: 'last_name',
    phone: 'phone',
    department: 'department',
    job_title: 'job_title',
    bio: 'bio',
    avatar_url: 'avatar_url',
    timezone: 'timezone',
    language: 'language',
    date_format: 'date_format',
    created_at: 'created_at',
    updated_at: 'updated_at'
  },
  
  user_settings: {
    id: 'id',
    user_id: 'user_id',
    theme: 'theme',
    chat_sound_enabled: 'chat_sound_enabled',
    email_notifications: 'email_notifications',
    push_notifications: 'push_notifications',
    auto_save_conversations: 'auto_save_conversations',
    conversation_retention_days: 'conversation_retention_days',
    default_assistant_model: 'default_assistant_model',
    sidebar_collapsed: 'sidebar_collapsed',
    show_timestamps: 'show_timestamps',
    compact_mode: 'compact_mode',
    created_at: 'created_at',
    updated_at: 'updated_at'
  },
  
  conversations: {
    id: 'id',
    user_id: 'user_id',
    thread_id: 'thread_id',
    title: 'title',
    message_count: 'message_count',
    created_at: 'created_at',
    updated_at: 'updated_at'
  },
  
  conversation_messages: {
    id: 'id',
    conversation_id: 'conversation_id',
    role: 'role',
    content: 'content',
    train_part_data: 'train_part_data',
    assistant_type: 'assistant_type',
    created_at: 'created_at'
  },
  
  openai_assistants: {
    id: 'id',
    user_id: 'user_id',
    assistant_id: 'assistant_id',
    assistant_name: 'assistant_name',
    instructions: 'instructions',
    model: 'model',
    vector_store_id: 'vector_store_id',
    created_at: 'created_at',
    updated_at: 'updated_at'
  },
  
  vector_stores: {
    id: 'id',
    user_id: 'user_id',
    store_id: 'store_id',
    store_name: 'store_name',
    description: 'description',
    file_count: 'file_count',
    created_at: 'created_at',
    updated_at: 'updated_at'
  },
  
  user_sessions: {
    id: 'id',
    user_id: 'user_id',
    session_token: 'session_token',
    thread_id: 'thread_id',
    expires_at: 'expires_at',
    created_at: 'created_at'
  },
  
  activity_logs: {
    id: 'id',
    user_id: 'user_id',
    action: 'action',
    details: 'details',
    ip_address: 'ip_address',
    user_agent: 'user_agent',
    created_at: 'created_at'
  },
  
  notifications: {
    id: 'id',
    user_id: 'user_id',
    title: 'title',
    message: 'message',
    type: 'type',
    read_status: 'read_status',
    action_url: 'action_url',
    expires_at: 'expires_at',
    created_at: 'created_at'
  },
  
  system_settings: {
    id: 'id',
    setting_key: 'setting_key',
    setting_value: 'setting_value',
    setting_type: 'setting_type',
    description: 'description',
    category: 'category',
    is_public: 'is_public',
    created_at: 'created_at',
    updated_at: 'updated_at'
  },
  
  password_reset_tokens: {
    id: 'id',
    user_id: 'user_id',
    token: 'token',
    expires_at: 'expires_at',
    used: 'used',
    created_at: 'created_at'
  }
};

// Main migration function
async function migrate() {
  try {
    console.log('🔍 Starting migration process...');
    
    // Test PostgreSQL connection
    const pgClient = await pgPool.connect();
    console.log('✅ Connected to PostgreSQL database');
    pgClient.release();
    
    // Migrate each table
    for (const [tableName, mapping] of Object.entries(tableMappings)) {
      console.log(`\n📊 Migrating table: ${tableName}`);
      
      try {
        const sqliteData = await getSQLiteData(tableName);
        await insertPostgreSQLData(tableName, sqliteData, mapping);
      } catch (error) {
        console.error(`❌ Error migrating ${tableName}:`, error.message);
      }
    }
    
    console.log('\n🎉 Migration completed!');
    console.log('\nNext steps:');
    console.log('1. Verify your data in PostgreSQL');
    console.log('2. Update your .env file to use PostgreSQL');
    console.log('3. Test the application thoroughly');
    console.log('4. Backup your SQLite database before removing it');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // Close connections
    sqliteDb.close();
    await pgPool.end();
  }
}

// Run migration
if (require.main === module) {
  migrate();
}

module.exports = { migrate }; 