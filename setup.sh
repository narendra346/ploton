#!/bin/bash

echo "🎬 Setting up Ploton..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found! Install from https://nodejs.org"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ Python not found! Install from https://python.org"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo "✅ Python: $(python3 --version 2>/dev/null || python --version)"
echo ""

# Install Remotion deps
echo "📦 Installing Remotion dependencies..."
cd remotion && npm install
cd ..

# Install Python deps
echo "📦 Installing Python dependencies..."
cd backend && pip install -r requirements.txt
cd ..

# Create renders folder
mkdir -p renders

echo ""
echo "✅ Ploton is ready!"
echo ""
echo "Run these in separate terminals:"
echo ""
echo "  Terminal 1: cd backend && python main.py"
echo "  Terminal 2: cd frontend && npm run dev"
echo ""
echo "Then open: http://localhost:3000"
