# Strategy BTC Dashboard - Project Structure

## Overview

This dashboard calculates the true Bitcoin (BTC) per share value for Strategy (MSTR) common shareholders after accounting for senior claims from convertible debt notes and multiple classes of preferred stock (STRF, STRC, STRE, STRK, STRD).

This provides a more accurate picture of common shareholder exposure to BTC compared to the simple "total BTC / total shares" calculation.

## File Structure

```
strategy-btc-dashboard/
├── src/
│   ├── main.jsx                # Application entry point
│   ├── StrategyDashboard.jsx   # Main application component
│   ├── components.jsx          # React UI components
│   ├── calculations.js         # Business logic and calculation functions
│   ├── api.js                  # External API fetching functions
│   └── constants.js            # Configuration, colors, and static data
├── tests/
│   ├── calculations.test.js    # Unit tests for calculations
│   └── api.test.js             # Unit tests for API functions
├── coverage/                   # Test coverage reports
├── dist/                       # Production build output
├── index.html                  # HTML entry point
├── vite.config.js              # Vite configuration
├── package.json                # Dependencies and scripts
├── PROJECT_STRUCTURE.md        # This file
└── SETUP.md                    # Setup and run instructions
```

## Module Breakdown

### 1. constants.js

**Purpose:** Centralized configuration and static data.

**Contents:**
- `POLYGON_API_KEY`: API key for Polygon.io stock data
- `COLORS`: Color scheme for the UI (Bitcoin orange theme with dark mode)
- `STATIC_DATA`: Company data including:
  - Bitcoin holdings (660,624 BTC as of 12/07/2025)
  - Common shares outstanding (300.8M)
  - Convertible notes with conversion prices and maturity dates
  - Preferred stock details (STRF, STRC, STRE, STRK, STRD)
  - USD reserve ($1.44B for dividends/interest)

**Why separate:** Makes it easy to update financial data without touching business logic.

### 2. calculations.js

**Purpose:** Pure business logic functions with no side effects.

**Exported Functions:**

1. **`formatNumber(num, decimals)`**
   - Formats currency with B/M/K suffixes
   - Example: `1500000000 → "$1.50B"`

2. **`formatBtc(num)`**
   - Formats Bitcoin amounts with ₿ symbol or satoshis
   - Example: `660624 → "₿660,624"`, `0.00012345 → "₿0.00012345"`

3. **`calculateWaterfall({params})`**
   - Core calculation engine
   - Distributes BTC across capital structure priority:
     1. Convertible Debt (unless in-the-money and treated as equity)
     2. STRF (dynamic liquidation preference)
     3. STRC (fixed $100 liquidation preference)
     4. STRE (Euro-denominated, fixed $100 liq pref)
     5. STRK (dynamic liq pref, converts if MSTR/10 > liq pref)
     6. STRD (fixed $100 liquidation preference)
     7. Common Equity (residual BTC)
   - Returns detailed waterfall structure with BTC/share metrics

4. **`calculateCostOfCapital(preferredData, debtData, eurUsdRate)`**
   - Calculates annual dividend and interest costs
   - Returns breakdown by security and total cost

5. **`calculateNavBleed(preferredData)`**
   - Calculates discount between notional value and gross proceeds
   - Shows opportunity cost of issuing preferred below par

6. **`generateScenarioData(baseData, btcPriceRange, ...)`**
   - Runs waterfall calculation across multiple BTC prices
   - Used for scenario analysis and charts

**Why separate:** Business logic is testable, reusable, and independent of UI or data fetching.

### 3. api.js

**Purpose:** External API interactions with error handling.

**Exported Functions:**

1. **`fetchPolygonPrice(ticker)`**
   - Fetches previous day's close from Polygon.io
   - Returns `{price, volume, high, low, success}`

2. **`fetchPolygon10DayHistory(ticker)`**
   - Fetches 10-day price history for averaging
   - Used for dynamic liquidation preferences

3. **`fetchBtcPrice()`**
   - Fetches current BTC price from CoinGecko
   - Returns USD price or null

4. **`fetchEurUsdRate()`**
   - Fetches EUR/USD exchange rate
   - Defaults to 1.05 on error

5. **`fetchAllPricesSequentially()`**
   - Main orchestrator
   - Fetches all prices with rate limiting (Polygon: 5/min)
   - Returns consolidated results with errors array

**Why separate:** API logic is isolated, mockable for testing, and rate limiting is centralized.

### 4. components.jsx

**Purpose:** Reusable React UI components.

**Exported Components:**

1. **`Card`** - Container with consistent styling
2. **`Metric`** - Displays labeled financial metrics
3. **`Toggle`** - Checkbox toggle with label (e.g., ITM converts as equity)
4. **`CapitalStructureChart`** - Horizontal bar chart showing BTC claims
5. **`ScenarioChart`** - Line chart showing sats/share vs BTC price
6. **`CapitalStackTable`** - Detailed table of all securities
7. **`ScenarioTable`** - BTC price scenario analysis table

**Why separate:** Components are reusable, easier to modify, and can be tested independently.

### 5. StrategyDashboard.jsx

**Purpose:** Main application component that orchestrates everything.

**Structure:**
- Fetches prices on mount using `fetchAllPricesSequentially()`
- Calculates waterfall using `useMemo` for performance
- Manages state (ITM converts toggle, loading, errors)
- Renders UI using imported components

