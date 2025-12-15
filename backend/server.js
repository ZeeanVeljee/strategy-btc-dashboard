/**
 * Express server for price caching service
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { CONFIG } from './config.js';
import { cache } from './cache.js';
import { rateLimiter } from './rateLimiter.js';
import { fetchAllPrices } from './priceService.js';
import { startScheduler, getSchedulerStatus } from './scheduler.js';

// Load environment variables
dotenv.config();

// Update config with env vars
CONFIG.POLYGON_API_KEY = process.env.POLYGON_API_KEY || CONFIG.POLYGON_API_KEY;
CONFIG.PORT = process.env.PORT || CONFIG.PORT;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * GET /api/prices/all
 * Returns all prices (BTC, MSTR, stocks, EUR/USD)
 * Query params:
 *   - force=true: Bypass cache and force fresh fetch
 */
app.get('/api/prices/all', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    if (force) cache.clear();
    
    const results = await fetchAllPrices();
    
    // Build metadata
    const metadata = {
      cached: results.cached,
      partial: results.partial,
      stale: results.stale,
      degraded: results.errors.length > 3,
      timestamp: new Date().toISOString(),
      ttls: {},
    };
    
    // Add TTL info for each price
    for (const key of Object.keys(results.data)) {
      const ttl = Math.round(cache.getRemainingTTL(key) / 1000);
      metadata.ttls[key] = ttl;
    }
    
    // Determine status code
    let statusCode = 200;
    if (results.partial && results.errors.length > 0) {
      statusCode = 207; // Multi-Status (partial success)
    }
    
    res.status(statusCode).json({
      data: results.data,
      metadata,
      errors: results.errors,
      successes: results.successes,
    });
  } catch (error) {
    console.error('[API] Error fetching prices:', error);
    res.status(503).json({
      error: 'Service unavailable',
      message: error.message,
      retryAfter: 60,
    });
  }
});

/**
 * GET /api/health
 * Returns cache statistics and system health
 */
app.get('/api/health', (req, res) => {
  const cacheStats = cache.getStats();
  const polygonUsage = rateLimiter.getUsage('polygon');
  const schedulerStatus = getSchedulerStatus();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    cache: cacheStats,
    rateLimits: {
      polygon: polygonUsage,
    },
    scheduler: schedulerStatus,
  });
});

/**
 * GET /api/ping
 * Simple ping endpoint for connectivity checks
 */
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[API] Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
const startServer = async () => {
  try {
    // Start background scheduler first
    await startScheduler();
    
    // Then start HTTP server
    app.listen(CONFIG.PORT, () => {
      console.log(`\n🚀 Price Caching Service running on port ${CONFIG.PORT}`);
      console.log(`📊 Cache TTL: ${CONFIG.TTL_MIN}-${CONFIG.TTL_MAX}s (randomized)`);
      console.log(`🔄 Scheduler: Every ${CONFIG.SCHEDULER_INTERVAL}s`);
      console.log(`⏱️  Backoff: ${CONFIG.BASE_DELAY / 1000}s base, ${CONFIG.MAX_RETRIES} retries`);
      console.log(`\nEndpoints:`);
      console.log(`  GET http://localhost:${CONFIG.PORT}/api/prices/all`);
      console.log(`  GET http://localhost:${CONFIG.PORT}/api/health`);
      console.log(`  GET http://localhost:${CONFIG.PORT}/api/ping`);
      console.log();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[Server] SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n[Server] SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

