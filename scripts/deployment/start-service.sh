#!/bin/bash

echo "🚀 Starting WhatsApp Bridge Service..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 PM2 not found. Installing PM2 globally..."
    npm install -g pm2
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install PM2. Please install it manually:"
        echo "npm install -g pm2"
        exit 1
    fi
fi

# Stop existing services if running
echo "🛑 Stopping existing services..."
pm2 stop whatsapp-bridge 2>/dev/null || true
pm2 stop keep-alive 2>/dev/null || true
pm2 delete whatsapp-bridge 2>/dev/null || true
pm2 delete keep-alive 2>/dev/null || true

# Start with ecosystem config if it exists
if [ -f "ecosystem.config.js" ]; then
    echo "📋 Starting with ecosystem configuration..."
    pm2 start ecosystem.config.js
else
    echo "📋 Starting with basic configuration..."
    pm2 start src/index.js --name "whatsapp-bridge" --time
fi

if [ $? -eq 0 ]; then
    echo "✅ Services started successfully!"
    
    # Save PM2 configuration
    pm2 save
    
    # Show status
    echo ""
    echo "📊 Services Status:"
    pm2 status
    
    echo ""
    echo "📝 To view logs:"
    echo "pm2 logs whatsapp-bridge    # WhatsApp Bridge logs"
    echo "pm2 logs keep-alive         # Keep-Alive logs"
    echo "pm2 logs                    # All logs"
    echo ""
    echo "🔄 To restart:"
    echo "pm2 restart all             # Restart all services"
    echo "pm2 restart whatsapp-bridge # Restart only WhatsApp"
    echo ""
    echo "🛑 To stop:"
    echo "pm2 stop all                # Stop all services"
    echo "pm2 stop whatsapp-bridge    # Stop only WhatsApp"
    echo ""
    echo "🔄 Keep-Alive: Active! Codespace will stay alive 24/7"
else
    echo "❌ Failed to start services"
    exit 1
fi