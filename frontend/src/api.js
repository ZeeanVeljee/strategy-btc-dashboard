import { POLYGON_API_KEY } from './constants.js';

/**
 * Fetches all prices from backend caching service
 * Falls back to direct API calls if backend is unavailable
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
      errors: result.errors || [],
      successes: result.successes || [],
      cached: result.metadata?.cached || false,
      stale: result.metadata?.stale || false,
    };
  } catch (backendError) {
    console.warn('[API] Backend unavailable, falling back:', backendError.message);
    return await fetchAllPricesSequentially();
  }
}

/**
 * Fetches the previous day's closing price for a ticker from Polygon API
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<Object>} Price data or error object
 */
export async function fetchPolygonPrice(ticker) {
  try {
    const response = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?apiKey=${POLYGON_API_KEY}`
    );
    const data = await response.json();
    console.log(`Polygon ${ticker} response:`, data);

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      return {
        price: data.results[0].c,
        volume: data.results[0].v,
        high: data.results[0].h,
        low: data.results[0].l,
        success: true,
      };
    } else {
      console.warn(`Polygon ${ticker}: No results or error`, data);
      return { success: false, error: data.status || 'No data' };
    }
  } catch (error) {
    console.error(`Polygon ${ticker} error:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches 10-day historical average price for a ticker from Polygon API
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<Object>} Average price data or error object
 */
export async function fetchPolygon10DayHistory(ticker) {
  try {
    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const response = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}?apiKey=${POLYGON_API_KEY}`
    );
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const last10 = data.results.slice(-10);
      const avg = last10.reduce((sum, d) => sum + d.c, 0) / last10.length;
      return { avg, success: true };
    }
    return { success: false };
  } catch (error) {
    console.error(`Polygon 10d ${ticker} error:`, error);
    return { success: false };
  }
}

/**
 * Fetches current Bitcoin price from CoinGecko API
 * @returns {Promise<number|null>} BTC price in USD or null on error
 */
export async function fetchBtcPrice() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
    );
    const data = await response.json();
    return data?.bitcoin?.usd || null;
  } catch {
    return null;
  }
}

/**
 * Fetches EUR/USD exchange rate
 * @returns {Promise<number>} EUR/USD rate, defaults to 1.05 on error
 */
export async function fetchEurUsdRate() {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
    const data = await response.json();
    return data?.rates?.USD || 1.05;
  } catch {
    return 1.05;
  }
}

/**
 * Fetches all prices sequentially to respect rate limits
 * @returns {Promise<Object>} Object containing all fetched prices and errors
 */
export async function fetchAllPricesSequentially() {
  const results = {
    btc: null,
    mstr: null,
    eurUsd: 1.05,
    STRF: { price: 100, avg10d: 100 },
    STRC: { price: 100, avg10d: 100 },
    STRK: { price: 100, avg10d: 100 },
    STRD: { price: 100, avg10d: 100 },
    STRE: { price: 105, avg10d: 105 },
    errors: [],
    successes: [],
  };

  const btc = await fetchBtcPrice();
  if (btc) {
    results.btc = btc;
    results.successes.push('BTC');
  } else {
    results.errors.push('BTC');
  }

  results.eurUsd = await fetchEurUsdRate();

  const tickers = ['MSTR', 'STRF', 'STRC', 'STRK', 'STRD'];

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];

    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const priceResult = await fetchPolygonPrice(ticker);

    if (priceResult.success) {
      if (ticker === 'MSTR') {
        results.mstr = priceResult.price;
      } else {
        results[ticker] = {
          price: priceResult.price,
          avg10d: priceResult.price,
        };
      }
      results.successes.push(ticker);
    } else {
      results.errors.push(`${ticker}: ${priceResult.error || 'failed'}`);
    }
  }

  return results;
}
