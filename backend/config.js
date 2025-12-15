/**
 * Configuration constants for the price caching service
 */
export const CONFIG = {
  // Cache TTL settings
  TTL_MIN: 300,           // 5 minutes minimum TTL (seconds)
  TTL_MAX: 600,           // 10 minutes maximum TTL (seconds)
  REFRESH_THRESHOLD: 60,  // Refresh when this many seconds left (seconds)
  
  // Scheduler settings
  SCHEDULER_INTERVAL: 30, // Check cache every 30 seconds
  SEED_ON_STARTUP: true,  // Populate cache immediately on server start
  
  // Rate limiting
  POLYGON_RATE_LIMIT: 5,  // Polygon.io: 5 calls per minute
  RATE_LIMIT_WINDOW: 60,  // Rate limit window in seconds
  
  // Exponential backoff settings
  MAX_RETRIES: 5,         // Number of retry attempts
  BASE_DELAY: 16000,      // 16s base delay for exponential backoff (ms)
  
  // Server settings
  PORT: process.env.PORT || 3001,
  
  // API Keys (from environment variables)
  POLYGON_API_KEY: process.env.POLYGON_API_KEY || '',
};

