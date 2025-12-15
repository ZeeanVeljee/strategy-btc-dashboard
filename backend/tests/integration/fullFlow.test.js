import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cache } from '../../cache.js';
import { rateLimiter } from '../../rateLimiter.js';
import { fetchAllPrices, fetchAndCachePrice } from '../../priceService.js';
import { startScheduler, stopScheduler } from '../../scheduler.js';

// Mock external APIs
global.fetch = vi.fn();

describe('Full Flow Integration Tests', () => {
  beforeEach(() => {
    cache.clear();
    rateLimiter.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    stopScheduler();
    vi.restoreAllMocks();
  });

  it('should handle complete flow: cold start -> cache -> client requests', async () => {
    // Mock all external API responses
    global.fetch.mockImplementation((url) => {
      if (url.includes('coingecko')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ bitcoin: { usd: 100000 } }),
        });
      }
      if (url.includes('exchangerate')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ rates: { USD: 1.08 } }),
        });
      }
      if (url.includes('polygon.io')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: 'OK',
            results: [{ c: 420, h: 425, l: 415, v: 1000000 }],
          }),
        });
      }
      return Promise.reject(new Error('Unknown API'));
    });

    // Cold start - cache is empty
    expect(cache.getStats().size).toBe(0);

    // First request - should fetch all prices
    const result1 = await fetchAllPrices();
    
    expect(result1.successes.length).toBeGreaterThan(0);
    expect(cache.getStats().size).toBeGreaterThan(0);

    // Second request - should hit cache
    const result2 = await fetchAllPrices();
    
    expect(result2.cached).toBe(true);
    expect(result2.successes.length).toBeGreaterThan(0);
  }, 20000); // Longer timeout for full flow

  it('should handle background refresh preventing expiry', async () => {
    // Mock APIs
    let fetchCount = 0;
    global.fetch.mockImplementation((url) => {
      fetchCount++;
      if (url.includes('coingecko')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ bitcoin: { usd: 100000 + fetchCount * 1000 } }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ status: 'OK', results: [{ c: 420, h: 425, l: 415, v: 1000 }] }),
      });
    });

    // Set initial price
    await fetchAndCachePrice('btc');
    const initialPrice = cache.get('btc');
    expect(initialPrice).toBe(101000); // 100000 + 1000

    // Simulate time passing close to expiry
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    
    cache.set('btc', initialPrice);
    
    // Fast forward to near expiry (50s remaining)
    vi.spyOn(Date, 'now').mockReturnValue(now + 550000);
    
    // Background refresh should kick in
    await fetchAndCachePrice('btc');
    
    const refreshedPrice = cache.get('btc');
    expect(refreshedPrice).toBeGreaterThan(initialPrice); // Price updated
  }, 15000);

  it('should handle multiple concurrent client requests efficiently', async () => {
    // Mock API to track call count
    let apiCallCount = 0;
    global.fetch.mockImplementation(() => {
      apiCallCount++;
      return Promise.resolve({
        ok: true,
        json: async () => ({ bitcoin: { usd: 100000 } }),
      });
    });

    // Make 10 concurrent requests
    const promises = Array(10).fill(null).map(() => fetchAndCachePrice('btc'));
    
    await Promise.all(promises);

    // First request fetches, others hit cache
    // Should not make 10 API calls
    expect(apiCallCount).toBeLessThan(10);
    expect(cache.get('btc')).toBe(100000);
  }, 10000);

  it('should handle rate limit scenario with exponential backoff', async () => {
    let attempts = 0;
    
    global.fetch.mockImplementation(() => {
      attempts++;
      if (attempts < 2) {
        // First attempt fails with 429
        return Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        });
      }
      // Second attempt succeeds
      return Promise.resolve({
        ok: true,
        json: async () => ({
          status: 'OK',
          results: [{ c: 420, h: 425, l: 415, v: 1000000 }],
        }),
      });
    });

    const result = await fetchAndCachePrice('MSTR');

    expect(attempts).toBe(2);
    expect(result.success).toBe(true);
    expect(cache.get('MSTR')).toBeDefined();
  }, 20000); // Longer timeout for backoff

  it('should gracefully degrade when APIs are down', async () => {
    // Pre-populate cache
    cache.set('btc', 95000);
    
    // Simulate time passing (cache becomes stale)
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 700000);

    // Mock all APIs to fail
    global.fetch.mockRejectedValue(new Error('Network error'));

    // Should return stale cache
    const result = await fetchAndCachePrice('btc');

    expect(result.success).toBe(false);
    expect(result.stale).toBe(true);
    expect(result.value).toBe(95000); // Stale value returned
  }, 30000); // Very long timeout for multiple retries
});

