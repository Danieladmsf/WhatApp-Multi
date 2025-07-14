#!/bin/bash

echo "⚙️  Setting up WhatsApp Bridge auto-start..."

# Check if running as root for systemd setup
if [ "$EUID" -eq 0 ]; then
    echo "🔧 Setting up systemd service..."
    
    # Create systemd service file
    cat > /etc/systemd/system/whatsapp-bridge.service << EOL
[Unit]
Description=WhatsApp Bridge Service
After=network.target

[Service]
Type=simple
User=$SUDO_USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

    # Enable and start the service
    systemctl daemon-reload
    systemctl enable whatsapp-bridge.service
    systemctl start whatsapp-bridge.service
    
    echo "✅ Systemd service created and started"
    echo "📊 Service status:"
    systemctl status whatsapp-bridge.service --no-pager
    
else
    echo "🔧 Setting up PM2 auto-start (non-root)..."
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        echo "📦 Installing PM2..."
        npm install -g pm2
    fi
    
    # Setup PM2 startup
    echo "⚙️  Configuring PM2 startup..."
    pm2 startup
    
    echo ""
    echo "⚠️  Please run the command shown above as root to complete PM2 setup."
    echo ""
    echo "After running the startup command, execute:"
    echo "bash scripts/deployment/start-service.sh"
    echo "pm2 save"
fi

echo ""
echo "🎉 Auto-start setup completed!"
echo ""
echo "The service will now automatically start on system boot."