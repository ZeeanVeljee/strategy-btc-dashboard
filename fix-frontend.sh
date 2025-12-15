#!/bin/bash
# Fix for frontend npm dependency issues on Mac M1/ARM64

echo "🔧 Fixing frontend dependencies..."
echo ""

cd frontend

echo "1️⃣ Removing node_modules..."
rm -rf node_modules

echo "2️⃣ Removing package-lock.json..."
rm -f package-lock.json

echo "3️⃣ Clearing npm cache..."
npm cache clean --force

echo "4️⃣ Installing dependencies with legacy peer deps..."
npm install --legacy-peer-deps

echo ""
echo "✅ Done! Try running 'npm run dev' from the project root now."
