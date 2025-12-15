#!/usr/bin/env node
/**
 * Development server launcher
 * Replaces concurrently with async spawn (which works on this system)
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI colors for output
const colors = {
  backend: '\x1b[34m',  // Blue
  frontend: '\x1b[32m', // Green
  reset: '\x1b[0m'
};

function startProcess(name, command, args, color) {
  console.log(`${color}[${name}]${colors.reset} Starting: ${command} ${args.join(' ')}`);
  
  const child = spawn(command, args, {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  });

  // Prefix output with process name and color
  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${color}[${name}]${colors.reset} ${line}`);
      }
    });
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.error(`${color}[${name}]${colors.reset} ${line}`);
      }
    });
  });

  child.on('close', (code) => {
    console.log(`${color}[${name}]${colors.reset} Process exited with code ${code}`);
    process.exit(code);
  });

  child.on('error', (err) => {
    console.error(`${color}[${name}]${colors.reset} Error: ${err.message}`);
  });

  return child;
}

console.log('🚀 Starting development servers...\n');

// Start backend
const backend = startProcess(
  'backend',
  'npm',
  ['run', 'dev:backend'],
  colors.backend
);

// Start frontend
const frontend = startProcess(
  'frontend',
  'npm',
  ['run', 'dev:frontend'],
  colors.frontend
);

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down servers...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});

