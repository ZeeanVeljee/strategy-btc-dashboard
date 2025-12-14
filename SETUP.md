# Strategy BTC Dashboard - Setup and Run Instructions

## Quick Start

This guide will help you set up and run the Strategy BTC Dashboard locally.

## Prerequisites

### Required Software

1. **Node.js** (version 18.x or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

3. **Git** (optional, for version control)
   - Download from: https://git-scm.com/

### System Requirements

- **OS:** macOS, Windows, or Linux
- **RAM:** 2GB minimum, 4GB recommended
- **Disk Space:** 500MB for dependencies

## Installation

### Step 1: Navigate to Project Directory

```bash
cd strategy-btc-dashboard
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- React and React DOM (UI framework)
- Recharts (charting library)
- Vite (build tool and dev server)
- Vitest (testing framework)


### Step 3: Verify Installation

Check that dependencies were installed:
```bash
npm list --depth=0
```

Expected output:
```
strategy-btc-dashboard@3.0.0
├── @vitejs/plugin-react@5.1.2
├── react@18.2.0
├── react-dom@18.2.0
├── recharts@2.10.0
├── vite@7.2.7
└── vitest@4.0.15
```

## Running the Application

### Development Server

Start the Vite development server:

```bash
npm run dev
```

Expected output:
```
  VITE v7.2.7  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

Open your browser to `http://localhost:5173`

The dev server includes:
- **Hot Module Replacement (HMR)** - Changes appear instantly
- **React Fast Refresh** - Preserves component state during edits
- **Detailed error overlay** - Clear error messages in the browser

### Production Build

Build optimized production assets:

```bash
npm run build
```

This creates a `dist/` directory with optimized, minified code.

### Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

Opens the production build at `http://localhost:4173`

## Running Tests

### Run All Tests

```bash
npm test
```

This runs both `calculations.test.js` and `api.test.js`.

Expected output:
```
✓ tests/calculations.test.js (25 tests) 150ms
✓ tests/api.test.js (12 tests) 89ms

Test Files  2 passed (2)
     Tests  37 passed (37)
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

Tests automatically rerun when files change. Great for TDD workflow.

### Run Tests with Coverage

```bash
npm run test:coverage
```

Generates a coverage report in the `coverage/` directory.

Example output:
```
----------------------|---------|----------|---------|---------|
File                  | % Stmts | % Branch | % Funcs | % Lines |
----------------------|---------|----------|---------|---------|
All files             |   85.23 |    78.45 |   90.12 |   86.34 |
 calculations.js      |   92.15 |    85.71 |   95.00 |   93.21 |
 api.js               |   78.31 |    71.19 |   85.24 |   79.47 |
 constants.js         |  100.00 |   100.00 |  100.00 |  100.00 |
----------------------|---------|----------|---------|---------|
```

Open `coverage/index.html` in your browser for detailed coverage visualization.

## Configuration

### API Keys

The Polygon.io API key is stored in `src/constants.js`:

```javascript
export const POLYGON_API_KEY = 'hhJDHpnbMIP1sFupse8YHfKgE_D84cyA';
```

**To use your own API key:**
1. Sign up at https://polygon.io/ (free tier: 5 calls/min)
2. Copy your API key
3. Replace the value in `src/constants.js`

**Best practice for production:**
Use environment variables instead:

1. Create `.env` file in project root:
```
VITE_POLYGON_API_KEY=your_key_here
```

2. Update `src/constants.js`:
```javascript
export const POLYGON_API_KEY = import.meta.env.VITE_POLYGON_API_KEY || 'fallback_key';
```

3. Add `.env` to `.gitignore` (already done)

### Updating Financial Data

Edit `src/constants.js` → `STATIC_DATA`:

```javascript
export const STATIC_DATA = {
  btcHoldings: 660624,  // Update this
  basicSharesOutstanding: 300800,  // Update this (in thousands)
  usdReserve: 1440000000,  // Update this
  // ... etc
};
```

**Data Sources:**
- Strategy's quarterly filings (10-Q, 10-K) at https://www.sec.gov
- Strategy's website: https://www.strategy.com
- Bitcoin holdings: Usually announced via press release
- Preferred stock details: Prospectus filings

## Project Structure

```
strategy-btc-dashboard/
├── src/
│   ├── main.jsx                # Entry point
│   ├── StrategyDashboard.jsx   # Main app component
│   ├── components.jsx          # UI components
│   ├── calculations.js         # Business logic
│   ├── api.js                  # API fetching
│   └── constants.js            # Config and static data
├── tests/
│   ├── calculations.test.js    # Calculations tests
│   └── api.test.js             # API tests
├── coverage/                   # Test coverage reports
├── dist/                       # Production build (generated)
├── index.html                  # HTML entry point
├── vite.config.js              # Vite configuration
├── package.json                # Dependencies and scripts
├── PROJECT_STRUCTURE.md        # Architecture documentation
└── SETUP.md                    # This file
```

## Common Issues and Troubleshooting

### Issue: `npm: command not found`

**Solution:** Node.js is not installed or not in PATH.

```bash
# macOS with Homebrew
brew install node

# Windows
# Download installer from nodejs.org

# Linux (Ubuntu/Debian)
sudo apt-get install nodejs npm
```

### Issue: `Cannot find module 'react'`

**Solution:** Dependencies not installed.

```bash
npm install
```

If that doesn't work, try deleting `node_modules` and reinstalling:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port 5173 already in use

**Solution:** Either close the other process or use a different port.

```bash
# Use a different port
npm run dev -- --port 3000
```

Or find and kill the process:

```bash
# macOS/Linux
lsof -ti:5173 | xargs kill

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Issue: Polygon API errors in console

**Possible Causes:**

1. **Rate limit exceeded** - Free tier: 5 calls/min
   - Wait 60 seconds and refresh
   - The app has built-in 500ms delays between calls

2. **Invalid API key** - Replace with your own in `src/constants.js`

3. **Weekend/Market closed** - Polygon may not have current data
   - Default values will be used
   - App will still function

### Issue: CORS errors when fetching data

**Solution:** This typically only happens in unusual setups. The Vite dev server handles CORS correctly.

If you encounter CORS issues:
- Ensure you're using `npm run dev` (not opening `index.html` directly)
- Check browser console for specific error messages
- Verify APIs are accessible from your network

### Issue: Tests failing

**Solution:** Ensure you're running tests from the project root:

```bash
# From project root
npm test

# Not from subdirectories
cd tests  # DON'T DO THIS
npm test  # Won't work
```

If tests still fail, check:
- Node version is 18.x or higher: `node --version`
- All dependencies are installed: `npm install`

### Issue: Build fails

**Solution:** Check for syntax errors or missing imports.

```bash
# Run the build with verbose output
npm run build

# Check for TypeScript/linting errors
# (This project uses plain JavaScript, so this is rare)
```

Common causes:
- Missing imports
- Typos in file names
- Circular dependencies

## Development Workflow

### Making Changes

1. **Start dev server**: `npm run dev`
2. **Edit source files** in `src/`
3. **See changes instantly** in browser (HMR)
4. **Update tests** if behavior changes
5. **Run tests**: `npm test`

### Adding New Features

Recommended TDD (Test-Driven Development) approach:

1. **Write test first** in `tests/calculations.test.js` or `tests/api.test.js`
2. **Run test** (should fail): `npm test`
3. **Implement feature** in appropriate module
4. **Run test** (should pass): `npm test`
5. **Refactor** while keeping tests green
6. **Update UI** in `StrategyDashboard.jsx` or `components.jsx`

### Code Organization

- **Constants/Config** → `src/constants.js`
- **Business Logic** → `src/calculations.js`
- **API Calls** → `src/api.js`
- **UI Components** → `src/components.jsx`
- **Main App** → `src/StrategyDashboard.jsx`
- **Tests** → `tests/`

### Performance Tips

**1. Use React DevTools**
Install the React DevTools browser extension to inspect component renders.

**2. Check useMemo dependencies**
The app uses `useMemo` to cache expensive calculations. Only add dependencies that actually affect results.

**3. Mock API calls during development**
To avoid rate limits during development, temporarily mock API responses:

```javascript
// In src/api.js
const DEV_MODE = false; // Set to true during heavy development

export async function fetchAllPricesSequentially() {
  if (DEV_MODE) {
    return {
      btc: 100000,
      mstr: 420,
      eurUsd: 1.05,
      STRF: { price: 100, avg10d: 100 },
      // ... mock data
    };
  }
  // ... real fetching
}
```

## Deployment

### Deploy to Netlify

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Build the project:
```bash
npm run build
```

3. Deploy:
```bash
netlify deploy --prod --dir=dist
```

Or connect your Git repository for automatic deployments.

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel --prod
```

Vercel automatically detects Vite and uses the correct build settings.

### Deploy to GitHub Pages

1. Install gh-pages:
```bash
npm install gh-pages --save-dev
```

2. Add to `package.json` scripts:
```json
{
  "scripts": {
    "deploy": "vite build && gh-pages -d dist"
  }
}
```

3. Configure base path in `vite.config.js`:
```javascript
export default defineConfig({
  base: '/strategy-btc-dashboard/', // Your repo name
  plugins: [react()],
});
```

4. Deploy:
```bash
npm run deploy
```

## Browser Support

- **Chrome** 90+
- **Firefox** 88+
- **Safari** 14+
- **Edge** 90+

**Not supported:**
- Internet Explorer (ES modules not supported)

## Getting Help

### Documentation
- See `PROJECT_STRUCTURE.md` for architecture details
- Check inline comments in source files
- Review test files for usage examples

### External Resources
- React docs: https://react.dev/
- Vite docs: https://vitejs.dev/
- Recharts docs: https://recharts.org/
- Vitest docs: https://vitest.dev/

### Debugging

**Enable verbose logging:**
```javascript
// In src/StrategyDashboard.jsx
useEffect(() => {
  async function loadPrices() {
    console.log('Fetching prices...');
    const result = await fetchAllPricesSequentially();
    console.log('Prices fetched:', result);
    // ...
  }
  loadPrices();
}, []);
```

**Use React DevTools:**
Install the browser extension to:
- Inspect component state
- Track re-renders
- Profile performance

**Check the browser console:**
All API errors and warnings appear in the browser console (F12 or Cmd+Option+I).

## Next Steps

1. ✅ **Run the app**: `npm run dev`
2. 📊 **Explore the dashboard** - Toggle ITM converts, view charts
3. 🧪 **Run tests**: `npm test`
4. 📖 **Read the code** - Start with `src/StrategyDashboard.jsx`
5. 🔧 **Make changes** - Update data in `src/constants.js`
6. 📚 **Read architecture docs** - See `PROJECT_STRUCTURE.md`

## License

MIT License - Feel free to use and modify as needed.

---

**Last Updated:** December 14, 2025  
**Tech Stack:** React 18 + Vite 7 + Vitest 4 + Recharts 2  
**Node Version:** 18.x or higher recommended
