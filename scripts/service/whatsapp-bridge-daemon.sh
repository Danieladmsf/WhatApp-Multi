#!/bin/bash

# WhatsApp Bridge Daemon Script
# This script can be used as a simple daemon without PM2 or systemd

DAEMON_NAME="whatsapp-bridge"
DAEMON_PATH="/workspaces/WhatApp-Multi"
DAEMON_USER="$(whoami)"
PIDFILE="$DAEMON_PATH/.pid"
LOGFILE="$DAEMON_PATH/logs/daemon.log"

# Ensure logs directory exists
mkdir -p "$DAEMON_PATH/logs"

start_daemon() {
    echo "Starting $DAEMON_NAME daemon..."
    
    if [ -f "$PIDFILE" ] && kill -0 $(cat "$PIDFILE") 2>/dev/null; then
        echo "Daemon is already running with PID $(cat $PIDFILE)"
        return 1
    fi
    
    cd "$DAEMON_PATH"
    
    # Start the process in background
    nohup node src/index.js > "$LOGFILE" 2>&1 &
    PID=$!
    
    # Save PID
    echo $PID > "$PIDFILE"
    
    # Wait a moment and check if process is still running
    sleep 2
    if kill -0 $PID 2>/dev/null; then
        echo "✅ $DAEMON_NAME started successfully with PID $PID"
        return 0
    else
        echo "❌ Failed to start $DAEMON_NAME"
        rm -f "$PIDFILE"
        return 1
    fi
}

stop_daemon() {
    echo "Stopping $DAEMON_NAME daemon..."
    
    if [ ! -f "$PIDFILE" ]; then
        echo "PID file not found. Daemon may not be running."
        return 1
    fi
    
    PID=$(cat "$PIDFILE")
    
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        
        # Wait for process to stop
        for i in {1..10}; do
            if ! kill -0 $PID 2>/dev/null; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if kill -0 $PID 2>/dev/null; then
            echo "Force killing process..."
            kill -9 $PID
        fi
        
        rm -f "$PIDFILE"
        echo "✅ $DAEMON_NAME stopped successfully"
        return 0
    else
        echo "Process not running"
        rm -f "$PIDFILE"
        return 1
    fi
}

restart_daemon() {
    echo "Restarting $DAEMON_NAME daemon..."
    stop_daemon
    sleep 2
    start_daemon
}

status_daemon() {
    if [ -f "$PIDFILE" ]; then
        PID=$(cat "$PIDFILE")
        if kill -0 $PID 2>/dev/null; then
            echo "✅ $DAEMON_NAME is running with PID $PID"
            return 0
        else
            echo "❌ $DAEMON_NAME is not running (stale PID file)"
            rm -f "$PIDFILE"
            return 1
        fi
    else
        echo "❌ $DAEMON_NAME is not running"
        return 1
    fi
}

show_logs() {
    if [ -f "$LOGFILE" ]; then
        echo "📝 Recent logs:"
        tail -50 "$LOGFILE"
    else
        echo "No log file found"
    fi
}

follow_logs() {
    if [ -f "$LOGFILE" ]; then
        echo "📝 Following logs (press Ctrl+C to exit):"
        tail -f "$LOGFILE"
    else
        echo "No log file found"
    fi
}

case "$1" in
    start)
        start_daemon
        ;;
    stop)
        stop_daemon
        ;;
    restart)
        restart_daemon
        ;;
    status)
        status_daemon
        ;;
    logs)
        show_logs
        ;;
    follow)
        follow_logs
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|follow}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the daemon"
        echo "  stop    - Stop the daemon"
        echo "  restart - Restart the daemon"
        echo "  status  - Show daemon status"
        echo "  logs    - Show recent logs"
        echo "  follow  - Follow logs in real-time"
        exit 1
        ;;
esac

exit $?