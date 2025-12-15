# Price Caching Backend Service

Backend microservice for caching price data with intelligent rate limiting, exponential backoff, and proactive cache refreshing.

## Features

- ✅ In-memory cache with randomized TTL (300-600s)
- ✅ Background scheduler keeps cache perpetually warm
- ✅ Exponential backoff: 16s, 32s, 64s, 128s, 256s
- ✅ Rate limit management (Polygon: 5 calls/min)
- ✅ Graceful degradation (stale cache → fallbacks)
- ✅ Sub-millisecond response times (99% cache hits)
- ✅ Automatic cache seeding on startup

## Quick Start

### 1. Create Environment File

Create `.env` in this directory:

```bash
# From project root
cat > backend/.env << 'EOF'
POLYGON_API_KEY=<API_KEY_HERE>
PORT=3001
EOF
```

Or manually create `backend/.env`:
```
POLYGON_API_KEY=<API_KEY_HERE>
PORT=3001
```

### 2. Install Dependencies

```bash
# From backend directory
npm install
```

### 3. Start Server

```bash
npm start
```

Or use `npm run dev` for auto-reload on changes.

**Expected output:**
```
🚀 Price Caching Service running on port 3001
📊 Cache TTL: 300-600s (randomized)
🔄 Scheduler: Every 30s
⏱️  Backoff: 16s base, 5 retries

[Scheduler] Seeding cache on startup...
[Cache] SET btc, TTL: 456s, expires: 2025-12-14T...
[Scheduler] Cache seeded: 7 successes, 0 errors
[Scheduler] Background scheduler running
```

### 4. Verify Backend

```bash
curl http://localhost:3001/api/health
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Express Backend (Port 3001)                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Background Scheduler (every 30s)                     │  │
│  │  • Checks cache TTLs                                  │  │
│  │  • Refreshes entries with < 60s remaining            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  In-Memory Cache                                      │  │
│  │  • TTL: 300-600s (randomized)                        │  │
│  │  • 99% hit rate after warm-up                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Rate Limiter                                         │  │
│  │  • Polygon: 5 calls/min                              │  │
│  │  • Sliding window counter                            │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ External API calls (only on cache miss)
                       │
        ┌──────────────┼──────────────┐
        │              │               │
        ▼              ▼               ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  CoinGecko   │ │ Polygon  │ │ ExchangeRate │
│  (BTC price) │ │ (Stocks) │ │  (EUR/USD)   │
└──────────────┘ └──────────┘ └──────────────┘
```

## How It Works

### Cold Start (Server Boot)

1. Backend starts
2. Scheduler immediately seeds cache (fetches all 7 prices)
3. Takes ~15 seconds for initial fetch
4. Cache is now warm

### Normal Operation

1. **Client requests prices** → `GET /api/prices/all`
2. **Backend checks cache** → All prices cached and fresh?
3. **Returns instantly** → Sub-millisecond response (0.5ms typical)
4. **Background scheduler** → Every 30s, checks TTLs
5. **Proactive refresh** → Refreshes any price with < 60s TTL remaining
6. **Result:** Cache entries never actually expire in production

### Exponential Backoff on Failures

If an API call fails (429 rate limit, timeout, etc.):

```
Attempt 1: Immediate
Attempt 2: Wait 16s
Attempt 3: Wait 32s
Attempt 4: Wait 64s
Attempt 5: Wait 128s
Attempt 6: Wait 256s (if needed)
```

Total: ~8.5 minutes of retries before giving up.

### Graceful Degradation

1. **API fails** → Try exponential backoff
2. **All retries fail** → Use stale cache (if exists)
3. **No stale cache** → Use fallback value (100000 for BTC, etc.)
4. **Backend down** → Frontend falls back to direct API calls

## API Endpoints

### GET /api/prices/all

Returns all prices with metadata.

**Query params:**
- `?force=true` - Bypass cache, force fresh fetch

**Example:**
```bash
curl http://localhost:3001/api/prices/all
```

**Response:**
```json
{
  "data": {
    "btc": 100000,
    "eurUsd": 1.05,
    "MSTR": { "price": 420.50, "high": 425, "low": 415, "volume": 5000000 },
    "STRF": { "price": 100.25, "high": 102, "low": 98, "volume": 1000000 },
    "STRC": { "price": 99.80, "high": 101, "low": 97, "volume": 950000 },
    "STRK": { "price": 101.10, "high": 103, "low": 99, "volume": 1100000 },
    "STRD": { "price": 98.50, "high": 100, "low": 96, "volume": 900000 }
  },
  "metadata": {
    "cached": true,
    "partial": false,
    "stale": false,
    "degraded": false,
    "timestamp": "2025-12-14T12:00:00.000Z",
    "ttls": {
      "btc": 234,
      "eurUsd": 389,
      "MSTR": 456,
      "STRF": 512,
      "STRC": 301,
      "STRK": 445,
      "STRD": 578
    }
  },
  "errors": [],
  "successes": ["BTC", "EUR/USD", "MSTR", "STRF", "STRC", "STRK", "STRD"]
}
```

### GET /api/health

Cache statistics and system health.

