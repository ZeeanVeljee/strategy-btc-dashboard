import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { cache } from '../../cache.js';

describe('Cache', () => {
  beforeEach(() => {
    cache.clear();
    cache.stats.hits = 0;
    cache.stats.misses = 0;
    cache.stats.sets = 0;
  });

  it('should set and get values', () => {
    cache.set('test', 'value');
    expect(cache.get('test')).toBe('value');
  });

  it('should return null for missing keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should return null for expired keys', () => {
    // Mock Date.now to control time
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    
    cache.set('test', 'value');
    
    // Fast forward past max TTL (600s)
    vi.spyOn(Date, 'now').mockReturnValue(now + 700 * 1000);
    
    expect(cache.get('test')).toBeNull();
    
    vi.restoreAllMocks();
  });

  it('should generate random TTL between min and max', () => {
    const ttls = [];
    for (let i = 0; i < 10; i++) {
      cache.set(`key${i}`, `value${i}`);
      const remaining = cache.getRemainingTTL(`key${i}`);
      ttls.push(remaining);
    }
    
    // Check that TTLs are in range (300-600s = 300000-600000ms)
    ttls.forEach(ttl => {
      expect(ttl).toBeGreaterThanOrEqual(299000); // Allow 1s margin
      expect(ttl).toBeLessThanOrEqual(601000);
    });
    
    // Check that they're not all the same (randomized)
    const uniqueTtls = new Set(ttls.map(t => Math.round(t / 1000)));
    expect(uniqueTtls.size).toBeGreaterThan(1);
  });

  it('should track hit/miss statistics', () => {
    cache.set('key1', 'value1');
    
    cache.get('key1'); // hit
    cache.get('key1'); // hit
    cache.get('missing'); // miss
    
    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(0.67, 1);
  });

  it('should get raw entry even if expired', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    
    cache.set('test', 'value');
    
    // Fast forward past expiry
    vi.spyOn(Date, 'now').mockReturnValue(now + 700 * 1000);
    
    // get() returns null
    expect(cache.get('test')).toBeNull();
    
    // getRaw() returns expired entry
    const raw = cache.getRaw('test');
    expect(raw).not.toBeNull();
    expect(raw.value).toBe('value');
    
    vi.restoreAllMocks();
  });

  it('should check if key exists and is fresh', () => {
    cache.set('test', 'value');
    expect(cache.has('test')).toBe(true);
    expect(cache.has('missing')).toBe(false);
    
    // Check expired key
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    cache.set('expiring', 'value');
    vi.spyOn(Date, 'now').mockReturnValue(now + 700 * 1000);
    expect(cache.has('expiring')).toBe(false);
    
    vi.restoreAllMocks();
  });

  it('should get remaining TTL', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    
    cache.set('test', 'value');
    
    // Check TTL immediately (should be 300-600s)
    const ttl = cache.getRemainingTTL('test');
    expect(ttl).toBeGreaterThan(299000);
    expect(ttl).toBeLessThanOrEqual(600000);
    
    // Fast forward 100s
    vi.spyOn(Date, 'now').mockReturnValue(now + 100000);
    const ttl2 = cache.getRemainingTTL('test');
    expect(ttl2).toBeCloseTo(ttl - 100000, -3);
    
    vi.restoreAllMocks();
  });

  it('should delete keys', () => {
    cache.set('test', 'value');
    expect(cache.has('test')).toBe(true);
    
    cache.delete('test');
    expect(cache.has('test')).toBe(false);
  });

  it('should clear all entries', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    expect(cache.getStats().size).toBe(2);
    
    cache.clear();
    expect(cache.getStats().size).toBe(0);
  });
});

