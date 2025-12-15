import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fetchAndCachePrice } from '../../priceService.js';
import { cache } from '../../cache.js';
import { rateLimiter } from '../../rateLimiter.js';

// Mock fetch globally
global.fetch = vi.fn();

// Mock sleep to speed up tests (but still simulate delays)
vi.mock('../../priceService.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // Override sleep to be faster in tests
  };
});

describe('PriceService', () => {
  beforeEach(() => {
    cache.clear();
    rateLimiter.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchAndCachePrice - BTC', () => {
    it('should successfully fetch and cache BTC price', async () => {
      // Mock successful CoinGecko response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bitcoin: { usd: 100000 } }),
      });

      const result = await fetchAndCachePrice('btc');

      expect(result.success).toBe(true);
      expect(result.value).toBe(100000);
      expect(cache.get('btc')).toBe(100000);
    });

    it('should retry with exponential backoff on failure', async () => {
      let attempts = 0;
      
      global.fetch.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ bitcoin: { usd: 100000 } }),
        });
      });

      const result = await fetchAndCachePrice('btc');

      expect(attempts).toBe(3);
      expect(result.success).toBe(true);
      expect(result.value).toBe(100000);
    }, 10000); // 10s timeout for backoff

    it('should return stale cache after all retries fail', async () => {
      // Pre-populate cache with stale data
      cache.set('btc', 95000);
      
      // Make it stale by mocking time
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now + 700000); // 700s later (expired)

      // Mock all fetch attempts to fail
      global.fetch.mockRejectedValue(new Error('API down'));

      const result = await fetchAndCachePrice('btc');

      expect(result.success).toBe(false);
      expect(result.stale).toBe(true);
      expect(result.value).toBe(95000); // Returns stale value
      expect(result.error).toContain('API down');
    }, 15000); // Longer timeout for multiple retries
  });

  describe('fetchAndCachePrice - Polygon stocks', () => {
    it('should successfully fetch and cache stock price', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'OK',
          results: [{ c: 420.50, h: 425, l: 415, v: 1000000 }],
        }),
      });

      const result = await fetchAndCachePrice('MSTR');

      expect(result.success).toBe(true);
      expect(result.value.price).toBe(420.50);
      expect(cache.get('MSTR')).toEqual({
        price: 420.50,
        high: 425,
        low: 415,
        volume: 1000000,
      });
    });

    it('should respect rate limits', async () => {
      // Fill up rate limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.recordRequest('polygon');
      }

      const result = await fetchAndCachePrice('MSTR');

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle 429 rate limit response with backoff', async () => {
      let attempts = 0;
      
      global.fetch.mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          return Promise.resolve({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: 'OK',
            results: [{ c: 420, h: 425, l: 415, v: 1000000 }],
          }),
        });
      });

      const result = await fetchAndCachePrice('MSTR');

      expect(attempts).toBeGreaterThanOrEqual(2);
      expect(result.success).toBe(true);
    }, 10000);

    it('should handle Polygon error responses', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ERROR',
          error: 'Invalid ticker',
        }),
      });

      const result = await fetchAndCachePrice('INVALID');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('fetchAndCachePrice - EUR/USD', () => {
    it('should successfully fetch and cache EUR/USD rate', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rates: { USD: 1.08 } }),
      });

      const result = await fetchAndCachePrice('eurUsd');

      expect(result.success).toBe(true);
      expect(result.value).toBe(1.08);
      expect(cache.get('eurUsd')).toBe(1.08);
    });

    it('should handle ExchangeRate API errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await fetchAndCachePrice('eurUsd');

      expect(result.success).toBe(false);
    });
  });

  describe('Error handling and fallbacks', () => {
    it('should return error when no cache and all retries fail', async () => {
      global.fetch.mockRejectedValue(new Error('Network timeout'));

      const result = await fetchAndCachePrice('btc');

      expect(result.success).toBe(false);
      expect(result.value).toBeUndefined();
      expect(result.error).toContain('Network timeout');
    }, 15000);

    it('should handle missing API key for Polygon', async () => {
      // Temporarily remove API key
      const originalKey = process.env.POLYGON_API_KEY;
      delete process.env.POLYGON_API_KEY;

      const result = await fetchAndCachePrice('MSTR');

      expect(result.success).toBe(false);
      expect(result.error).toContain('POLYGON_API_KEY');

      // Restore API key
      process.env.POLYGON_API_KEY = originalKey;
    });
  });
});

