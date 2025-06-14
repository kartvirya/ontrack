const { initializeDatabase } = require('./scripts/init-production-db');

async function initServer() {
  // Only initialize database in production environment
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    console.log('Production environment detected. Initializing database...');
    try {
      await initializeDatabase();
      console.log('✅ Database initialization completed');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      // Don't exit the process, let the server start anyway
      // The database might already be initialized
    }
  } else {
    console.log('Development environment or no DATABASE_URL - skipping database initialization');
  }
  
  // Start the main server
  require('./server');
}

initServer().catch(error => {
  console.error('Server initialization failed:', error);
  process.exit(1);
}); 