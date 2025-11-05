#!/bin/bash

# Enculture Backend Setup Script
echo "🚀 Setting up Enculture Backend..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the root directory of the Enculture project"
    exit 1
fi

# Navigate to backend directory
cd backend

echo "📦 Installing Python dependencies..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📚 Installing Python packages..."
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚙️  Setting up environment variables..."
    cp env.example .env
    echo ""
    echo "📝 IMPORTANT: Please edit the .env file and add your OpenAI API key:"
    echo "   OPENAI_API_KEY=your_openai_api_key_here"
    echo ""
    echo "💡 You can get an API key from: https://platform.openai.com/api-keys"
    echo ""
    read -p "Press Enter after you've updated the .env file..."
fi

# Test the setup
echo "🧪 Testing backend setup..."
python test_setup.py

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Backend setup completed successfully!"
    echo ""
    echo "🚀 To start the backend server, run:"
    echo "   cd backend"
    echo "   source venv/bin/activate"
    echo "   python main.py"
    echo ""
    echo "📖 The API documentation will be available at:"
    echo "   http://localhost:8000/docs"
    echo ""
else
    echo ""
    echo "❌ Setup test failed. Please check the errors above and:"
    echo "   1. Ensure your OpenAI API key is correctly set in .env"
    echo "   2. Check that you have sufficient OpenAI credits"
    echo "   3. Verify your internet connection"
fi
