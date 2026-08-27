#!/bin/bash
set -e

echo "==============================================="
echo "  StyleHub - Setting up and starting the site"
echo "==============================================="
echo ""

cd "$(dirname "$0")/client"

echo "Installing dependencies (first time only, this can take a few minutes)..."
npm install

echo ""
echo "Building the website..."
npm run build

cd ..

echo ""
echo "==============================================="
echo "  Starting the server..."
echo "  Storefront:  http://localhost:3000"
echo "  Admin panel: http://localhost:3000/admin"
echo "  Press Ctrl+C in this window to stop the server."
echo "==============================================="
echo ""
node server.js
