#!/bin/bash

echo "🔍 Verificando Claude CLI..."

# Verificar comando
if command -v claude &> /dev/null; then
    echo "✅ Claude CLI encontrado: $(which claude)"
    echo "📋 Versão: $(claude --version 2>/dev/null || echo 'Versão não disponível')"
else
    echo "❌ Claude CLI não encontrado"
    echo "💡 Para instalar: npm install -g @anthropic-ai/claude-code"
    exit 1
fi

# Claude CLI não precisa de API key configurada localmente
echo "ℹ️  Claude CLI usa autenticação própria"

# Teste rápido
echo "🧪 Testando Claude CLI..."
TEST_RESPONSE=$(timeout 30 claude "Responda apenas: OK" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ] && [[ $TEST_RESPONSE == *"OK"* ]]; then
    echo "✅ Claude CLI funcionando: $TEST_RESPONSE"
elif [ $EXIT_CODE -eq 124 ]; then
    echo "⏰ Claude CLI timeout - pode estar lento"
else
    echo "❌ Claude CLI falhou: $TEST_RESPONSE"
    echo "🔧 Verifique a configuração da API key"
    exit 1
fi

echo "🎉 Verificação completa!"