**Why modular:** Single responsibility - orchestration and state management only.

### 6. main.jsx

**Purpose:** Application entry point.

**Contents:**
- Imports React, ReactDOM, and StrategyDashboard
- Mounts the application to the `#root` element
- Wraps in `React.StrictMode` for development checks

## Key Architectural Decisions

### 1. Vite Build Tool
- Fast development server with hot module replacement (HMR)
- Optimized production builds
- Native ES modules support
- React Fast Refresh

### 2. ES Modules (type: "module")
- Modern JavaScript import/export syntax
- Better tree-shaking for production builds
- Explicit dependencies

### 3. Pure Functions in calculations.js
- No side effects
- Same input always produces same output
- Easy to test and reason about
- Example: `calculateWaterfall()` doesn't fetch data, just calculates

### 4. Error Handling in api.js
- All API functions return success/failure status
- Default values prevent app crashes
- Error tracking for debugging

### 5. React Hooks Best Practices
- `useMemo` for expensive calculations
- `useEffect` for data fetching
- `useState` for UI state
- Clean, functional components throughout

### 6. Component Composition
- Small, focused components
- Props for customization
- Consistent styling through COLORS constant

## Testing Strategy

### Unit Tests

**calculations.test.js** - Tests business logic:
- Number formatting edge cases
- Waterfall calculation accuracy
- ITM convert handling
- Dynamic liquidation preferences
- Scenario generation
- Cost of capital calculations

**api.test.js** - Tests API interactions:
- Successful fetches
- Error handling
- Default values
- Rate limiting
- Response parsing

### Coverage
The project includes test coverage reporting via Vitest. Run `npm run test:coverage` to generate reports.

## Data Flow

```
User Opens App
    ↓
main.jsx → StrategyDashboard.jsx
    ↓
useEffect (on mount)
    ↓
api.js → fetchAllPricesSequentially()
    ↓
    ├─ fetchBtcPrice() → CoinGecko
    ├─ fetchEurUsdRate() → ExchangeRate-API
    └─ fetchPolygonPrice() → Polygon.io (MSTR, STRF, STRC, STRK, STRD)
    ↓
setPrices({btc, mstr, eurUsd, STRF, STRC, ...})
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
    ├─ Card, Metric, Toggle
    ├─ CapitalStructureChart
    ├─ ScenarioChart
    ├─ CapitalStackTable
    └─ ScenarioTable
    ↓
User sees dashboard
```

## Key Features

### 1. Capital Structure Waterfall
- Accurately models priority of claims
- Handles in-the-money (ITM) convertible notes
- Dynamic liquidation preferences (STRF, STRK)
- EUR/USD conversion for STRE

### 2. Scenario Analysis
- Shows BTC/share across different BTC prices
- Highlights relationship between BTC price and senior claims %
- Interactive table with percentage changes

### 3. Cost of Capital Tracking
- Annual dividend and interest costs
- Shows burden on USD reserve
- Percentage of total BTC value

### 4. NAV Bleed Analysis
- Discount from par on preferred issuance
- Opportunity cost in BTC terms

### 5. Real-time Price Data
- BTC from CoinGecko
- MSTR and preferreds from Polygon.io
- EUR/USD exchange rate
- Error tracking for failed fetches

### 6. Interactive Controls
- Toggle to treat ITM converts as equity or debt
- Shows impact on dilution and BTC/share

## Maintenance Notes

### Updating Financial Data
1. Edit `src/constants.js` → `STATIC_DATA`
2. Update BTC holdings, shares outstanding, new convertible notes, etc.
3. No need to touch business logic

### Adding New Preferred Stock
1. Add to `STATIC_DATA.preferredStock` in `src/constants.js`
2. Add logic in `calculateWaterfall()` if special handling needed
3. Update `fetchAllPricesSequentially()` if it trades publicly

### Modifying Calculations
1. Edit function in `src/calculations.js`
2. Update corresponding test in `tests/calculations.test.js`
3. Run tests to ensure nothing broke

### Adding New Charts
1. Create component in `src/components.jsx`
2. Import data/calculations as needed
3. Add to `StrategyDashboard.jsx` layout

## Dependencies

### Production
- `react` (^18.2.0) - UI framework
- `react-dom` (^18.2.0) - DOM rendering
- `recharts` (^2.10.0) - Charting library

### Development
- `vite` (^7.2.7) - Build tool and dev server
- `@vitejs/plugin-react` (^5.1.2) - React plugin for Vite
- `vitest` (^4.0.15) - Testing framework with native ES module support

## Performance Considerations

1. **useMemo** - Expensive calculations only run when inputs change
2. **Rate Limiting** - 500ms delay between Polygon API calls
3. **Error Recovery** - Default values prevent loading failures
4. **Lazy Evaluation** - Scenario data only generated when needed
5. **Vite HMR** - Fast development feedback loop

## Browser Compatibility

- Modern browsers with ES6+ support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- No IE11 support (ES modules)

## Security Notes

- API key exposed in constants.js (client-side app)
- Polygon free tier: 5 calls/min limit
- No sensitive user data stored
- All calculations client-side

---

**Last Updated:** December 14, 2025
**Technology Stack:** React + Vite + Vitest + Recharts
