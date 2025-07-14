#!/bin/bash

SERVICE_NAME="whatsapp-bridge"

show_help() {
    echo "🔧 WhatsApp Bridge Service Control"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     Start the service"
    echo "  stop      Stop the service"
    echo "  restart   Restart the service"
    echo "  status    Show service status"
    echo "  logs      Show recent logs"
    echo "  monitor   Monitor service in real-time"
    echo "  cleanup   Run cleanup script"
    echo "  help      Show this help message"
    echo ""
}

check_service_type() {
    if command -v pm2 &> /dev/null && pm2 list | grep -q "$SERVICE_NAME"; then
        echo "pm2"
    elif systemctl list-units --type=service | grep -q "$SERVICE_NAME"; then
        echo "systemd"
    else
        echo "none"
    fi
}

start_service() {
    SERVICE_TYPE=$(check_service_type)
    
    case $SERVICE_TYPE in
        "pm2")
            echo "🚀 Starting with PM2..."
            pm2 start $SERVICE_NAME
            ;;
        "systemd")
            echo "🚀 Starting with systemd..."
            sudo systemctl start $SERVICE_NAME.service
            ;;
        *)
            echo "🚀 Starting with deployment script..."
            bash scripts/deployment/start-service.sh
            ;;
    esac
}

stop_service() {
    SERVICE_TYPE=$(check_service_type)
    
    case $SERVICE_TYPE in
        "pm2")
            echo "🛑 Stopping PM2 service..."
            pm2 stop $SERVICE_NAME
            ;;
        "systemd")
            echo "🛑 Stopping systemd service..."
            sudo systemctl stop $SERVICE_NAME.service
            ;;
        *)
            echo "🛑 Stopping process..."
            if [ -f ".pid" ]; then
                kill $(cat .pid) 2>/dev/null || true
                rm -f .pid
                echo "✅ Process stopped"
            else
                echo "⚠️  No PID file found"
            fi
            ;;
    esac
}

restart_service() {
    echo "🔄 Restarting service..."
    stop_service
    sleep 2
    start_service
}

show_status() {
    SERVICE_TYPE=$(check_service_type)
    
    echo "📊 Service Status:"
    echo "Service Type: $SERVICE_TYPE"
    echo ""
    
    case $SERVICE_TYPE in
        "pm2")
            pm2 status $SERVICE_NAME
            ;;
        "systemd")
            sudo systemctl status $SERVICE_NAME.service --no-pager
            ;;
        *)
            if [ -f ".pid" ] && kill -0 $(cat .pid) 2>/dev/null; then
                echo "✅ Service is running (PID: $(cat .pid))"
            else
                echo "❌ Service is not running"
            fi
            ;;
    esac
}

show_logs() {
    SERVICE_TYPE=$(check_service_type)
    
    case $SERVICE_TYPE in
        "pm2")
            pm2 logs $SERVICE_NAME --lines 50
            ;;
        "systemd")
            sudo journalctl -u $SERVICE_NAME.service -n 50 --no-pager
            ;;
        *)
            echo "📝 Application logs:"
            if [ -f "logs/app.log" ]; then
                tail -50 logs/app.log
            else
                echo "No application logs found"
            fi
            ;;
    esac
}

monitor_service() {
    SERVICE_TYPE=$(check_service_type)
    
    case $SERVICE_TYPE in
        "pm2")
            pm2 monit
            ;;
        "systemd")
            sudo journalctl -u $SERVICE_NAME.service -f
            ;;
        *)
            echo "📊 Monitoring logs (press Ctrl+C to exit)..."
            if [ -f "logs/app.log" ]; then
                tail -f logs/app.log
            else
                echo "No application logs found for monitoring"
            fi
            ;;
    esac
}

run_cleanup() {
    echo "🧹 Running cleanup..."
    node src/scripts/cleanup.js
}

# Main command processing
case "$1" in
    "start")
        start_service
        ;;
    "stop")
        stop_service
        ;;
    "restart")
        restart_service
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "monitor")
        monitor_service
        ;;
    "cleanup")
        run_cleanup
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    "")
        show_help
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac