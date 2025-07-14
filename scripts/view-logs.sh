#!/bin/bash

# Script para visualizar logs formatados

LOG_FILE="/workspaces/WhatApp-Multi/logs/app.log"

echo "🔍 WhatsApp Bridge - Logs Viewer"
echo "=================================="
echo ""

# Função para formatar logs JSON
format_logs() {
    if [ "$1" = "-f" ]; then
        # Follow mode
        tail -f "$LOG_FILE" | while IFS= read -r line; do
            if echo "$line" | jq -e . >/dev/null 2>&1; then
                timestamp=$(echo "$line" | jq -r '.timestamp // "N/A"')
                level=$(echo "$line" | jq -r '.level // "info"')
                message=$(echo "$line" | jq -r '.message // ""')
                
                # Ícones por nível
                case $level in
                    "info") icon="📋" ;;
                    "warn") icon="⚠️" ;;
                    "error") icon="❌" ;;
                    "debug") icon="🔍" ;;
                    *) icon="📋" ;;
                esac
                
                # Cores por nível
                case $level in
                    "info") color="\033[36m" ;;  # Cyan
                    "warn") color="\033[33m" ;;  # Yellow
                    "error") color="\033[31m" ;; # Red
                    "debug") color="\033[35m" ;; # Magenta
                    *) color="\033[37m" ;;       # White
                esac
                
                printf "${color}[%s] %s %-5s\033[0m | %s\n" "$timestamp" "$icon" "${level^^}" "$message"
            else
                echo "$line"
            fi
        done
    else
        # Static mode
        lines=${1:-50}
        tail -$lines "$LOG_FILE" | while IFS= read -r line; do
            if echo "$line" | jq -e . >/dev/null 2>&1; then
                timestamp=$(echo "$line" | jq -r '.timestamp // "N/A"')
                level=$(echo "$line" | jq -r '.level // "info"')
                message=$(echo "$line" | jq -r '.message // ""')
                
                # Ícones por nível
                case $level in
                    "info") icon="📋" ;;
                    "warn") icon="⚠️" ;;
                    "error") icon="❌" ;;
                    "debug") icon="🔍" ;;
                    *) icon="📋" ;;
                esac
                
                # Cores por nível
                case $level in
                    "info") color="\033[36m" ;;  # Cyan
                    "warn") color="\033[33m" ;;  # Yellow
                    "error") color="\033[31m" ;; # Red
                    "debug") color="\033[35m" ;; # Magenta
                    *) color="\033[37m" ;;       # White
                esac
                
                printf "${color}[%s] %s %-5s\033[0m | %s\n" "$timestamp" "$icon" "${level^^}" "$message"
            else
                echo "$line"
            fi
        done
    fi
}

# Verificar se arquivo existe
if [ ! -f "$LOG_FILE" ]; then
    echo "❌ Log file not found: $LOG_FILE"
    exit 1
fi

# Verificar argumentos
case "$1" in
    "-f"|"--follow")
        echo "👀 Following logs in real-time (Ctrl+C to exit)..."
        echo ""
        format_logs -f
        ;;
    "-h"|"--help")
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  -f, --follow     Follow logs in real-time"
        echo "  -h, --help       Show this help"
        echo "  [number]         Show last N lines (default: 50)"
        echo ""
        echo "Examples:"
        echo "  $0               # Show last 50 lines"
        echo "  $0 100           # Show last 100 lines"
        echo "  $0 -f            # Follow logs in real-time"
        ;;
    "")
        echo "📜 Showing last 50 log entries:"
        echo ""
        format_logs 50
        ;;
    *)
        if [[ "$1" =~ ^[0-9]+$ ]]; then
            echo "📜 Showing last $1 log entries:"
            echo ""
            format_logs $1
        else
            echo "❌ Invalid option: $1"
            echo "Use -h for help"
            exit 1
        fi
        ;;
esac