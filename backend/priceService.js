/**
 * Price fetching service with exponential backoff
 * Migrated from src/api.js to backend
 */
import { CONFIG } from './config.js';
import { cache } from './cache.js';
import { rateLimiter } from './rateLimiter.js';

/**
 * Sleep utility for exponential backoff
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with exponential backoff retry logic
 * @param {Function} fetchFn - Async function to execute
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<*>} Result from fetchFn
 */
async function fetchWithBackoff(fetchFn, maxRetries = CONFIG.MAX_RETRIES) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        const delayMs = CONFIG.BASE_DELAY * Math.pow(2, attempt);
        const delaySec = Math.round(delayMs / 1000);
        console.log(`[Backoff] Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${delaySec}s...`);
        await sleep(delayMs);
      }
    }
  }
  
  console.error(`[Backoff] All ${maxRetries} attempts failed`);
  throw lastError;
}

/**
 * Fetch Bitcoin price from CoinGecko
 * @returns {Promise<number>} BTC price in USD
 */
async function fetchBtcPrice() {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
  );
  
  if (!response.ok) {
    throw new Error(`CoinGecko HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  const price = data?.bitcoin?.usd;
  
  if (!price) {
    throw new Error('CoinGecko: No BTC price in response');
  }
  
  return price;
}

/**
 * Fetch EUR/USD exchange rate
 * @returns {Promise<number>} EUR/USD rate
 */
async function fetchEurUsdRate() {
  const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
  
  if (!response.ok) {
    throw new Error(`ExchangeRate HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  const rate = data?.rates?.USD;
  
  if (!rate) {
    throw new Error('ExchangeRate: No USD rate in response');
  }
  
  return rate;
}

/**
 * Fetch price from Polygon.io
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<Object>} Price data
 */
async function fetchPolygonPrice(ticker) {
  const response = await fetch(
    `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?apiKey=${CONFIG.POLYGON_API_KEY}`
  );
  
  if (!response.ok) {
    throw new Error(`Polygon HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (data.status !== 'OK' || !data.results || data.results.length === 0) {
    throw new Error(`Polygon ${ticker}: ${data.status || 'No results'}`);
  }
  
  return {
    price: data.results[0].c,
    volume: data.results[0].v,
    high: data.results[0].h,
    low: data.results[0].l,
  };
}

/**
 * Fetch and cache a single price with exponential backoff
 * @param {string} key - Cache key (e.g., 'btc', 'mstr', 'STRF')
 * @returns {Promise<Object>} Result object with success flag and data/error
 */
export async function fetchAndCachePrice(key) {
  try {
    let value;
    
    // Determine which API to call based on key
    if (key === 'btc') {
      value = await fetchWithBackoff(fetchBtcPrice);
    } else if (key === 'eurUsd') {
      value = await fetchWithBackoff(fetchEurUsdRate);
    } else {
      // It's a stock ticker - check rate limit
      if (!rateLimiter.canMakeRequest('polygon')) {
        throw new Error('Polygon rate limit exceeded');
      }
      
      rateLimiter.recordRequest('polygon');
      value = await fetchWithBackoff(() => fetchPolygonPrice(key));
    }
    
    // Store in cache
    cache.set(key, value);
    
    return { success: true, key, value };
  } catch (error) {
    console.error(`[PriceService] Failed to fetch ${key}:`, error.message);
    
    // Try to use stale cache
    const staleEntry = cache.getRaw(key);
    if (staleEntry) {
      console.log(`[PriceService] Using stale cache for ${key}`);
      return { success: false, key, value: staleEntry.value, stale: true, error: error.message };
    }
    
    // No stale cache available
    return { success: false, key, error: error.message };
  }
}

/**
 * Fetch all prices with intelligent batching to respect rate limits
 * Polygon limit: 5 calls/min, so we batch and add delays
 * @returns {Promise<Object>} Results object with data, errors, successes
 */
export async function fetchAllPrices() {
  const results = {
    data: {
      btc: null,
      eurUsd: 1.05,
    },
    errors: [],
    successes: [],
    cached: false,
    partial: false,
    stale: false,
  };
  
  // Check cache first - if all are cached and fresh, return immediately
  const cachedBtc = cache.get('btc');
  const cachedMSTR = cache.get('MSTR');
  const cachedEur = cache.get('eurUsd');
  const cachedSTRF = cache.get('STRF');
  const cachedSTRC = cache.get('STRC');
  const cachedSTRK = cache.get('STRK');
  const cachedSTRD = cache.get('STRD');
  
  if (cachedBtc && cachedMSTR && cachedEur && cachedSTRF && cachedSTRC && cachedSTRK && cachedSTRD) {
    console.log('[PriceService] All prices cached, returning immediately');
    return {
      data: {
        btc: cachedBtc,
        MSTR: cachedMSTR,
        eurUsd: cachedEur,
        STRF: cachedSTRF,
        STRC: cachedSTRC,
        STRK: cachedSTRK,
        STRD: cachedSTRD,
      },
      errors: [],
      successes: ['BTC', 'MSTR', 'EUR/USD', 'STRF', 'STRC', 'STRK', 'STRD'],
      cached: true,
      partial: false,
      stale: false,
    };
  }
  
  // Need to fetch some/all prices
  console.log('[PriceService] Fetching prices (cache miss or stale)...');
  
  const [btcResult, eurResult] = await Promise.all([
    fetchAndCachePrice('btc'),
    fetchAndCachePrice('eurUsd'),
  ]);
  
  // Process BTC
  if (btcResult.success) {
    results.data.btc = btcResult.value;
    results.successes.push('BTC');
  } else {
    results.errors.push(`BTC: ${btcResult.error}`);
    if (btcResult.stale) {
      results.data.btc = btcResult.value;
      results.stale = true;
    } else {
      results.data.btc = 100000; // fallback
    }
  }
  
  // Process EUR/USD
  if (eurResult.success) {
    results.data.eurUsd = eurResult.value;
    results.successes.push('EUR/USD');
  } else {
    results.errors.push(`EUR/USD: ${eurResult.error}`);
    results.data.eurUsd = eurResult.stale ? eurResult.value : 1.05;
  }
  
  // Polygon stocks - batch to respect rate limits
  const stocks = ['MSTR', 'STRF', 'STRC', 'STRK', 'STRD'];
  
  for (const ticker of stocks) {
    // Check if already cached
    const cached = cache.get(ticker);
    if (cached) {
      results.data[ticker] = cached;
      results.successes.push(ticker);
      continue;
    }
    
    // Fetch with rate limit check
    const result = await fetchAndCachePrice(ticker);
    
    if (result.success) {
      results.data[ticker] = result.value;
      results.successes.push(ticker);
    } else {
      results.errors.push(`${ticker}: ${result.error}`);
      if (result.stale) {
        results.data[ticker] = result.value;
        results.stale = true;
      } else {
        results.data[ticker] = ticker === 'MSTR' ? null : { price: 100, avg10d: 100 };
      }
      results.partial = true;
    }
    
    const usage = rateLimiter.getUsage('polygon');
    if (usage.used >= CONFIG.POLYGON_RATE_LIMIT - 1 && ticker !== stocks[stocks.length - 1]) {
      console.log('[PriceService] Rate limit approaching, waiting 12s...');
      await sleep(12000);
    }
  }
  
  return results;
}

