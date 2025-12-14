# Strategy Dashboard - Setup and Run Instructions

## Quick Start

This guide will help you set up and run the Strategy Real BTC Per Share Dashboard locally.

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
cd /path/to/strategy-dashboard
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- React and React DOM (UI framework)
- Recharts (charting library)
- Vitest (testing framework)

**Note:** If you encounter permission errors, try:
```bash
sudo npm install
```

### Step 3: Verify Installation

Check that dependencies were installed:
```bash
npm list --depth=0
```

Expected output:
```
strategy-dashboard@3.0.0
├── react@18.2.0
├── react-dom@18.2.0
└── recharts@2.10.0
```

## Running the Application

### Development Server

Since this is a React application, you'll need a development server. There are several options:

#### Option 1: Using Create React App (Recommended)

If you want a full development environment:

```bash
# Install Create React App globally (one-time)
npm install -g create-react-app

# Create a new React app
npx create-react-app strategy-app

# Copy our files into the src directory
cp constants.js calculations.js api.js components.js StrategyDashboard.jsx strategy-app/src/

# Navigate to the app directory
cd strategy-app

# Update src/index.js to render our dashboard
```

Then edit `src/index.js`:
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import StrategyDashboard from './StrategyDashboard';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <StrategyDashboard />
  </React.StrictMode>
);
```

Start the development server:
```bash
npm start
```

The app will open at `http://localhost:3000`

#### Option 2: Using Vite (Faster Alternative)

```bash
# Create a Vite project
npm create vite@latest strategy-app -- --template react

# Navigate to the project
cd strategy-app

# Install dependencies
npm install

# Copy our files
cp ../constants.js ../calculations.js ../api.js ../components.js ../StrategyDashboard.jsx src/

# Update src/main.jsx
```

Edit `src/main.jsx`:
```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import StrategyDashboard from './StrategyDashboard'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StrategyDashboard />
  </React.StrictMode>,
)
```

Install Recharts:
```bash
npm install recharts
```

Start the development server:
```bash
npm run dev
```

The app will open at `http://localhost:5173`

#### Option 3: Simple HTML File (No Build Tool)

Create an `index.html` file:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Strategy Dashboard</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" src="strategy-dashboard-v3.jsx"></script>
</body>
</html>
```

Open `index.html` in a web browser.

**Note:** This method is simpler but not recommended for production.

## Running Tests

### Run All Tests

```bash
npm test
```

This will run both `calculations.test.js` and `api.test.js`.

### Run Tests in Watch Mode

```bash
npm run test:watch
```

Changes to test files or source files will automatically re-run affected tests.

### Run Tests with Coverage

```bash
npm run test:coverage
```

This generates a coverage report showing:
- Lines covered
- Branches covered
- Functions covered
- Statements covered

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

### Run Specific Test File

```bash
npm test calculations.test.js
npm test api.test.js
```

### Debugging Tests

Add `console.log()` statements in your tests or source code, then run:
```bash
npm test -- --verbose
```

## Configuration

### API Keys

The Polygon.io API key is stored in `constants.js`:

```javascript
export const POLYGON_API_KEY = 'hhJDHpnbMIP1sFupse8YHfKgE_D84cyA';
```

**To use your own API key:**
1. Sign up at https://polygon.io/ (free tier: 5 calls/min)
2. Copy your API key
3. Replace the value in `constants.js`

### Updating Financial Data

Edit `constants.js` → `STATIC_DATA`:

```javascript
export const STATIC_DATA = {
  btcHoldings: 660624,  // Update this
  basicSharesOutstanding: 300800,  // Update this
  // ... etc
};
```

**Data Sources:**
- Strategy's quarterly filings (10-Q, 10-K)
- Strategy's website: https://www.strategy.com
- Bitcoin holdings: Usually announced via press release

## Project Structure

```
strategy-dashboard/
├── constants.js              # Configuration and static data
├── calculations.js           # Business logic
├── api.js                    # API fetching
├── components.js             # React components
├── StrategyDashboard.jsx     # Main app (refactored)
├── strategy-dashboard-v3.jsx # Original file (preserved)
├── calculations.test.js      # Tests for calculations
├── api.test.js               # Tests for API functions
├── package.json              # Dependencies
├── PROJECT_STRUCTURE.md      # Architecture documentation
└── SETUP.md                  # This file
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

### Issue: Tests failing with "Cannot use import statement"