**Example:**
```bash
curl http://localhost:3001/api/health | jq
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-14T12:00:00.000Z",
  "cache": {
    "size": 7,
    "hits": 150,
    "misses": 7,
    "sets": 14,
    "hitRate": 0.95,
    "entries": [
      { "key": "btc", "age": 120, "ttl": 234, "expired": false, "expiresAt": "..." }
    ]
  },
  "rateLimits": {
    "polygon": {
      "used": 2,
      "limit": 5,
      "remaining": 3,
      "resetIn": 42
    }
  },
  "scheduler": {
    "running": true,
    "interval": 30,
    "seedOnStartup": true,
    "refreshThreshold": 60
  }
}
```

### GET /api/ping

Simple connectivity check.

```bash
curl http://localhost:3001/api/ping
```

## Configuration

Edit `config.js` to customize:

```javascript
export const CONFIG = {
  TTL_MIN: 300,           // 5 minutes minimum cache TTL
  TTL_MAX: 600,           // 10 minutes maximum cache TTL
  REFRESH_THRESHOLD: 60,  // Refresh when 60s remaining
  SCHEDULER_INTERVAL: 30, // Check every 30 seconds
  POLYGON_RATE_LIMIT: 5,  // 5 calls per minute
  MAX_RETRIES: 5,         // Exponential backoff attempts
  BASE_DELAY: 16000,      // 16s base delay for backoff
  PORT: 3001,
  SEED_ON_STARTUP: true,  // Populate cache on server start
};
```

## Testing

The test suite is organized into three categories for fast feedback:

### Quick Start

```bash
# Fast unit tests (default) - ~1 second
npm test

# All tests - ~20 seconds
npm test:all
```

### Test Categories

| Category | Files | Duration | Command | Use Case |
|----------|-------|----------|---------|----------|
| **Unit (Fast)** | cache, rateLimiter | ~1s | `npm test` | Daily development |
| **Slow** | priceService, scheduler | ~5-8s | `npm test:slow` | Testing logic with delays |
| **Integration** | server, fullFlow | ~10-15s | `npm test:integration` | Testing HTTP endpoints |
| **All Tests** | Everything | ~20s | `npm test:all` | Before commit/push |

### Test Commands

```bash
# Unit tests (fast)
npm test                    # Run unit tests (~1s)
npm run test:watch          # Watch mode for TDD

# Slow tests
npm test:slow              # Price service & scheduler (~5-8s)
npm run test:watch:slow    # Watch slow tests

# Integration tests
npm test:integration       # Server endpoints & full flow (~10-15s)

# All tests
npm test:all              # Complete test suite (~20s)
npm run test:coverage     # With coverage report
```

### Test Structure

```
tests/
├── unit/                    # Fast unit tests (~1s total)
│   ├── cache.test.js       # Cache operations, TTL, expiry
│   └── rateLimiter.test.js # Sliding window, limits, reset
├── slow/                    # Slower tests (~5-8s total)
│   ├── priceService.test.js # API calls, backoff, retries
│   └── scheduler.test.js    # Background refresh, timers
└── integration/             # Integration tests (~10-15s total)
    ├── server.test.js       # HTTP endpoints, responses
    └── fullFlow.test.js     # End-to-end scenarios
```

### Coverage

Tests cover:
- ✓ Cache operations (set/get/TTL/expiry/stats)
- ✓ Rate limiter (sliding window/reset)
- ✓ Exponential backoff (16s, 32s, 64s, 128s, 256s)
- ✓ Price service (BTC/stocks/EUR, retries, failures)
- ✓ Scheduler (background refresh, TTL checks)
- ✓ Server endpoints (200/207/503 responses)
- ✓ Full flow (cold start → cache → requests)
- ✓ Graceful degradation (stale cache → fallbacks)

### Workflow Recommendations

```bash
# During active development (fast feedback)
npm run test:watch          # Auto-run unit tests on file changes

# Before committing
npm test && npm test:slow   # ~6 seconds total

# Before pushing / CI pipeline
npm test:all               # Full test suite

# Debugging specific category
npm test:slow              # Just price service & scheduler
npm test:integration       # Just server endpoints
```

## Troubleshooting

### Backend won't start

- Check `backend/.env` exists with `POLYGON_API_KEY`
- Verify port 3001 is not in use: `lsof -i :3001`
- Check logs for error messages

### Prices not updating

- Check `/api/health` for scheduler status
- Verify TTLs are decreasing over time
- Force refresh with `?force=true`

### Rate limit errors

- Check `/api/health` → `rateLimits.polygon.used`
- Wait 60s for rate limit window to reset
- Scheduler will automatically retry with backoff

### API key errors

**Test API key:**
```bash
curl "https://api.polygon.io/v2/aggs/ticker/MSTR/prev?apiKey=YOUR_KEY_HERE"
```

If invalid, update `backend/.env` with a valid key from https://polygon.io/

## Future Enhancements

- [ ] Add Redis for multi-instance scaling
- [ ] Implement WebSocket for real-time price updates
- [ ] Add database for historical price tracking
- [ ] Deploy backend separately (Railway, Fly.io, AWS Lambda)
- [ ] Add API authentication/rate limiting
- [ ] Implement GraphQL for flexible querying
