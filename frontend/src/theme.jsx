import React, { createContext, useContext, useState, useEffect } from 'react';

const THEMES = {
  dark: {
    btcOrange: '#F7931A',
    btcOrangeDark: '#E8850F',
    darkBg: '#0D1117',
    cardBg: '#161B22',
    cardBorder: '#30363D',
    textPrimary: '#E6EDF3',
    textSecondary: '#8B949E',
    green: '#3FB950',
    red: '#F85149',
    blue: '#58A6FF',
    purple: '#A371F7',
    yellow: '#D29922',
    cyan: '#39D0D6',
    pink: '#DB61A2',
  },
  light: {
    btcOrange: '#F7931A',
    btcOrangeDark: '#E8850F',
    darkBg: '#FFFFFF',
    cardBg: '#F6F8FA',
    cardBorder: '#D0D7DE',
    textPrimary: '#1F2328',
    textSecondary: '#656D76',
    green: '#1A7F37',
    red: '#CF222E',
    blue: '#0969DA',
    purple: '#8250DF',
    yellow: '#9A6700',
    cyan: '#1B7C83',
    pink: '#BF3989',
  },
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // Default to dark
  });

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const theme = isDark ? THEMES.dark : THEMES.light;

  const toggleTheme = () => setIsDark(prev => !prev);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export { THEMES };
