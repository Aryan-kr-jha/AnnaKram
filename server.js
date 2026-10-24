// server.js - Application Entry Point for AnnaKram iPDS Portal
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { closePool } = require('./db');
const { createClient } = require('@supabase/supabase-js');
const batchRoutes = require('./routes/batchRoutes');
const dispatchRoutes = require('./routes/dispatchRoutes');
const reportRoutes = require('./routes/reportRoutes');
const requisitionRoutes = require('./routes/requisitionRoutes');

const app = express();

// Dynamically resolve port from process.env with fallback to 9765 (matching frontend API_BASE)
const PORT = parseInt(process.env.PORT || '9765', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize Supabase Backend Client (for token verification)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ehqztjogzwevtugixynv.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

let supabaseServerClient = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabaseServerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[AUTH] Supabase backend client initialized.');
  } catch (err) {
    console.warn('[AUTH WARN] Could not initialize Supabase backend client:', err.message);
  }
}

// Standard Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Optional Supabase Bearer Token Verification Middleware
 * Verifies Authorization: Bearer <token> if provided and attaches user to req.user.
 * Does not block requests if header is omitted or token fails, preserving full local testing compatibility.
 */
const optionalSupabaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token && supabaseServerClient) {
        const { data, error } = await supabaseServerClient.auth.getUser(token);
        if (!error && data?.user) {
          req.user = data.user;
        }
      }
    }
  } catch (err) {
    // Non-blocking warning so local API testing is never disrupted
    if (NODE_ENV === 'development') {
      console.warn('[AUTH] Optional token verification notice:', err.message);
    }
  }
  next();
};

app.use(optionalSupabaseAuth);

// Serve frontend static files from 'public' directory
app.use(express.static('public'));

// Public Auth Configuration Endpoint for Frontend Vanilla JS Client
app.get('/api/auth/config', (req, res) => {
  res.status(200).json({
    success: true,
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY
  });
});

// Health-check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'AnnaKram iPDS Backend',
    timestamp: new Date().toISOString(),
    authEnabled: Boolean(supabaseServerClient)
  });
});

// Mount Feature Routes
app.use('/api/batches', batchRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/requests', requisitionRoutes);

// Catch-all 404 Handler for Unmatched API Endpoints
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: `Endpoint not found: ${req.method} ${req.originalUrl}`
    });
  }
  next();
});

// Global Centralized Error Handling Middleware
// Express recognizes this as an error handler because it takes exactly 4 parameters: (err, req, res, next)
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[ERROR] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}:`, err.stack || err);

  res.status(status).json({
    success: false,
    error: message,
    ...(NODE_ENV === 'development' && { details: err.detail || err.hint })
  });
});

// Start HTTP Server
const server = app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` AnnaKram iPDS FIFO Stock Management Server `);
  console.log(` Port: ${PORT} | Environment: ${NODE_ENV}  `);
  console.log(`=========================================`);
});

// Graceful Process-Level Error & Termination Handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Promise Rejection at:', promise, 'reason:', reason);
  // Keep process alive; log for diagnostic monitoring
});

process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception thrown:', err);
  // In production, log and perform graceful cleanup if non-recoverable
});

const gracefulShutdown = (signal) => {
  console.log(`\n[SHUTDOWN] Received ${signal}. Closing HTTP server and database pool...`);
  server.close(async () => {
    console.log('[SHUTDOWN] HTTP server closed.');
    try {
      await closePool();
    } catch (e) {
      console.error('[SHUTDOWN ERROR] Error while closing pool:', e);
    }
    process.exit(0);
  });

  // Force exit if shutdown hangs beyond 5 seconds
  setTimeout(() => {
    console.error('[SHUTDOWN] Forced shutdown after timeout.');
    process.exit(1);
  }, 5000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { app, server };