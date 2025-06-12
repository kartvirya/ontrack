const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');

// Create database and tables
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('📁 Connected to SQLite database');
});

// Create tables
const createTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'user',
          status VARCHAR(20) DEFAULT 'active',
          openai_assistant_id VARCHAR(100),
          vector_store_id VARCHAR(100),
          reset_token VARCHAR(255),
          reset_token_expiry DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME
        )
      `, (err) => {
        if (err) {
          console.error('Error creating users table:', err.message);
          reject(err);
        } else {
          console.log('✅ Users table created/verified');
        }
      });

      // OpenAI Assistants table
      db.run(`
        CREATE TABLE IF NOT EXISTS openai_assistants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          assistant_id VARCHAR(100) UNIQUE NOT NULL,
          assistant_name VARCHAR(100) NOT NULL,
          instructions TEXT,
          model VARCHAR(50) DEFAULT 'gpt-4-1106-preview',
          vector_store_id VARCHAR(100),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating assistants table:', err.message);
          reject(err);
        } else {
          console.log('✅ OpenAI Assistants table created/verified');
        }
      });

      // Vector Stores table
      db.run(`
        CREATE TABLE IF NOT EXISTS vector_stores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          store_id VARCHAR(100) UNIQUE NOT NULL,
          store_name VARCHAR(100) NOT NULL,
          description TEXT,
          file_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating vector_stores table:', err.message);
          reject(err);
        } else {
          console.log('✅ Vector Stores table created/verified');
        }
      });

      // Conversations table
      db.run(`
        CREATE TABLE IF NOT EXISTS conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          thread_id VARCHAR(100) NOT NULL,
          title VARCHAR(255),
          message_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE(user_id, thread_id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating conversations table:', err.message);
          reject(err);
        } else {
          console.log('✅ Conversations table created/verified');
        }
      });

      // Conversation Messages table
      db.run(`
        CREATE TABLE IF NOT EXISTS conversation_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id INTEGER NOT NULL,
          role VARCHAR(20) NOT NULL,
          content TEXT NOT NULL,
          train_part_data TEXT,
          assistant_type VARCHAR(20),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating conversation_messages table:', err.message);
          reject(err);
        } else {
          console.log('✅ Conversation Messages table created/verified');
        }
      });

      // User Sessions table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          session_token VARCHAR(255) UNIQUE NOT NULL,
          thread_id VARCHAR(100),
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating sessions table:', err.message);
          reject(err);
        } else {
          console.log('✅ User Sessions table created/verified');
        }
      });

      // Activity Logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action VARCHAR(100) NOT NULL,
          details TEXT,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
        )
      `, (err) => {
        if (err) {
          console.error('Error creating activity_logs table:', err.message);
          reject(err);
        } else {
          console.log('✅ Activity Logs table created/verified');
        }
      });

      // User Profiles table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE NOT NULL,
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating user_profiles table:', err.message);
          reject(err);
        } else {
          console.log('✅ User Profiles table created/verified');
        }
      });

      // User Settings table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE NOT NULL,
          theme VARCHAR(20) DEFAULT 'light',
          chat_sound_enabled BOOLEAN DEFAULT 1,
          email_notifications BOOLEAN DEFAULT 1,
          push_notifications BOOLEAN DEFAULT 1,
          auto_save_conversations BOOLEAN DEFAULT 1,
          conversation_retention_days INTEGER DEFAULT 365,
          default_assistant_model VARCHAR(50) DEFAULT 'gpt-4-1106-preview',
          sidebar_collapsed BOOLEAN DEFAULT 0,
          show_timestamps BOOLEAN DEFAULT 1,
          compact_mode BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating user_settings table:', err.message);
          reject(err);
        } else {
          console.log('✅ User Settings table created/verified');
        }
      });

      // Notifications table
      db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'info',
          read_status BOOLEAN DEFAULT 0,
          action_url VARCHAR(255),
          expires_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating notifications table:', err.message);
          reject(err);
        } else {
          console.log('✅ Notifications table created/verified');
        }
      });

      // System Settings table
      db.run(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          setting_key VARCHAR(100) UNIQUE NOT NULL,
          setting_value TEXT,
          setting_type VARCHAR(20) DEFAULT 'string',
          description TEXT,
          category VARCHAR(50) DEFAULT 'general',
          is_public BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating system_settings table:', err.message);
          reject(err);
        } else {
          console.log('✅ System Settings table created/verified');
        }
      });

      // Password Reset Tokens table
      db.run(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token VARCHAR(255) UNIQUE NOT NULL,
          expires_at DATETIME NOT NULL,
          used BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating password_reset_tokens table:', err.message);
          reject(err);
        } else {
          console.log('✅ Password Reset Tokens table created/verified');
          resolve();
        }
      });
    });
  });
};

// Create default admin user
const createAdminUser = async () => {
  return new Promise((resolve, reject) => {
    const adminPassword = 'admin123'; // Change this in production!
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    
    db.run(`
      INSERT OR IGNORE INTO users (username, email, password_hash, role, status)
      VALUES (?, ?, ?, ?, ?)
    `, ['admin', 'admin@ontrack.com', hashedPassword, 'admin', 'active'], function(err) {
      if (err) {
        console.error('Error creating admin user:', err.message);
        reject(err);
      } else {
        if (this.changes > 0) {
          console.log('👤 Default admin user created');
          console.log('   Username: admin');
          console.log('   Password: admin123');
          console.log('   ⚠️  Please change the password after first login!');
        } else {
          console.log('👤 Admin user already exists');
        }
        resolve();
      }
    });
  });
};

// Main initialization function
const initializeDatabase = async () => {
  try {
    console.log('🚀 Initializing OnTrack Database...');
    await createTables();
    await createAdminUser();
    console.log('✅ Database initialization complete!');
    
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('📁 Database connection closed');
      }
    });
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

// Run initialization
initializeDatabase(); 