# Frontend - Strategy BTC Dashboard

React application for visualizing Strategy's Bitcoin holdings and capital structure with real-time price data.

## Tech Stack

- **React 18** - UI framework
- **Vite 7** - Build tool and dev server
- **Recharts 2** - Interactive charts
- **Vitest 4** - Testing framework

## Quick Start

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

Runs on `http://localhost:5173` with hot module replacement (HMR).

### Build for Production

```bash
npm run build
```

Outputs to `dist/` directory.

### Run Tests

```bash
npm test              # Run tests once
npm run test:watch    # Watch mode (TDD)
npm run test:coverage # With coverage report
```

## Architecture

### Module Structure

```
frontend/src/
├── main.jsx              # Application entry point
├── StrategyDashboard.jsx # Main app component (orchestration)
├── components.jsx        # Reusable UI components
├── calculations.js       # Pure business logic functions
├── api.js               # API client (calls backend service)
└── constants.js         # Configuration and static data
```

### Data Flow

```
User Opens App
    ↓
main.jsx → StrategyDashboard.jsx
    ↓
useEffect (on mount)
    ↓
api.js → fetchAllPrices()
    ↓
Backend API (/api/prices/all)
    ↓
setPrices({btc, mstr, eurUsd, STRF, ...})
    ↓
useMemo → calculations.js
    ↓
    ├─ calculateWaterfall()
    ├─ calculateCostOfCapital()
    ├─ calculateNavBleed()
    └─ generateScenarioData()
    ↓
Render components.jsx
    ↓
User sees dashboard
```

## Module Reference

### constants.js

**Purpose:** Centralized configuration and static data.

**Exports:**
- `POLYGON_API_KEY` - API key for fallback direct API calls
- `COLORS` - UI color scheme (Bitcoin orange theme with dark mode)
- `STATIC_DATA` - Company financial data:
  - Bitcoin holdings (660,624 BTC as of 12/07/2025)
  - Common shares outstanding (300.8M)
  - Convertible notes with conversion prices and maturity
  - Preferred stock details (STRF, STRC, STRE, STRK, STRD)
  - USD reserve ($1.44B for dividends/interest)

**Updating Data:** Edit `STATIC_DATA` when quarterly filings are released.

### calculations.js

**Purpose:** Pure business logic functions with no side effects.

**Key Functions:**

1. **`formatNumber(num, decimals)`** - Format currency with B/M/K suffixes
2. **`formatBtc(num)`** - Format Bitcoin amounts with ₿ symbol
3. **`calculateWaterfall({...})`** - Core waterfall engine (see Business Logic section in root README)
4. **`calculateCostOfCapital(...)`** - Annual dividend and interest costs
5. **`calculateNavBleed(...)`** - Discount from par on preferred issuance
6. **`generateScenarioData(...)`** - Multi-scenario analysis for charts

**Why Pure Functions:** Testable, reusable, and easy to reason about.

### api.js

**Purpose:** API client for fetching prices from backend service.

**Key Functions:**

1. **`fetchAllPrices(force)`** - Fetches all prices from backend `/api/prices/all`
2. **`fetchAllPricesSequentially()`** - Fallback: direct API calls if backend is down
3. **`fetchPolygonPrice(ticker)`** - Direct Polygon.io fetch (fallback only)
4. **`fetchBtcPrice()`** - Direct CoinGecko fetch (fallback only)
5. **`fetchEurUsdRate()`** - Direct ExchangeRate-API fetch (fallback only)

**Backend First:** Always tries backend API first, falls back to direct calls if unavailable.

### components.jsx

**Purpose:** Reusable React UI components.

**Exported Components:**

- **`Card`** - Container with consistent styling
- **`Metric`** - Labeled financial metrics display
- **`Toggle`** - Checkbox toggle (e.g., ITM converts as equity)
- **`CapitalStructureChart`** - Horizontal bar chart showing BTC claims by priority
- **`ScenarioChart`** - Line chart: sats/share vs BTC price
- **`CapitalStackTable`** - Detailed table of all securities
- **`ScenarioTable`** - BTC price scenario analysis

**Design:** Small, focused components with props for customization.

### StrategyDashboard.jsx

