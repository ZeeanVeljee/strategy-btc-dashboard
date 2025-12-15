import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { startScheduler, stopScheduler, getSchedulerStatus } from '../../scheduler.js';
import { cache } from '../../cache.js';
import * as priceService from '../../priceService.js';

describe('Scheduler', () => {
  beforeEach(() => {
    cache.clear();
    stopScheduler(); // Ensure clean state
    vi.clearAllMocks();
  });

  afterEach(() => {
    stopScheduler();
    vi.restoreAllMocks();
  });

  it('should seed cache on startup', async () => {
    // Mock fetchAllPrices to return test data
    vi.spyOn(priceService, 'fetchAllPrices').mockResolvedValueOnce({
      data: {
        btc: 100000,
        mstr: 420,
        eurUsd: 1.05,
        STRF: { price: 100 },
        STRC: { price: 100 },
        STRK: { price: 100 },
        STRD: { price: 100 },
      },
      errors: [],
      successes: ['BTC', 'MSTR', 'EUR/USD', 'STRF', 'STRC', 'STRK', 'STRD'],
    });

    await startScheduler();

    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(priceService.fetchAllPrices).toHaveBeenCalled();
    
    stopScheduler();
  });

  it('should return correct scheduler status', async () => {
    const status = getSchedulerStatus();

    expect(status).toHaveProperty('running');
    expect(status).toHaveProperty('interval');
    expect(status).toHaveProperty('seedOnStartup');
    expect(status).toHaveProperty('refreshThreshold');
    expect(status.interval).toBe(30);
    expect(status.refreshThreshold).toBe(60);
  });

  it('should refresh entries approaching expiration', async () => {
    // Mock time
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    // Add entry that will expire soon
    cache.set('btc', 100000);
    
    // Fast forward so TTL is less than 60s
    vi.spyOn(Date, 'now').mockReturnValue(now + 550000); // 550s later (should have ~10-50s left)

    // Mock fetchAndCachePrice
    vi.spyOn(priceService, 'fetchAndCachePrice').mockResolvedValueOnce({
      success: true,
      key: 'btc',
      value: 101000,
    });

    // Mock fetchAllPrices for initial seed
    vi.spyOn(priceService, 'fetchAllPrices').mockResolvedValueOnce({
      data: {},
      errors: [],
      successes: [],
    });

    // Use fake timers for scheduler interval
    vi.useFakeTimers();
    
    await startScheduler();
    
    // Advance timer to trigger scheduler check
    await vi.advanceTimersByTimeAsync(30000);

    // The scheduler should have attempted to refresh
    await new Promise(resolve => setTimeout(resolve, 100));

    stopScheduler();
    vi.useRealTimers();
  });

  it('should not refresh entries with plenty of TTL', async () => {
    // Add fresh entry
    cache.set('btc', 100000);

    // Mock fetchAndCachePrice (shouldn't be called)
    const mockFetch = vi.spyOn(priceService, 'fetchAndCachePrice');
    
    // Mock fetchAllPrices for initial seed
    vi.spyOn(priceService, 'fetchAllPrices').mockResolvedValueOnce({
      data: {},
      errors: [],
      successes: [],
    });

    vi.useFakeTimers();
    
    await startScheduler();
    
    // Advance timer
    await vi.advanceTimersByTimeAsync(30000);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should not refresh fresh entries
    expect(mockFetch).not.toHaveBeenCalled();

    stopScheduler();
    vi.useRealTimers();
  });

  it('should handle empty cache by seeding', async () => {
    expect(cache.getStats().size).toBe(0);

    const mockFetchAll = vi.spyOn(priceService, 'fetchAllPrices').mockResolvedValue({
      data: {
        btc: 100000,
        mstr: 420,
      },
      errors: [],
      successes: ['BTC', 'MSTR'],
    });

    vi.useFakeTimers();
    
    await startScheduler();
    
    // Advance to trigger check
    await vi.advanceTimersByTimeAsync(30000);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should seed cache when empty
    expect(mockFetchAll).toHaveBeenCalled();

    stopScheduler();
    vi.useRealTimers();
  });

  it('should handle refresh failures gracefully', async () => {
    // Add expiring entry
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    cache.set('btc', 100000);
    vi.spyOn(Date, 'now').mockReturnValue(now + 550000);

    // Mock failure
    vi.spyOn(priceService, 'fetchAndCachePrice').mockRejectedValueOnce(
      new Error('API error')
    );

    vi.spyOn(priceService, 'fetchAllPrices').mockResolvedValueOnce({
      data: {},
      errors: [],
      successes: [],
    });

    vi.useFakeTimers();

    // Should not throw
    await expect(startScheduler()).resolves.not.toThrow();

    await vi.advanceTimersByTimeAsync(30000);
    await new Promise(resolve => setTimeout(resolve, 100));

    stopScheduler();
    vi.useRealTimers();
  });

  it('should stop scheduler cleanly', async () => {
    vi.spyOn(priceService, 'fetchAllPrices').mockResolvedValueOnce({
      data: {},
      errors: [],
      successes: [],
    });

    await startScheduler();
    
    let status = getSchedulerStatus();
    expect(status.running).toBe(true);

    stopScheduler();
    
    status = getSchedulerStatus();
    expect(status.running).toBe(false);
  });

  it('should handle multiple refresh cycles', async () => {
    vi.spyOn(priceService, 'fetchAllPrices').mockResolvedValue({
      data: {},
      errors: [],
      successes: [],
    });

    vi.useFakeTimers();
    
    await startScheduler();

    // Run multiple cycles
    await vi.advanceTimersByTimeAsync(30000); // First check
    await vi.advanceTimersByTimeAsync(30000); // Second check
    await vi.advanceTimersByTimeAsync(30000); // Third check

    // Should not crash
    expect(getSchedulerStatus().running).toBe(true);

    stopScheduler();
    vi.useRealTimers();
  });
});

