import React from 'react';
import ReactDOM from 'react-dom/client';
import StrategyDashboard from './StrategyDashboard.jsx';
import { ThemeProvider } from './theme.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <StrategyDashboard />
    </ThemeProvider>
  </React.StrictMode>
);

