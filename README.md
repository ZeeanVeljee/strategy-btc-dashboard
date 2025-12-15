# Strategy BTC Dashboard

A real-time financial dashboard for analyzing Strategy's Bitcoin holdings and capital structure. Features intelligent price caching, rate limiting, and graceful degradation.

## Features

- ✅ Real-time BTC and stock price fetching
- ✅ Capital structure analysis with preferred stock waterfall
- ✅ BTC/share calculations after senior claims
- ✅ Interactive charts with Recharts
- ✅ Backend caching service (sub-millisecond response times)
- ✅ Comprehensive test coverage

## Quick Start

### Prerequisites

- **Node.js** (version 18.x or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)

### Installation

```bash
# 1. Clone or navigate to project directory
cd strategy-btc-dashboard

# 2. Install all dependencies (frontend and backend)
npm run install:all

# Or install manually:
# cd frontend && npm install && cd ../backend && npm install && cd ..

# 3. Create backend environment file
cat > backend/.env << 'EOF'
POLYGON_API_KEY=<API_KEY_HERE>
PORT=3001
EOF
```

### Running the Application

**Start both frontend and backend:**

```bash
npm run dev
```

This starts:
- Backend on `http://localhost:3001` (price caching service)
- Frontend on `http://localhost:5173` (React app)

**First startup takes ~15 seconds** as the backend seeds the cache.

**Expected output:**
```
[backend] 🚀 Price Caching Service running on port 3001
[backend] [Scheduler] Seeding cache on startup...
[backend] [Scheduler] Cache seeded: 7 successes, 0 errors
[frontend] VITE v7.2.7  ready in 234 ms
[frontend] ➜  Local:   http://localhost:5173/
```

Open `http://localhost:5173` in your browser!

### Alternative: Run Separately (For Debugging)

**Terminal 1 - Backend:**
```bash
cd backend && node server.js
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Monorepo Root                           │
│                                                              │
│  ┌────────────────────┐         ┌────────────────────┐     │
│  │   frontend/        │         │   backend/         │     │
│  │   (React + Vite)   │         │   (Express)        │     │
│  │   Port 5173        │◄────────┤   Port 3001        │     │
│  │                    │ /api/*  │   Cache Service    │     │
│  └────────────────────┘  Proxy  └────────────────────┘     │
│                                           │                  │
│                                           │                  │
│                                           ▼                  │
│                                  External APIs               │
│                            (CoinGecko, Polygon, etc.)        │
└─────────────────────────────────────────────────────────────┘
```

### How The Backend Works

1. **Cold Start:** Backend starts → Seeds cache with all prices (~15s)
2. **Client Request:** Frontend requests prices → Backend returns from cache (0.5ms)
3. **Background Refresh:** Every 30s, scheduler checks cache TTLs and refreshes entries < 60s remaining
4. **Result:** 99% cache hit rate, sub-millisecond responses

For more details, see [`backend/README.md`](backend/README.md).

## Business Logic

### Capital Structure Waterfall

This dashboard calculates the **true Bitcoin per share** for Strategy (MSTR) common shareholders after accounting for senior claims. Unlike the simple "total BTC / total shares" calculation, this provides an accurate picture of common shareholder exposure.

### Priority of Claims

When Strategy's BTC holdings are liquidated, claims are satisfied in this order:

1. **Convertible Debt** (unless in-the-money and treated as equity)
   - Multiple tranches with different conversion prices and maturity dates
   - If BTC price > conversion price, can be treated as equity dilution
   
2. **STRF** - Preferred Stock with dynamic liquidation preference
   - Liquidation preference = 10-day VWAP of MSTR stock
   - Adjusts based on market conditions
   
3. **STRC** - Preferred Stock with fixed $100 liquidation preference
   
4. **STRE** - Euro-denominated Preferred Stock
   - Fixed €100 liquidation preference
   - Converted to USD using EUR/USD exchange rate
   
5. **STRK** - Preferred Stock with dynamic preference and conversion
   - Liquidation preference = 10-day VWAP of MSTR stock
   - Converts to common if MSTR/10 > liquidation preference
   
6. **STRD** - Preferred Stock with fixed $100 liquidation preference
   
