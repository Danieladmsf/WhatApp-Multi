#!/bin/bash

echo "🔄 Auto-start script for WhatsApp Bridge..."

# Function to check if service is running
check_service() {
    if command -v pm2 &> /dev/null; then
        pm2 list | grep -q "whatsapp-bridge.*online"
        return $?
    elif systemctl is-active --quiet whatsapp-bridge; then
        return 0
    else
        return 1
    fi
}

# Function to start service with PM2
start_pm2() {
    echo "🚀 Starting with PM2..."
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js
    else
        pm2 start src/index.js --name "whatsapp-bridge" --time
    fi
}

# Function to start service with systemd
start_systemd() {
    echo "🚀 Starting with systemd..."
    sudo systemctl start whatsapp-bridge.service
}

# Main logic
if check_service; then
    echo "✅ WhatsApp Bridge is already running"
    exit 0
fi

echo "🔍 Service not running, attempting to start..."

# Try PM2 first
if command -v pm2 &> /dev/null; then
    start_pm2
    sleep 5
    
    if check_service; then
        echo "✅ Service started successfully with PM2"
        exit 0
    fi
fi

# Try systemd if PM2 failed or isn't available
if command -v systemctl &> /dev/null; then
    start_systemd
    sleep 5
    
    if check_service; then
        echo "✅ Service started successfully with systemd"
        exit 0
    fi
fi

# Fallback to direct execution
echo "🔧 Fallback: Starting directly..."
nohup node src/index.js > logs/out.log 2> logs/error.log &
echo $! > .pid

sleep 5

if [ -f ".pid" ] && kill -0 $(cat .pid) 2>/dev/null; then
    echo "✅ Service started successfully (direct execution)"
else
    echo "❌ Failed to start service"
    exit 1
fi