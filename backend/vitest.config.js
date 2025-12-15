import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test configuration
    globals: false,
    environment: 'node',
    
    // Test file patterns
    include: ['tests/**/*.test.js'],
    
    // Timeout configuration
    testTimeout: 30000, // 30s max for slow tests with backoff
    
    // Run tests in parallel for speed
    threads: true,
    
    // Reporter
    reporters: ['verbose'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['*.js'], // Only source files, not tests
      exclude: ['tests/**', 'node_modules/**', 'vitest.config.js'],
    },
  },
});

