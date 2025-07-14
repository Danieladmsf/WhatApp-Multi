#!/bin/bash

echo "🧪 Testing Claude CLI Integration..."
echo "=================================="

# Verificar se Claude CLI está instalado
echo "1. Checking Claude CLI installation..."
if command -v claude >/dev/null 2>&1; then
    echo "✅ Claude CLI found: $(which claude)"
    claude --version
else
    echo "❌ Claude CLI not found"
    echo "Please install: npm install -g @anthropic-ai/claude-code"
    exit 1
fi

echo ""
echo "2. Testing basic Claude CLI command..."
echo "Running: claude --print 'Hello, how are you?'"
echo ""

# Testar comando básico
claude --print "Hello, how are you?"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Claude CLI basic test passed!"
else
    echo ""
    echo "❌ Claude CLI basic test failed!"
    exit 1
fi

echo ""
echo "3. Testing with complex prompt..."
echo "Running: claude --print 'Explain what a WhatsApp bridge is in Portuguese'"
echo ""

# Testar comando mais complexo
claude --print "Explain what a WhatsApp bridge is in Portuguese"

echo ""
echo "📝 Note: Image support will be added when Claude CLI supports it officially."

echo ""
echo "🎉 Claude CLI tests completed!"
echo "The service should now work correctly with WhatsApp Bridge."