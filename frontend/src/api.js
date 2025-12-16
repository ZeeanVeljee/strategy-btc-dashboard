/**
 * Fetches all prices from backend caching service
 * @param {boolean} force - Force refresh, bypass cache
 * @returns {Promise<Object>} Object containing all fetched prices and errors
 */
export async function fetchAllPrices(force = false) {
  try {
    const backendUrl = '/api/prices/all' + (force ? '?force=true' : '');
    const response = await fetch(backendUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();

    return {
      btc: result.data.btc,
      mstr: result.data.MSTR?.price,
      eurUsd: result.data.eurUsd,
      STRF: result.data.STRF,
      STRC: result.data.STRC,
      STRK: result.data.STRK,
      STRD: result.data.STRD,
      STRE: result.data.STRE,
      errors: result.errors || [],
      successes: result.successes || [],
      cached: result.metadata?.cached || false,
      stale: result.metadata?.stale || false,
    };
  } catch (backendError) {
    console.warn('[API] Backend unavailable:', backendError.message);
    // Backend-only design: on failure, we DO NOT call external APIs directly from the frontend.
    // Instead, return safe default prices so the UI can still render.
    return {
      btc: 100000,
      mstr: 420,
      eurUsd: 1.05,
      STRF: null,
      STRC: null,
      STRK: null,
      STRD: null,
      STRE: null,
      errors: [`Backend unavailable: ${backendError.message}`],
      successes: [],
      cached: false,
      stale: false,
    };
  }
}
