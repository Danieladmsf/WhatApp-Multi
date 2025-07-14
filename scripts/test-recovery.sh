#!/bin/bash

echo "🔄 Testing Auto-Recovery System..."
echo "================================="

echo ""
echo "1. Checking for existing WhatsApp sessions..."
echo ""

# Verificar sessões locais existentes
AUTH_DIR="/workspaces/WhatApp-Multi/.wwebjs_auth"
if [ -d "$AUTH_DIR" ]; then
    echo "✅ Auth directory found: $AUTH_DIR"
    
    sessions=$(find "$AUTH_DIR" -name "session-whatsapp-bridge-*" -type d)
    if [ -n "$sessions" ]; then
        echo "📱 Found local WhatsApp sessions:"
        for session in $sessions; do
            basename=$(basename "$session")
            userId=${basename#session-whatsapp-bridge-}
            echo "   - User: $userId"
            
            # Verificar se tem dados de sessão
            if [ -n "$(ls -A "$session" 2>/dev/null)" ]; then
                echo "     Status: ✅ Has session data"
            else
                echo "     Status: ❌ Empty session"
            fi
        done
    else
        echo "📊 No local WhatsApp sessions found"
    fi
else
    echo "📊 No auth directory found"
fi

echo ""
echo "2. Starting WhatsApp Bridge to test recovery..."
echo ""

# Iniciar o sistema e aguardar logs de recovery
timeout 30s npm start 2>&1 | while read line; do
    echo "$line"
    
    # Procurar por logs específicos de recovery
    if echo "$line" | grep -q "Checking for active connections to recover"; then
        echo "🔍 Recovery system activated"
    fi
    
    if echo "$line" | grep -q "Found.*active session.*to recover"; then
        echo "🎯 Active sessions detected for recovery"
    fi
    
    if echo "$line" | grep -q "Successfully recovered session"; then
        echo "✅ Session recovery successful"
    fi
    
    if echo "$line" | grep -q "No active sessions found"; then
        echo "📊 No sessions to recover (normal for fresh start)"
    fi
    
    # Parar quando sistema estiver pronto
    if echo "$line" | grep -q "Multi-Process Bridge ready"; then
        echo ""
        echo "🎉 Recovery test completed!"
        echo "Check the logs above to see if sessions were recovered."
        break
    fi
done

echo ""
echo "💡 To test recovery:"
echo "1. Connect some users to WhatsApp"
echo "2. Stop the bridge (Ctrl+C)"
echo "3. Restart with: npm start"
echo "4. Users should reconnect automatically without scanning QR again"