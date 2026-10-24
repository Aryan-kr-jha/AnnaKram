// db.js - Centralized PostgreSQL Connection Pool for AnnaKram iPDS
const { Pool } = require('pg');
require('dotenv').config();

// Resolve connection string from environment variables with fallback
const connectionString = process.env.DATABASE_URL || '';

if (!connectionString) {
  console.warn('[WARN] DATABASE_URL is not defined in the environment. Database operations may fail.');
}

// Check if connection is targetting a remote cloud database (e.g. Supabase) or local
const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

// Create hardened PostgreSQL connection pool
const pool = new Pool({
  connectionString,
  // Supabase cloud connections require SSL; allow local connections without SSL
  ssl: isLocalhost
    ? false
    : {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' // defaults to false for cloud poolers
      },
  max: parseInt(process.env.DB_POOL_MAX || '20', 10), // Max concurrent connections
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10), // Close idle clients after 30s
  connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT_MS || '10000', 10) // Timeout connection attempts after 10s
});

// Pool lifecycle logging
pool.on('connect', () => {
  console.log('[DB] New client connected securely to PostgreSQL database.');
});

// Handle idle client errors without abruptly killing the entire Node.js server process
pool.on('error', (err) => {
  console.error('[DB ERROR] Unexpected error on idle PostgreSQL client:', err.message);
  // Do not process.exit(-1); pool will discard bad client and create new ones on demand
});

/**
 * Execute query using the pool with standard logging
 */
const query = (text, params) => pool.query(text, params);

/**
 * Graceful pool shutdown helper for zero-downtime server termination
 */
const closePool = async () => {
  console.log('[DB] Closing database connection pool...');
  await pool.end();
  console.log('[DB] Database connection pool closed.');
};

module.exports = {
  query,
  pool,
  closePool
};