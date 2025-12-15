import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { cache } from '../../cache.js';
import { rateLimiter } from '../../rateLimiter.js';
import * as priceService from '../../priceService.js';
import * as scheduler from '../../scheduler.js';

// Create test app (similar to server.js but without starting actual server)
const createTestApp = () => {
  const app = express();
  
  app.use(cors());
  app.use(express.json());

  // Mock endpoints (same as server.js)
  app.get('/api/prices/all', async (req, res) => {
    try {
      const force = req.query.force === 'true';
      
      if (force) {
        cache.clear();
      }
      
      const results = await priceService.fetchAllPrices();
      
      const metadata = {
        cached: results.cached,
        partial: results.partial,
        stale: results.stale,
        degraded: results.errors.length > 3,
        timestamp: new Date().toISOString(),
        ttls: {},
      };
      
      for (const key of Object.keys(results.data)) {
        const ttl = Math.round(cache.getRemainingTTL(key) / 1000);
        metadata.ttls[key] = ttl;
      }
      
      let statusCode = 200;
      if (results.partial && results.errors.length > 0) {
        statusCode = 207;
      }
      
      res.status(statusCode).json({
        data: results.data,
        metadata,
        errors: results.errors,
        successes: results.successes,
      });
    } catch (error) {
      res.status(503).json({
        error: 'Service unavailable',
        message: error.message,
        retryAfter: 60,
      });
    }
  });

  app.get('/api/health', (req, res) => {
    try {
      const cacheStats = cache.getStats();
      const polygonUsage = rateLimiter.getUsage('polygon');
      const schedulerStatus = scheduler.getSchedulerStatus();
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        cache: cacheStats,
        rateLimits: {
          polygon: polygonUsage,
        },
        scheduler: schedulerStatus,
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
      });
    }
  });

  app.get('/api/ping', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      path: req.path,
    });
  });

  return app;
};

describe('Server API Endpoints', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    cache.clear();
    rateLimiter.reset();
    vi.clearAllMocks();
  });

  describe('GET /api/ping', () => {
    it('should return ok status', async () => {
      const response = await request(app)
        .get('/api/ping')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/health', () => {
    it('should return health status with cache stats', async () => {
      // Pre-populate cache
      cache.set('btc', 100000);
      cache.set('mstr', 420);

      const response = await request(app)
        .get('/api/health')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.status).toBe('healthy');
      expect(response.body.cache).toBeDefined();
      expect(response.body.cache.size).toBe(2);
      expect(response.body.rateLimits).toBeDefined();
      expect(response.body.scheduler).toBeDefined();
    });

    it('should include rate limit information', async () => {
      rateLimiter.recordRequest('polygon');
      rateLimiter.recordRequest('polygon');

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.rateLimits.polygon.used).toBe(2);
      expect(response.body.rateLimits.polygon.limit).toBe(5);
      expect(response.body.rateLimits.polygon.remaining).toBe(3);
    });
  });

  describe('GET /api/prices/all', () => {
    it('should return all prices when cache is warm', async () => {
      // Mock fetchAllPrices to return cached data
      vi.spyOn(priceService, 'fetchAllPrices').mockResolvedValueOnce({
        data: {
          btc: 100000,
          mstr: 420,
          eurUsd: 1.05,
          STRF: { price: 100, high: 102, low: 98, volume: 1000 },
          STRC: { price: 100, high: 102, low: 98, volume: 1000 },
          STRK: { price: 100, high: 102, low: 98, volume: 1000 },
          STRD: { price: 100, high: 102, low: 98, volume: 1000 },
        },
        errors: [],
        successes: ['BTC', 'MSTR', 'EUR/USD', 'STRF', 'STRC', 'STRK', 'STRD'],
        cached: true,
        partial: false,
        stale: false,
      });

      const response = await request(app)
        .get('/api/prices/all')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.data.btc).toBe(100000);
      expect(response.body.data.mstr).toBe(420);
      expect(response.body.metadata).toBeDefined();
      expect(response.body.metadata.cached).toBe(true);
      expect(response.body.errors).toEqual([]);
      expect(response.body.successes).toHaveLength(7);
    });

    it('should return 207 for partial success', async () => {
      vi.spyOn(priceService, 'fetchAllPrices').mockResolvedValueOnce({
        data: {
          btc: 100000,
          mstr: null,
          eurUsd: 1.05,
        },
        errors: ['MSTR: 429 Too Many Requests'],
        successes: ['BTC', 'EUR/USD'],
        cached: false,
        partial: true,
        stale: false,
      });

      const response = await request(app)
        .get('/api/prices/all')
        .expect(207); // Multi-Status

      expect(response.body.metadata.partial).toBe(true);
      expect(response.body.errors).toContain('MSTR: 429 Too Many Requests');
      expect(response.body.data.btc).toBe(100000);
    });

    it('should force refresh when force=true', async () => {
      // Pre-populate cache
      cache.set('btc', 95000);

      const clearSpy = vi.spyOn(cache, 'clear');

      vi.spyOn(priceService, 'fetchAllPrices').mockResolvedValueOnce({
        data: { btc: 100000 },
        errors: [],
        successes: ['BTC'],
        cached: false,
      });

      await request(app)
        .get('/api/prices/all?force=true')
        .expect(200);

      expect(clearSpy).toHaveBeenCalled();
    });

    it('should return 503 when all APIs fail', async () => {
      vi.spyOn(priceService, 'fetchAllPrices').mockRejectedValueOnce(
        new Error('All external APIs failed')
      );

      const response = await request(app)
        .get('/api/prices/all')
        .expect(503);

      expect(response.body.error).toBe('Service unavailable');
      expect(response.body.retryAfter).toBe(60);
    });

    it('should include TTL metadata for each price', async () => {
      vi.spyOn(priceService, 'fetchAllPrices').mockResolvedValueOnce({
        data: {
          btc: 100000,
          mstr: 420,
        },
        errors: [],
        successes: ['BTC', 'MSTR'],
        cached: true,
      });

      const response = await request(app)
        .get('/api/prices/all')
        .expect(200);

      expect(response.body.metadata.ttls).toBeDefined();
      expect(response.body.metadata.timestamp).toBeDefined();
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown')
        .expect(404);

      expect(response.body.error).toBe('Not found');
      expect(response.body.path).toBe('/api/unknown');
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/ping')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});

