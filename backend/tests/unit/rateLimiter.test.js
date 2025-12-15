import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimiter } from '../../rateLimiter.js';

describe('RateLimiter', () => {
  beforeEach(() => {
    rateLimiter.reset();
  });

  it('should allow requests under the limit', () => {
    expect(rateLimiter.canMakeRequest('polygon', 5)).toBe(true);
    
    rateLimiter.recordRequest('polygon');
    expect(rateLimiter.canMakeRequest('polygon', 5)).toBe(true);
    
    rateLimiter.recordRequest('polygon');
    expect(rateLimiter.canMakeRequest('polygon', 5)).toBe(true);
  });

  it('should block 6th request within 60s window', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    
    // Make 5 requests (should all be allowed)
    for (let i = 0; i < 5; i++) {
      expect(rateLimiter.canMakeRequest('polygon', 5)).toBe(true);
      rateLimiter.recordRequest('polygon');
    }
    
    // 6th request should be blocked
    expect(rateLimiter.canMakeRequest('polygon', 5)).toBe(false);
    
    vi.restoreAllMocks();
  });

  it('should reset after 60s window expires', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    
    // Fill up the limit
    for (let i = 0; i < 5; i++) {
      rateLimiter.recordRequest('polygon');
    }
    
    expect(rateLimiter.canMakeRequest('polygon', 5)).toBe(false);
    
    // Fast forward 61 seconds
    vi.spyOn(Date, 'now').mockReturnValue(now + 61000);
    
    // Should be allowed again
    expect(rateLimiter.canMakeRequest('polygon', 5)).toBe(true);
    
    vi.restoreAllMocks();
  });

  it('should track multiple APIs independently', () => {
    rateLimiter.recordRequest('polygon');
    rateLimiter.recordRequest('polygon');
    rateLimiter.recordRequest('coingecko');
    
    const polygonUsage = rateLimiter.getUsage('polygon', 5);
    const coingeckoUsage = rateLimiter.getUsage('coingecko', 5);
    
    expect(polygonUsage.used).toBe(2);
    expect(coingeckoUsage.used).toBe(1);
  });

  it('should cleanup old timestamps outside window', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    
    // Record 3 requests at T=0
    rateLimiter.recordRequest('polygon');
    rateLimiter.recordRequest('polygon');
    rateLimiter.recordRequest('polygon');
    
    // Fast forward 50 seconds and record 2 more
    vi.spyOn(Date, 'now').mockReturnValue(now + 50000);
    rateLimiter.recordRequest('polygon');
    rateLimiter.recordRequest('polygon');
    
    // At T=50s, all 5 should still be in window
    expect(rateLimiter.getUsage('polygon', 5).used).toBe(5);
    
    // Fast forward to T=65s (first 3 should be cleaned up)
    vi.spyOn(Date, 'now').mockReturnValue(now + 65000);
    const usage = rateLimiter.getUsage('polygon', 5);
    
    expect(usage.used).toBe(2); // Only the 2 from T=50s remain
    
    vi.restoreAllMocks();
  });

  it('should return correct usage stats', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    
    rateLimiter.recordRequest('polygon');
    rateLimiter.recordRequest('polygon');
    
    const usage = rateLimiter.getUsage('polygon', 5);
    
    expect(usage.used).toBe(2);
    expect(usage.limit).toBe(5);
    expect(usage.remaining).toBe(3);
    expect(usage.resetIn).toBeGreaterThan(0);
    expect(usage.resetIn).toBeLessThanOrEqual(60);
    
    vi.restoreAllMocks();
  });

  it('should calculate correct resetIn time', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    
    rateLimiter.recordRequest('polygon');
    
    // Check immediately
    let usage = rateLimiter.getUsage('polygon', 5);
    expect(usage.resetIn).toBeCloseTo(60, 0);
    
    // Fast forward 30 seconds
    vi.spyOn(Date, 'now').mockReturnValue(now + 30000);
    usage = rateLimiter.getUsage('polygon', 5);
    expect(usage.resetIn).toBeCloseTo(30, 0);
    
    vi.restoreAllMocks();
  });

  it('should reset all counters', () => {
    rateLimiter.recordRequest('polygon');
    rateLimiter.recordRequest('coingecko');
    
    expect(rateLimiter.getUsage('polygon', 5).used).toBe(1);
    expect(rateLimiter.getUsage('coingecko', 5).used).toBe(1);
    
    rateLimiter.reset();
    
    expect(rateLimiter.getUsage('polygon', 5).used).toBe(0);
    expect(rateLimiter.getUsage('coingecko', 5).used).toBe(0);
  });
});