**Purpose:** Main application component that orchestrates everything.

**Responsibilities:**
- Fetches prices on mount via `useEffect`
- Calculates waterfall with `useMemo` (performance optimization)
- Manages state (ITM converts toggle, loading, errors)
- Renders layout using imported components

**State Management:**
- `prices` - Current market prices
- `itmConvertsAsEquity` - Toggle for ITM conversion treatment
- `loading` - Loading state
- `errors` - API error tracking

### main.jsx

**Purpose:** Application entry point.

**Contents:**
- Imports React, ReactDOM, and StrategyDashboard
- Mounts app to `#root` element
- Wraps in `React.StrictMode` for development warnings

## Development Workflow

### Making Changes

```bash
# 1. Start dev server
npm run dev

# 2. Edit files in src/
#    - Changes appear instantly (HMR)
#    - State is preserved (React Fast Refresh)

# 3. Run tests
npm run test:watch

# 4. Before committing
npm test
```

### Adding New Features

1. **Business Logic** → Add to `calculations.js` + write tests
2. **UI Component** → Add to `components.jsx`
3. **Data Fetching** → Modify `api.js` (usually not needed with backend)
4. **Orchestration** → Update `StrategyDashboard.jsx`

### Testing Strategy

**Unit Tests:**
- `calculations.test.js` - Business logic, waterfall calculations
- `api.test.js` - API client, error handling

**Coverage:** Run `npm run test:coverage` to generate reports.

## Building & Deployment

### Production Build

```bash
npm run build
```

Creates optimized bundle in `dist/`:
- Minified JavaScript
- Tree-shaken (unused code removed)
- Code splitting for faster loads
- Source maps for debugging

### Preview Production Build

```bash
npm run preview
```

Serves production build locally at `http://localhost:4173`.

### Deploy Options

**Netlify:**
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

**Vercel:**
```bash
npm install -g vercel
npm run build
vercel --prod
```

**Static Hosting:**
Upload `dist/` contents to any static host (AWS S3, GitHub Pages, etc.).

### Environment Variables

For production, set backend URL in `vite.config.js` or use environment variables:

```javascript
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: process.env.VITE_BACKEND_URL || 'http://localhost:3001',
      changeOrigin: true,
    },
  },
}
```

## Configuration

### Vite Config (`vite.config.js`)

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
```

**Proxy:** Routes `/api/*` requests to backend service during development.

### Updating Financial Data

Edit `src/constants.js` → `STATIC_DATA` when Strategy releases quarterly filings:

```javascript
export const STATIC_DATA = {
  btcHoldings: 660624,             // Update from 10-Q/10-K
  basicSharesOutstanding: 300800,  // Update (in thousands)
  usdReserve: 1440000000,          // Update USD reserve
  // ... preferred stock details ...
};
```

**Data Sources:**
- SEC filings: https://www.sec.gov (search ticker: MSTR)
- Strategy website: https://www.strategy.com
- Press releases for BTC holdings updates

## Performance Optimization

### Current Optimizations

1. **`useMemo`** - Expensive waterfall calculations only run when inputs change
2. **React Fast Refresh** - State preserved during development
3. **Code Splitting** - Vite automatically splits large bundles
4. **Tree Shaking** - Unused code removed in production

### Profiling

Use React DevTools Profiler to identify slow renders:

1. Install React DevTools extension
2. Open DevTools → Profiler tab
3. Record interaction
4. Analyze component render times

## Troubleshooting

### Prices Not Loading

1. **Check backend is running:** `curl http://localhost:3001/api/health`
2. **Check browser console:** F12 → Console tab for errors
3. **Verify proxy config:** Ensure `vite.config.js` proxy is correct

### Build Errors

```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Test Failures

```bash
# Run tests in verbose mode
npm test -- --reporter=verbose

# Run specific test file
npm test -- tests/calculations.test.js
```

## Browser Compatibility

- **Chrome** 90+
- **Firefox** 88+
- **Safari** 14+
- **Edge** 90+
- No IE11 support (uses ES modules)

## License

MIT License - See root LICENSE file.

---

**Last Updated:** December 15, 2025  
**React Version:** 18.2.0  
**Vite Version:** 7.2.7

