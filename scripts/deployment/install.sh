#!/bin/bash

echo "🚀 Installing WhatsApp Bridge..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="16.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js $REQUIRED_VERSION or newer."
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION is compatible"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Install Claude CLI globally
echo "🤖 Installing Claude CLI globally..."
npm install -g @anthropic-ai/claude-code

if [ $? -ne 0 ]; then
    echo "⚠️  Failed to install Claude CLI globally (may need sudo)"
    echo "Please run manually: sudo npm install -g @anthropic-ai/claude-code"
else
    echo "✅ Claude CLI installed successfully"
fi

# Verify Claude CLI installation
if command -v claude &> /dev/null; then
    echo "✅ Claude CLI is available: $(which claude)"
else
    echo "⚠️  Claude CLI not found in PATH"
    echo "💡 You may need to restart your terminal or add npm global bin to PATH"
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p temp
mkdir -p .wwebjs_auth

# Set permissions
chmod +x scripts/deployment/*.sh
chmod +x scripts/service/*.sh

echo "✅ Directories created and permissions set"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Creating .env file template..."
    cat > .env << EOL
# WhatsApp Bridge Configuration
NODE_ENV=production
LOG_LEVEL=info

# Firebase Configuration
FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com/

# Claude AI Configuration
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Optional: Rate Limiting
RATE_LIMIT_MAX_REQUESTS=10
RATE_LIMIT_WINDOW_MS=60000
EOL
    echo "✅ .env template created. Please configure your environment variables."
else
    echo "✅ .env file already exists"
fi

# Check Firebase service account
if [ ! -f "config/firebase/firebase-service-account.json" ]; then
    echo "⚠️  Firebase service account file not found."
    echo "Please copy your Firebase service account JSON to:"
    echo "config/firebase/firebase-service-account.json"
else
    echo "✅ Firebase service account found"
fi

# Test Claude CLI
if command -v claude &> /dev/null; then
    echo "🧪 Testing Claude CLI..."
    TEST_RESULT=$(timeout 10 claude "Say: Hello from WhatsApp Bridge!" 2>&1)
    if [[ $TEST_RESULT == *"Hello from WhatsApp Bridge"* ]]; then
        echo "✅ Claude CLI working perfectly!"
    else
        echo "⚠️  Claude CLI test inconclusive: $TEST_RESULT"
        echo "ℹ️  You may need to authenticate Claude CLI first"
    fi
fi

echo ""
echo "🎉 Installation completed!"
echo ""
echo "Next steps:"
echo "1. Add your Firebase service account JSON file"
echo "2. Authenticate Claude CLI if needed"
echo "3. Test Claude CLI: npm run verify-claude"
echo "4. Run: npm start"
echo ""
echo "For service setup, run: bash scripts/deployment/setup-autostart.sh"
echo ""
echo "📚 Documentation:"
echo "- Claude CLI Integration: docs/CLAUDE_CODE_CLI_INTEGRATION.md"
echo "- Project Structure: readme/PROJECT-STRUCTURE.md"