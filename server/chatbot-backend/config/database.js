const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'lisa_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
  // Connection pool settings
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // how long to wait when connecting a new client
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client:', err);
  process.exit(-1);
});

// Database query helper function
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Get a client from the pool for transactions
const getClient = async () => {
  return await pool.connect();
};

// Close all connections in the pool
const closePool = async () => {
  await pool.end();
};

module.exports = {
  pool,
  query,
  getClient,
  closePool,
  dbConfig
}; 