7. **Common Equity** - Residual BTC after all senior claims

### Key Calculations

**`calculateWaterfall()`** - Core calculation engine that:
- Takes current BTC price, stock prices, and company data
- Distributes BTC across the capital structure by priority
- Calculates BTC/share for common equity
- Returns detailed breakdown of all claims

**`calculateCostOfCapital()`** - Annual cost analysis:
- Dividend costs on preferred stock
- Interest costs on convertible debt
- Shows burden on USD reserve
- Percentage of total BTC value

**`calculateNavBleed()`** - Issuance discount analysis:
- Difference between notional value and gross proceeds
- Opportunity cost in BTC terms
- Shows dilution impact on existing holders

**`generateScenarioData()`** - Scenario modeling:
- Runs waterfall across multiple BTC prices
- Shows how senior claims % changes with BTC price
- Identifies optimal price ranges for common shareholders

### Interactive Features

**ITM Converts Toggle:**
- Toggle between treating in-the-money convertible notes as debt or equity
- Shows impact on dilution and BTC/share
- Helps model different liquidation scenarios

**Real-time Data:**
- BTC price from CoinGecko
- MSTR and preferred stock prices from Polygon.io
- EUR/USD exchange rate for STRE calculations
- Sub-second cache response times via backend service

### Use Cases

1. **Valuation Analysis** - True BTC exposure per common share
2. **Scenario Planning** - Impact of BTC price changes on shareholder value
3. **Cost Tracking** - Annual dividend and interest burden
4. **Dilution Analysis** - Effect of new preferred issuances
5. **Capital Structure** - Visualization of claims priority

For detailed module documentation, see [`frontend/README.md`](frontend/README.md).

## Project Structure

```
strategy-btc-dashboard/
├── frontend/                 # React application
│   ├── src/
│   │   ├── main.jsx         # Entry point
│   │   ├── StrategyDashboard.jsx # Main app component
│   │   ├── components.jsx   # UI components
│   │   ├── calculations.js  # Business logic
│   │   ├── api.js          # API client (calls backend)
│   │   └── constants.js    # Config and static data
│   ├── tests/
│   │   ├── calculations.test.js # Calculations tests
│   │   └── api.test.js     # API tests
│   ├── index.html          # HTML entry point
│   ├── vite.config.js      # Vite configuration (includes proxy)
│   ├── package.json        # Frontend dependencies
│   └── node_modules/
├── backend/                 # Price caching service
│   ├── server.js           # Express server
│   ├── cache.js            # In-memory cache with TTL
│   ├── priceService.js     # API fetching with backoff
│   ├── scheduler.js        # Background cache refresh
│   ├── rateLimiter.js      # Rate limit management
│   ├── config.js           # Configuration
│   ├── tests/              # Backend tests (unit + integration)
│   ├── README.md           # Backend documentation
│   ├── package.json        # Backend dependencies
│   └── node_modules/
├── scripts/
│   └── dev.js              # Development server launcher
├── package.json            # Root orchestrator
├── README.md               # This file (overview + business logic)
├── frontend/README.md      # Frontend architecture and development
└── backend/README.md       # Backend service documentation
```

**See Also:**
- [`frontend/README.md`](frontend/README.md) - Frontend architecture, components, testing
- [`backend/README.md`](backend/README.md) - Backend service, caching, API endpoints

## Running Tests

### Frontend Tests

```bash
# Run all frontend tests
npm run test:frontend

# Or from frontend directory
cd frontend
npm test              # Run tests once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

### Backend Tests

```bash
cd backend

# Fast unit tests (~1s)
npm test

# Slow tests (with delays, ~5-8s)
npm test:slow

# Integration tests (~10-15s)
npm test:integration

