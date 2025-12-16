import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAllPrices } from '../src/api.js';

global.fetch = vi.fn();

describe('fetchAllPrices (backend only)', () => {
  beforeEach(() => {
    fetch.mockClear();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('should fetch all prices from backend successfully', async () => {
    const backendResponse = {
      data: {
        btc: 100000,
        MSTR: { price: 420 },
        eurUsd: 1.08,
        STRF: { price: 101, avg10d: 100 },
        STRC: { price: 102, avg10d: 101 },
        STRK: { price: 103, avg10d: 102 },
        STRD: { price: 104, avg10d: 103 },
        STRE: { price: 105, avg10d: 104 },
      },
      errors: [],
      successes: ['BTC', 'MSTR', 'STRF', 'STRC', 'STRK', 'STRD', 'STRE'],
      metadata: { cached: true, stale: false },
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => backendResponse,
    });

    const result = await fetchAllPrices();

    expect(fetch).toHaveBeenCalledWith('/api/prices/all', expect.any(Object));
    expect(result.btc).toBe(100000);
    expect(result.mstr).toBe(420);
    expect(result.eurUsd).toBe(1.08);
    expect(result.STRF).toEqual(backendResponse.data.STRF);
    expect(result.STRC).toEqual(backendResponse.data.STRC);
    expect(result.STRK).toEqual(backendResponse.data.STRK);
    expect(result.STRD).toEqual(backendResponse.data.STRD);
    expect(result.STRE).toEqual(backendResponse.data.STRE);
    expect(result.errors).toEqual([]);
    expect(result.successes).toEqual(backendResponse.successes);
    expect(result.cached).toBe(true);
    expect(result.stale).toBe(false);
  });

  it('should use default prices when backend request fails', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchAllPrices();

    expect(result.btc).toBe(100000);
    expect(result.mstr).toBe(420);
    expect(result.eurUsd).toBe(1.05);
    expect(result.errors[0]).toContain('Backend unavailable');
    expect(result.cached).toBe(false);
    expect(result.stale).toBe(false);
  });

  it('should treat non-OK backend response as failure and use defaults', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const result = await fetchAllPrices();

    expect(result.btc).toBe(100000);
    expect(result.mstr).toBe(420);
    expect(result.eurUsd).toBe(1.05);
    expect(result.errors[0]).toContain('Backend unavailable');
  });
});
