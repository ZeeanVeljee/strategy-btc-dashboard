/**
 * Background scheduler for proactive cache refresh
 * Keeps cache perpetually warm so client requests never wait
 */
import { CONFIG } from './config.js';
import { cache } from './cache.js';
import { fetchAndCachePrice, fetchAllPrices } from './priceService.js';

let schedulerInterval = null;

/**
 * Seed cache with all prices on server startup
 * @returns {Promise<void>}
 */
async function seedCache() {
  console.log('[Scheduler] Seeding cache on startup...');
  
  try {
    const results = await fetchAllPrices();
    console.log(`[Scheduler] Cache seeded: ${results.successes.length} successes, ${results.errors.length} errors`);
    
    if (results.errors.length > 0) {
      console.warn('[Scheduler] Seed errors:', results.errors);
    }
  } catch (error) {
    console.error('[Scheduler] Failed to seed cache:', error.message);
  }
}

/**
 * Check all cache entries and refresh those approaching expiration
 * @returns {Promise<void>}
 */
async function checkAndRefresh() {
  const now = Date.now();
  const thresholdMs = CONFIG.REFRESH_THRESHOLD * 1000;
  
  const entries = cache.entries();
  
  if (entries.length === 0) {
    console.log('[Scheduler] Cache is empty, seeding...');
    await seedCache();
    return;
  }
  
  const toRefresh = [];
  
  for (const [key, entry] of entries) {
    const remainingTTL = entry.expiresAt - now;
    
    if (remainingTTL < thresholdMs) {
      const ttlSec = Math.round(remainingTTL / 1000);
      console.log(`[Scheduler] Refreshing ${key} (TTL: ${ttlSec}s remaining)`);
      toRefresh.push(key);
    }
  }
  
  if (toRefresh.length > 0) {
    const refreshPromises = toRefresh.map(key => 
      fetchAndCachePrice(key).catch(err => {
        console.error(`[Scheduler] Failed to refresh ${key}:`, err.message);
      })
    );
    
    await Promise.all(refreshPromises);
    console.log(`[Scheduler] Refreshed ${toRefresh.length} cache entries`);
  }
}

/**
 * Start the background scheduler
 * Seeds cache immediately, then checks every SCHEDULER_INTERVAL seconds
 * @returns {Promise<void>}
 */
export async function startScheduler() {
  console.log(`[Scheduler] Starting background scheduler (interval: ${CONFIG.SCHEDULER_INTERVAL}s)`);
  
  if (CONFIG.SEED_ON_STARTUP) {
    seedCache().catch(err => {
      console.error('[Scheduler] Cache seed failed:', err.message);
    });
  }
  
  schedulerInterval = setInterval(async () => {
    try {
      await checkAndRefresh();
    } catch (error) {
      console.error('[Scheduler] Error in scheduled check:', error.message);
    }
  }, CONFIG.SCHEDULER_INTERVAL * 1000);
  
  console.log('[Scheduler] Background scheduler running');
}

/**
 * Stop the background scheduler (useful for testing/cleanup)
 * @returns {void}
 */
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Scheduler] Stopped background scheduler');
  }
}

/**
 * Get scheduler status
 * @returns {Object} Status information
 */
export function getSchedulerStatus() {
  return {
    running: schedulerInterval !== null,
    interval: CONFIG.SCHEDULER_INTERVAL,
    seedOnStartup: CONFIG.SEED_ON_STARTUP,
    refreshThreshold: CONFIG.REFRESH_THRESHOLD,
  };
}