# All tests (~20s)
npm test:all
```

### Run All Tests

```bash
npm test
```

Runs both frontend tests (~200ms) and backend unit tests (~1s). **Total: ~1-2 seconds.**

For comprehensive backend tests (including slow and integration tests):
```bash
cd backend && npm test:all  # ~20 seconds
```

## Configuration

### API Keys

**Backend:** Edit `backend/.env`
```
POLYGON_API_KEY=your_key_here
PORT=3001
```

**Frontend:** The frontend now calls the backend API by default. For direct API access (fallback), edit `frontend/src/constants.js`:
```javascript
export const POLYGON_API_KEY = 'your_key_here';
```

Get your free API key at https://polygon.io/ (free tier: 5 calls/min).

### Updating Financial Data

Edit `frontend/src/constants.js` → `STATIC_DATA`:

```javascript
export const STATIC_DATA = {
  btcHoldings: 660624,             // Update this
  basicSharesOutstanding: 300800,  // Update this (in thousands)
  usdReserve: 1440000000,          // Update this
  // ... etc
};
```

**Data Sources:**
- Strategy's quarterly filings (10-Q, 10-K) at https://www.sec.gov
- Strategy's website: https://www.strategy.com
- Bitcoin holdings: Press releases
- Preferred stock details: Prospectus filings

## Development Workflow

```bash
# 1. Start dev servers (both frontend + backend)
npm run dev

# 2. Make code changes in frontend/ or backend/
#    - Frontend: Changes appear instantly (HMR)
#    - Backend: Restart backend or use --watch flag

# 3. Run tests (in another terminal)
cd frontend && npm run test:watch  # Frontend tests
cd backend && npm run test:watch   # Backend tests

# 4. Before committing
npm test                    # Run all tests
```

### Development Tips

**1. Use React DevTools**
Install the browser extension to inspect component state and performance.

**2. Monitor Backend Health**
```bash
curl http://localhost:3001/api/health | jq
```

**3. Force Cache Refresh**
```bash
curl http://localhost:3001/api/prices/all?force=true
```

**4. Mock API Calls During Heavy Development**
Set `DEV_MODE = true` in `frontend/src/api.js` to use mock data and avoid rate limits.

## Production Build

```bash
# Build optimized production assets
npm run build

# Preview production build locally
npm run preview
```

Outputs to `dist/` directory.

## Deployment

### Deploy Frontend to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

### Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Deploy Backend

The backend is a standard Node.js/Express app. Deploy to:
- **Railway:** Connect Git repo, auto-deploy
- **Fly.io:** `fly launch` from `backend/` directory
- **AWS Lambda:** Use serverless framework or AWS SAM
- **Heroku:** Standard Node.js buildpack

**Required Environment Variables:**
- `POLYGON_API_KEY`
- `PORT` (usually auto-set by platform)

## Troubleshooting

### Backend won't start

**SIGKILL Error:**
```bash
# Create missing .env file
cat > backend/.env << 'EOF'
POLYGON_API_KEY=hhJDHpnbMIP1sFupse8YHfKgE_D84cyA
PORT=3001
EOF

# Restart
npm run dev
```

**Port already in use:**
```bash
# Check what's using port 3001
lsof -i :3001

# Kill process or change PORT in backend/.env
```

**Dependencies missing:**
```bash
# Reinstall all dependencies
rm -rf node_modules backend/node_modules
npm install
cd backend && npm install
```

### Frontend not loading prices

**Check backend is running:**
```bash
curl http://localhost:3001/api/health
```

**Check browser console:** F12 → Console tab for error messages

**Force refresh backend cache:**
```bash
curl http://localhost:3001/api/prices/all?force=true
```

### Rate limit errors

The backend automatically handles rate limits with exponential backoff (16s, 32s, 64s, 128s, 256s).

**Check rate limit status:**
```bash
curl http://localhost:3001/api/health | jq '.rateLimits'
```

Wait 60s for the Polygon rate limit window to reset.

## Documentation

- **Frontend:** [`frontend/README.md`](frontend/README.md) - Components, architecture, testing, deployment
- **Backend:** [`backend/README.md`](backend/README.md) - Caching service, API endpoints, configuration
- **Business Logic:** See "Business Logic" section above for capital structure calculations

## External Resources

- React docs: https://react.dev/
- Vite docs: https://vitejs.dev/
- Recharts docs: https://recharts.org/
- Vitest docs: https://vitest.dev/
- Express docs: https://expressjs.com/

## License

MIT License - Feel free to use and modify as needed.

---

**Tech Stack:** React 18 + Vite 7 + Express 4 + Vitest 4 + Recharts 2  
**Node Version:** 18.x or higher recommended  
**Last Updated:** December 15, 2025

