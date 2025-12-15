/**
 * In-memory cache with TTL and randomized expiration
 */
import { CONFIG } from './config.js';

class Cache {
  constructor() {
    this.store = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
    };
  }

  /**
   * Generate random TTL between TTL_MIN and TTL_MAX
   * @returns {number} TTL in milliseconds
   */
  _getRandomTTL() {
    const minMs = CONFIG.TTL_MIN * 1000;
    const maxMs = CONFIG.TTL_MAX * 1000;
    const randomMs = minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
    return randomMs;
  }

  /**
   * Store a value in cache with randomized TTL
   * @param {string} key - Cache key
   * @param {*} value - Value to store
   * @returns {void}
   */
  set(key, value) {
    const ttlMs = this._getRandomTTL();
    const expiresAt = Date.now() + ttlMs;
    
    this.store.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
    });
    
    this.stats.sets++;
    
    console.log(`[Cache] SET ${key}, TTL: ${Math.round(ttlMs / 1000)}s, expires: ${new Date(expiresAt).toISOString()}`);
  }

  /**
   * Get a value from cache (returns null if expired or not found)
   * @param {string} key - Cache key
   * @returns {*} Cached value or null
   */
  get(key) {
    const entry = this.store.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.stats.misses++;
      console.log(`[Cache] MISS ${key} (expired)`);
      return null;
    }
    
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Get raw cache entry (even if expired) - useful for stale cache fallback
   * @param {string} key - Cache key
   * @returns {Object|null} Raw cache entry with value, expiresAt, createdAt
   */
  getRaw(key) {
    return this.store.get(key) || null;
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.store.get(key);
    if (!entry) return false;
    return Date.now() <= entry.expiresAt;
  }

  /**
   * Get all cache entries (for scheduler to check TTLs)
   * @returns {Array} Array of [key, entry] pairs
   */
  entries() {
    return Array.from(this.store.entries());
  }

  /**
   * Get remaining TTL for a key in milliseconds
   * @param {string} key - Cache key
   * @returns {number} Remaining TTL in ms (0 if expired/missing)
   */
  getRemainingTTL(key) {
    const entry = this.store.get(key);
    if (!entry) return 0;
    
    const remaining = entry.expiresAt - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   * @returns {boolean} True if deleted
   */
  delete(key) {
    return this.store.delete(key);
  }

  /**
   * Clear all cache entries
   * @returns {void}
   */
  clear() {
    this.store.clear();
    console.log('[Cache] Cleared all entries');
  }

  /**
   * Get cache statistics and current state
   * @returns {Object} Stats object
   */
  getStats() {
    const entries = [];
    const now = Date.now();
    
    for (const [key, entry] of this.store.entries()) {
      const age = Math.round((now - entry.createdAt) / 1000);
      const ttl = Math.max(0, Math.round((entry.expiresAt - now) / 1000));
      const expired = now > entry.expiresAt;
      
      entries.push({
        key,
        age,
        ttl,
        expired,
        expiresAt: new Date(entry.expiresAt).toISOString(),
      });
    }
    
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    
    return {
      size: this.store.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      hitRate: Math.round(hitRate * 100) / 100,
      entries: entries.sort((a, b) => a.key.localeCompare(b.key)),
    };
  }
}

// Export singleton instance
export const cache = new Cache();