**Solution:** Ensure `package.json` has `"type": "module"`. The project uses Vitest which has native ES module support.

The provided `package.json` already has this configured.

### Issue: Polygon API errors in console

**Possible Causes:**
1. **Rate limit exceeded** - Free tier: 5 calls/min
   - Wait 60 seconds and refresh
2. **Invalid API key** - Replace with your own in `constants.js`
3. **Weekend/Market closed** - Polygon may not have data
   - Default values will be used

### Issue: CORS errors when fetching data

**Solution:** This happens when running from `file://` protocol.
- Use a local development server (Option 1 or 2 above)
- Or use a browser extension to disable CORS (development only)

### Issue: Module resolution errors

**Solution:** Ensure all imports use `.js` extension for ES modules:
```javascript
// Correct
import { COLORS } from './constants.js';

// Incorrect
import { COLORS } from './constants';
```

## Development Workflow

### Making Changes

1. **Edit source files** (`calculations.js`, `api.js`, etc.)
2. **Update tests** if behavior changes
3. **Run tests** to verify: `npm test`
4. **Refresh browser** to see changes (or use hot reload)

### Adding New Features

1. **Update constants** if needed (new securities, data points)
2. **Add calculation logic** in `calculations.js`
3. **Write tests first** (TDD approach): `calculations.test.js`
4. **Implement feature** until tests pass
5. **Add UI component** in `components.js` if needed
6. **Update main app** in `StrategyDashboard.jsx`

### Test-Driven Development (TDD)

**Recommended approach for new features:**

```bash
# 1. Write failing test
# Edit calculations.test.js, add test for new feature

# 2. Run test (should fail)
npm test

# 3. Implement feature
# Edit calculations.js

# 4. Run test (should pass)
npm test

# 5. Refactor if needed
# Improve code while keeping tests green
```

## Performance Tips

### Optimize Re-renders

The app uses `useMemo` to cache expensive calculations:

```javascript
const waterfallResult = useMemo(() => {
  return calculateWaterfall({...});
}, [prices, treatItmAsEquity]);
```

Only add dependencies that actually affect the calculation.

### Reduce API Calls

The app fetches prices on mount. To avoid repeated calls during development:

1. **Mock the API** in development:
   ```javascript
   // In api.js, add at top:
   const DEV_MODE = true;

   export async function fetchAllPricesSequentially() {
     if (DEV_MODE) {
       return {
         btc: 100000,
         mstr: 420,
         // ... mock data
       };
     }
     // ... real fetching
   }
   ```

2. **Use React DevTools** to inspect component updates

## Deployment

### Build for Production

Using Create React App:
```bash
npm run build
```

Using Vite:
```bash
npm run build
```

This creates an optimized production build in `dist/` or `build/`.

### Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=build
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Deploy to GitHub Pages

```bash
# Install gh-pages
npm install gh-pages --save-dev

# Add to package.json scripts:
# "deploy": "gh-pages -d build"

# Deploy
npm run deploy
```

## Environment Variables

For sensitive data (API keys), use environment variables:

Create `.env` file:
```
REACT_APP_POLYGON_API_KEY=your_key_here
```

Update `constants.js`:
```javascript
export const POLYGON_API_KEY = process.env.REACT_APP_POLYGON_API_KEY || 'default_key';
```

**Note:** Don't commit `.env` to version control. Add to `.gitignore`:
```
.env
.env.local
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Not supported:**
- Internet Explorer (ES modules not supported)

## Getting Help

### Documentation
- See `PROJECT_STRUCTURE.md` for architecture details
- Check comments in source files
- Review test files for usage examples

### Common Resources
- React docs: https://react.dev/
- Recharts docs: https://recharts.org/
- Vitest docs: https://vitest.dev/

### Debugging

Enable verbose logging:
```javascript
// In StrategyDashboard.jsx
console.log('Prices:', prices);
console.log('Waterfall Result:', waterfallResult);
```

Use React DevTools browser extension to inspect component state.

## Next Steps

1. **Run the app** using one of the methods above
2. **Explore the dashboard** - try toggling ITM converts
3. **Review the code** - start with `StrategyDashboard.jsx`
4. **Run tests** - `npm test`
5. **Make changes** - update data in `constants.js`
6. **Read documentation** - see `PROJECT_STRUCTURE.md`

## License

MIT License - Feel free to use and modify as needed.

---

**Last Updated:** December 13, 2025
**Need Help?** Check the troubleshooting section above or review test files for examples.
