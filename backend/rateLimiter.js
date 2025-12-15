/**
 * Rate limiter with sliding window counter
 */
import { CONFIG } from './config.js';

class RateLimiter {
  constructor() {
    // Map of API name -> array of timestamps
    this.requests = new Map();
  }

  /**
   * Clean up old requests outside the rate limit window
   * @param {string} apiName - API identifier (e.g., 'polygon', 'coingecko')
   * @returns {void}
   */
  _cleanup(apiName) {
    const now = Date.now();
    const windowMs = CONFIG.RATE_LIMIT_WINDOW * 1000;
    
    if (!this.requests.has(apiName)) {
      this.requests.set(apiName, []);
      return;
    }
    
    const timestamps = this.requests.get(apiName);
    const validTimestamps = timestamps.filter(ts => now - ts < windowMs);
    this.requests.set(apiName, validTimestamps);
  }

  /**
   * Check if we can make another request to this API
   * @param {string} apiName - API identifier
   * @param {number} limit - Rate limit (default: Polygon limit)
   * @returns {boolean} True if request is allowed
   */
  canMakeRequest(apiName, limit = CONFIG.POLYGON_RATE_LIMIT) {
    this._cleanup(apiName);
    
    const timestamps = this.requests.get(apiName) || [];
    return timestamps.length < limit;
  }

  /**
   * Record that a request was made to this API
   * @param {string} apiName - API identifier
   * @returns {void}
   */
  recordRequest(apiName) {
    this._cleanup(apiName);
    
    const timestamps = this.requests.get(apiName) || [];
    timestamps.push(Date.now());
    this.requests.set(apiName, timestamps);
  }

  /**
   * Get current usage for an API
   * @param {string} apiName - API identifier
   * @param {number} limit - Rate limit
   * @returns {Object} Usage stats
   */
  getUsage(apiName, limit = CONFIG.POLYGON_RATE_LIMIT) {
    this._cleanup(apiName);
    
    const timestamps = this.requests.get(apiName) || [];
    const now = Date.now();
    const windowMs = CONFIG.RATE_LIMIT_WINDOW * 1000;
    const oldestTimestamp = timestamps.length > 0 ? Math.min(...timestamps) : now;
    const resetIn = Math.max(0, Math.ceil((windowMs - (now - oldestTimestamp)) / 1000));
    
    return {
      used: timestamps.length,
      limit,
      remaining: Math.max(0, limit - timestamps.length),
      resetIn,
    };
  }

  /**
   * Reset all rate limit counters (useful for testing)
   * @returns {void}
   */
  reset() {
    this.requests.clear();
    console.log('[RateLimiter] Reset all counters');
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

