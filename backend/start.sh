#!/bin/bash

# AAHARNET.AI Backend Startup Script

echo "🚀 Starting AAHARNET.AI Backend..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11+ first."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp env.example .env
    echo "📝 Please edit .env file with your Firebase credentials and API keys"
    echo "   Then run this script again."
    exit 1
fi

# Start the FastAPI server
echo "🌟 Starting FastAPI server..."
echo "   API Documentation: http://127.0.0.1:8000/docs"
echo "   Health Check: http://127.0.0.1:8000/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python main.py

