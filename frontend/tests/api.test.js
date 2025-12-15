import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchPolygonPrice,
  fetchPolygon10DayHistory,
  fetchBtcPrice,
  fetchEurUsdRate,
  fetchAllPricesSequentially,
} from '../src/api.js';

global.fetch = vi.fn();

describe('fetchPolygonPrice', () => {
  beforeEach(() => {
    fetch.mockClear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('should fetch price successfully', async () => {
    const mockResponse = {
      status: 'OK',
      results: [
        {
          c: 420.50,
          v: 1000000,
          h: 425.00,
          l: 415.00,
        },
      ],
    };

    fetch.mockResolvedValueOnce({
      json: async () => mockResponse,
    });

    const result = await fetchPolygonPrice('MSTR');

    expect(result.success).toBe(true);
    expect(result.price).toBe(420.50);
    expect(result.volume).toBe(1000000);
    expect(result.high).toBe(425.00);
    expect(result.low).toBe(415.00);
  });

  it('should handle API errors gracefully', async () => {
    const mockResponse = {
      status: 'ERROR',
      error: 'API key invalid',
    };

    fetch.mockResolvedValueOnce({
      json: async () => mockResponse,
    });

    const result = await fetchPolygonPrice('MSTR');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle network errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchPolygonPrice('MSTR');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('should handle missing results', async () => {
    const mockResponse = {
      status: 'OK',
      results: [],
    };

    fetch.mockResolvedValueOnce({
      json: async () => mockResponse,
    });

    const result = await fetchPolygonPrice('INVALID');

    expect(result.success).toBe(false);
  });
});

describe('fetchPolygon10DayHistory', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should fetch 10-day average successfully', async () => {
    const mockResponse = {
      status: 'OK',
      results: Array.from({ length: 14 }, (_, i) => ({
        c: 100 + i,
        t: Date.now() - (14 - i) * 24 * 60 * 60 * 1000,
      })),
    };

    fetch.mockResolvedValueOnce({
      json: async () => mockResponse,
    });

    const result = await fetchPolygon10DayHistory('STRF');

    expect(result.success).toBe(true);
    expect(result.avg).toBeDefined();
    expect(typeof result.avg).toBe('number');
  });

  it('should calculate average of last 10 days', async () => {
    const mockResponse = {
      status: 'OK',
      results: [
        { c: 100 }, { c: 101 }, { c: 102 }, { c: 103 }, { c: 104 },
        { c: 105 }, { c: 106 }, { c: 107 }, { c: 108 }, { c: 109 },
        { c: 110 }, { c: 111 },
      ],
    };

    fetch.mockResolvedValueOnce({
      json: async () => mockResponse,
    });

    const result = await fetchPolygon10DayHistory('STRF');

    // Should take last 10: 102-111, avg = 106.5
    expect(result.avg).toBeCloseTo(106.5, 1);
  });

  it('should handle API errors', async () => {
    fetch.mockRejectedValueOnce(new Error('API error'));

    const result = await fetchPolygon10DayHistory('INVALID');

    expect(result.success).toBe(false);
  });
});

describe('fetchBtcPrice', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should fetch BTC price successfully', async () => {
    const mockResponse = {
      bitcoin: {
        usd: 100000,
      },
    };

    fetch.mockResolvedValueOnce({
      json: async () => mockResponse,
    });

    const result = await fetchBtcPrice();

    expect(result).toBe(100000);
  });

  it('should return null on error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchBtcPrice();

    expect(result).toBeNull();
  });

  it('should return null if bitcoin data missing', async () => {
    const mockResponse = {};

    fetch.mockResolvedValueOnce({
      json: async () => mockResponse,
    });

    const result = await fetchBtcPrice();

    expect(result).toBeNull();
  });
});

describe('fetchEurUsdRate', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should fetch EUR/USD rate successfully', async () => {
    const mockResponse = {
      rates: {
        USD: 1.08,
      },
    };

    fetch.mockResolvedValueOnce({
      json: async () => mockResponse,
    });

    const result = await fetchEurUsdRate();

    expect(result).toBe(1.08);
  });

  it('should return default 1.05 on error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchEurUsdRate();

    expect(result).toBe(1.05);
  });

  it('should return default if USD rate missing', async () => {
    const mockResponse = {
      rates: {},
    };

    fetch.mockResolvedValueOnce({
      json: async () => mockResponse,
    });

    const result = await fetchEurUsdRate();

    expect(result).toBe(1.05);
  });
});

describe('fetchAllPricesSequentially', () => {
  beforeEach(() => {
    fetch.mockClear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('should fetch all prices successfully', async () => {
    // Mock BTC price
    fetch.mockResolvedValueOnce({
      json: async () => ({ bitcoin: { usd: 100000 } }),
    });

    // Mock EUR/USD
    fetch.mockResolvedValueOnce({
      json: async () => ({ rates: { USD: 1.08 } }),
    });

    // Mock MSTR
    fetch.mockResolvedValueOnce({
      json: async () => ({
        status: 'OK',
        results: [{ c: 420 }],
      }),
    });

    // Mock STRF, STRC, STRK, STRD
    for (let i = 0; i < 4; i++) {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          status: 'OK',
          results: [{ c: 100 + i }],
        }),
      });
    }

    const result = await fetchAllPricesSequentially();

    expect(result.btc).toBe(100000);
    expect(result.mstr).toBe(420);
    expect(result.eurUsd).toBe(1.08);
    expect(result.successes).toContain('BTC');
    expect(result.successes).toContain('MSTR');
  });

  it('should handle partial failures gracefully', async () => {
    // BTC succeeds
    fetch.mockResolvedValueOnce({
      json: async () => ({ bitcoin: { usd: 100000 } }),
    });

    // EUR/USD succeeds
    fetch.mockResolvedValueOnce({
      json: async () => ({ rates: { USD: 1.08 } }),
    });

    // MSTR fails
    fetch.mockRejectedValueOnce(new Error('API error'));

    // Remaining succeed
    for (let i = 0; i < 4; i++) {
      fetch.mockResolvedValueOnce({
        json: async () => ({
          status: 'OK',
          results: [{ c: 100 }],
        }),
      });
    }

    const result = await fetchAllPricesSequentially();

    expect(result.btc).toBe(100000);
    expect(result.mstr).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should use default values when APIs fail', async () => {
    // All fail
    fetch.mockRejectedValue(new Error('Network error'));

    const result = await fetchAllPricesSequentially();

    expect(result.btc).toBeNull();
    expect(result.eurUsd).toBe(1.05); // Default
    expect(result.STRF.price).toBe(100); // Default
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
