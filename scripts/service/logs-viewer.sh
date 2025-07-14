#!/bin/bash

show_help() {
    echo "📝 WhatsApp Bridge Logs Viewer"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -f, --follow     Follow log output (like tail -f)"
    echo "  -n, --lines N    Show last N lines (default: 50)"
    echo "  -e, --error      Show error logs only"
    echo "  -a, --app        Show application logs only"
    echo "  -o, --out        Show output logs only"
    echo "  -s, --service    Show service logs (PM2/systemd)"
    echo "  -c, --clean      Clean old log files"
    echo "  -h, --help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Show recent application logs"
    echo "  $0 -f                 # Follow application logs"
    echo "  $0 -e -n 100         # Show last 100 error log lines"
    echo "  $0 -s                # Show service logs"
    echo ""
}

# Default values
LINES=50
FOLLOW=false
LOG_TYPE="app"
CLEAN=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        -n|--lines)
            LINES="$2"
            shift 2
            ;;
        -e|--error)
            LOG_TYPE="error"
            shift
            ;;
        -a|--app)
            LOG_TYPE="app"
            shift
            ;;
        -o|--out)
            LOG_TYPE="out"
            shift
            ;;
        -s|--service)
            LOG_TYPE="service"
            shift
            ;;
        -c|--clean)
            CLEAN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "❌ Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Clean logs if requested
if [ "$CLEAN" = true ]; then
    echo "🧹 Cleaning old log files..."
    node src/scripts/cleanup.js
    exit 0
fi

# Function to show file logs
show_file_logs() {
    local file="$1"
    local description="$2"
    
    if [ ! -f "$file" ]; then
        echo "⚠️  $description not found: $file"
        return 1
    fi
    
    echo "📝 $description ($file):"
    echo "═══════════════════════════════════════════════════════════════"
    
    if [ "$FOLLOW" = true ]; then
        tail -f "$file"
    else
        tail -n "$LINES" "$file"
    fi
}

# Function to show service logs
show_service_logs() {
    echo "🔍 Detecting service type..."
    
    if command -v pm2 &> /dev/null && pm2 list | grep -q "whatsapp-bridge"; then
        echo "📝 PM2 Service Logs:"
        echo "═══════════════════════════════════════════════════════════════"
        if [ "$FOLLOW" = true ]; then
            pm2 logs whatsapp-bridge
        else
            pm2 logs whatsapp-bridge --lines "$LINES"
        fi
    elif systemctl list-units --type=service | grep -q "whatsapp-bridge"; then
        echo "📝 Systemd Service Logs:"
        echo "═══════════════════════════════════════════════════════════════"
        if [ "$FOLLOW" = true ]; then
            sudo journalctl -u whatsapp-bridge.service -f
        else
            sudo journalctl -u whatsapp-bridge.service -n "$LINES" --no-pager
        fi
    else
        echo "⚠️  No managed service found. Showing application logs instead."
        show_file_logs "logs/app.log" "Application Logs"
    fi
}

# Create logs directory if it doesn't exist
mkdir -p logs

# Show logs based on type
case "$LOG_TYPE" in
    "app")
        show_file_logs "logs/app.log" "Application Logs"
        ;;
    "error")
        show_file_logs "logs/error.log" "Error Logs"
        ;;
    "out")
        show_file_logs "logs/out.log" "Output Logs"
        ;;
    "service")
        show_service_logs
        ;;
    *)
        echo "❌ Unknown log type: $LOG_TYPE"
        exit 1
        ;;
esac

# Show additional info if not following
if [ "$FOLLOW" = false ]; then
    echo ""
    echo "💡 Tips:"
    echo "  • Use -f to follow logs in real-time"
    echo "  • Use -e to see error logs only"
    echo "  • Use -s to see service logs (PM2/systemd)"
    echo "  • Use -c to clean old log files"
fi