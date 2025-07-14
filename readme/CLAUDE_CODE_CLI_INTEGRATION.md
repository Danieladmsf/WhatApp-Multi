# Claude Code CLI - Guia de Integração para WhatsApp Bridge

🤖 **Guia completo para integrar Claude Code CLI no WhatsApp Bridge**

## 📋 Índice

- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Configuração no WhatsApp Bridge](#-configuração-no-whatsapp-bridge)
- [Integração Avançada](#-integração-avançada)
- [Exemplos Práticos](#-exemplos-práticos)
- [Troubleshooting](#-troubleshooting)
- [Limitações e Considerações](#-limitações-e-considerações)

## 📋 Pré-requisitos

### Sistema
- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Sistema operacional**: Linux, macOS, Windows
- **Conexão internet** estável

### Credenciais
- **Claude CLI** instalado globalmente

### Verificação do Sistema
```bash
# Verificar Node.js
node --version
# Deve retornar >= v18.0.0

# Verificar npm
npm --version
# Deve retornar >= 8.0.0
```

## 🔧 Instalação

### 1. Instalar Claude Code CLI Globalmente
```bash
npm install -g @anthropic-ai/claude-code
```

### 2. Verificar Instalação
```bash
claude --version
# Deve retornar a versão instalada
```

### 3. Configurar WhatsApp Bridge
```bash
# Claude CLI já está pronto para usar
# Nenhuma configuração adicional necessária
```

### 4. Teste Inicial
```bash
claude "Responda apenas: OK"
# Deve retornar: OK
```

## ⚙️ Configuração no WhatsApp Bridge

### 1. Atualizar .env
```env
# Claude CLI - Sem API key necessária

# Claude CLI Configuration
CLAUDE_CLI_ENABLED=true
CLAUDE_CLI_COMMAND=claude
CLAUDE_CLI_TIMEOUT=30000
CLAUDE_CLI_FALLBACK=true

# Rate Limiting específico para CLI
CLAUDE_CLI_MAX_REQUESTS=5
CLAUDE_CLI_WINDOW_MS=60000
```

### 2. Criar Serviço Claude CLI
```javascript
// src/services/ClaudeCLIService.js
const { spawn } = require('child_process');
const logger = require('../utils/logger');
const RateLimiter = require('../utils/RateLimiter');

class ClaudeCLIService {
    constructor() {
        this.enabled = process.env.CLAUDE_CLI_ENABLED === 'true';
        this.command = process.env.CLAUDE_CLI_COMMAND || 'claude';
        this.timeout = parseInt(process.env.CLAUDE_CLI_TIMEOUT) || 30000;
        this.fallbackEnabled = process.env.CLAUDE_CLI_FALLBACK === 'true';
        
        // Rate limiter específico para CLI
        this.rateLimiter = new RateLimiter(
            parseInt(process.env.CLAUDE_CLI_MAX_REQUESTS) || 5,
            parseInt(process.env.CLAUDE_CLI_WINDOW_MS) || 60000
        );
        
        this.initialized = this.enabled && this.checkClaudeCLI();
        
        if (!this.initialized && this.enabled) {
            logger.warn('Claude CLI service not initialized - missing API key or disabled');
        } else if (this.initialized) {
            logger.info('Claude CLI service initialized successfully');
        }
    }

    async processMessage(message) {
        if (!this.initialized) {
            if (this.fallbackEnabled) {
                logger.warn('Claude CLI not initialized, falling back to regular API');
                return null; // Indica fallback
            }
            return 'Sorry, CLI service is currently unavailable.';
        }

        if (!this.rateLimiter.isAllowed()) {
            logger.warn('Rate limit exceeded for Claude CLI requests');
            return 'Too many CLI requests. Please wait a moment before trying again.';
        }

        return new Promise((resolve, reject) => {
            const child = spawn(this.command, [message], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: process.env
            });

            let stdout = '';
            let stderr = '';

            // Timeout
            const timeoutId = setTimeout(() => {
                child.kill('SIGKILL');
                logger.error('Claude CLI timeout');
                reject(new Error('Claude CLI timeout'));
            }, this.timeout);

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                clearTimeout(timeoutId);
                
                if (code === 0 && stdout.trim()) {
                    logger.info('Claude CLI response generated successfully');
                    resolve(stdout.trim());
                } else {
                    logger.error('Claude CLI error:', stderr || 'Unknown error');
                    reject(new Error(`Claude CLI error: ${stderr || 'Unknown error'}`));
                }
            });

            child.on('error', (error) => {
                clearTimeout(timeoutId);
                logger.error('Claude CLI spawn error:', error.message);
                reject(new Error(`Spawn error: ${error.message}`));
            });

            // Finalizar stdin
            child.stdin.end();
        });
    }

    async processMessageWithContext(message, context = []) {
        // Construir prompt com contexto
        let prompt = '';
        
        if (context.length > 0) {
            prompt += 'Contexto da conversa:\n';
            context.slice(-5).forEach(ctx => { // Últimas 5 mensagens
                prompt += `${ctx.role}: ${ctx.content}\n`;
            });
            prompt += '\n';
        }
        
        prompt += `Usuário: ${message}`;
        
        return this.processMessage(prompt);
    }

    isInitialized() {
        return this.initialized;
    }

    getRateLimitStatus() {
        return {
            allowed: this.rateLimiter.isAllowed(),
            remaining: this.rateLimiter.getRemaining(),
            resetTime: this.rateLimiter.getResetTime()
        };
    }

    getStats() {
        return {
            enabled: this.enabled,
            initialized: this.initialized,
            fallbackEnabled: this.fallbackEnabled,
            rateLimit: this.getRateLimitStatus()
        };
    }
}

module.exports = ClaudeCLIService;
```

### 3. Integrar no WhatsApp Bridge Principal
```javascript
// src/index.js - Atualizar o WhatsAppBridge
const ClaudeCLIService = require('./services/ClaudeCLIService');

class WhatsAppBridge {
    constructor() {
        // ... código existente ...
        
        this.claudeService = new ClaudeAIService();
        this.claudeCLIService = new ClaudeCLIService();
        
        // ... resto do código ...
    }

    async handleMessage(message) {
        try {
            if (message.from === 'status@broadcast') return;
            
            logger.info(`Message received from ${message.from}: ${message.body}`);
            
            let response = null;
            
            // Tentar Claude CLI primeiro (se habilitado)
            if (this.claudeCLIService.isInitialized()) {
                try {
                    response = await this.claudeCLIService.processMessage(message.body);
                    logger.info('Response generated via Claude CLI');
                } catch (error) {
                    logger.warn('Claude CLI failed, falling back to API:', error.message);
                    response = null;
                }
            }
            
            // Fallback para API regular se CLI falhou ou retornou null
            if (!response) {
                response = await this.claudeService.processMessage(message.body);
                logger.info('Response generated via Claude API');
            }
            
            // Store in Firebase
            await this.firebaseService.storeMessage({
                from: message.from,
                body: message.body,
                response: response,
                method: response ? (this.claudeCLIService.isInitialized() ? 'CLI' : 'API') : 'fallback',
                timestamp: new Date()
            });

            // Send response
            if (response) {
                await message.reply(response);
            }
        } catch (error) {
            logger.error('Error handling message:', error);
        }
    }
}
```

## 🔗 Integração Avançada

### Serviço Híbrido (CLI + API)
```javascript
// src/services/HybridClaudeService.js
class HybridClaudeService {
    constructor() {
        this.cliService = new ClaudeCLIService();
        this.apiService = new ClaudeAIService();
        this.preferCLI = process.env.CLAUDE_PREFER_CLI === 'true';
    }

    async processMessage(message) {
        const methods = this.preferCLI 
            ? [this.cliService, this.apiService]
            : [this.apiService, this.cliService];

        for (const service of methods) {
            try {
                if (service.isInitialized()) {
                    const response = await service.processMessage(message);
                    if (response && response !== null) {
                        return {
                            response,
                            method: service === this.cliService ? 'CLI' : 'API'
                        };
                    }
                }
            } catch (error) {
                logger.warn(`Service ${service.constructor.name} failed:`, error.message);
                continue;
            }
        }

        throw new Error('All Claude services failed');
    }
}
```

### Context Manager para CLI
```javascript
// src/managers/CLIContextManager.js
class CLIContextManager {
    constructor() {
        this.contexts = new Map();
        this.maxContextSize = 10;
    }

    addMessage(userId, role, content) {
        if (!this.contexts.has(userId)) {
            this.contexts.set(userId, []);
        }
        
        const context = this.contexts.get(userId);
        context.push({ role, content, timestamp: Date.now() });
        
        // Manter apenas as últimas mensagens
        if (context.length > this.maxContextSize) {
            context.splice(0, context.length - this.maxContextSize);
        }
    }

    getContext(userId) {
        return this.contexts.get(userId) || [];
    }

    buildPrompt(userId, newMessage) {
        const context = this.getContext(userId);
        
        if (context.length === 0) {
            return newMessage;
        }

        let prompt = 'Contexto da conversa:\n';
        context.forEach(ctx => {
            prompt += `${ctx.role}: ${ctx.content}\n`;
        });
        prompt += `\nUsuário atual: ${newMessage}`;
        
        return prompt;
    }

    clearContext(userId) {
        this.contexts.delete(userId);
    }
}
```

## 💡 Exemplos Práticos

### Exemplo 1: WhatsApp com Context Manager
```javascript
// Integração completa no WhatsApp Bridge
class WhatsAppBridge {
    constructor() {
        // ... código existente ...
        this.contextManager = new CLIContextManager();
    }

    async handleMessage(message) {
        try {
            const userId = message.from;
            const messageBody = message.body;
            
            // Construir prompt com contexto
            const prompt = this.contextManager.buildPrompt(userId, messageBody);
            
            // Processar com Claude CLI
            let response = null;
            if (this.claudeCLIService.isInitialized()) {
                try {
                    response = await this.claudeCLIService.processMessage(prompt);
                    
                    // Adicionar ao contexto
                    this.contextManager.addMessage(userId, 'user', messageBody);
                    this.contextManager.addMessage(userId, 'assistant', response);
                    
                } catch (error) {
                    logger.warn('Claude CLI failed:', error.message);
                }
            }
            
            // Fallback para API
            if (!response) {
                response = await this.claudeService.processMessage(messageBody);
                this.contextManager.addMessage(userId, 'user', messageBody);
                this.contextManager.addMessage(userId, 'assistant', response);
            }
            
            // Responder
            if (response) {
                await message.reply(response);
            }
            
        } catch (error) {
            logger.error('Error handling message:', error);
        }
    }
}
```

### Exemplo 2: Health Check Endpoint
```javascript
// src/routes/health.js
const express = require('express');
const router = express.Router();

router.get('/claude-cli', async (req, res) => {
    try {
        const claudeCLI = req.app.get('claudeCLIService');
        const stats = claudeCLI.getStats();
        
        // Teste rápido
        let testResult = null;
        if (claudeCLI.isInitialized()) {
            try {
                testResult = await claudeCLI.processMessage('teste');
            } catch (error) {
                testResult = `Error: ${error.message}`;
            }
        }
        
        res.json({
            status: 'ok',
            claudeCLI: {
                ...stats,
                test: testResult
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

module.exports = router;
```

## 🔧 Troubleshooting

### Problema: "claude: command not found"
```bash
# Verificar instalação
which claude
npm list -g @anthropic-ai/claude-code

# Reinstalar se necessário
npm uninstall -g @anthropic-ai/claude-code
npm install -g @anthropic-ai/claude-code

# Configurar caminho no .env
CLAUDE_CLI_COMMAND=/usr/local/bin/claude
```

### Problema: Timeout no WhatsApp Bridge
```javascript
// Aumentar timeout no .env
CLAUDE_CLI_TIMEOUT=60000

// Ou no código
const claudeCLI = new ClaudeCLIService();
claudeCLI.timeout = 60000;
```

### Debug Logs
```javascript
// Adicionar debug no ClaudeCLIService
child.stdout.on('data', (data) => {
    const output = data.toString();
    logger.debug('Claude CLI stdout:', output);
    stdout += output;
});

child.stderr.on('data', (data) => {
    const error = data.toString();
    logger.debug('Claude CLI stderr:', error);
    stderr += error;
});
```

### Script de Verificação
```bash
#!/bin/bash
# scripts/verify-claude-cli.sh

echo "🔍 Verificando Claude CLI..."

# Verificar comando
if command -v claude &> /dev/null; then
    echo "✅ Claude CLI encontrado: $(which claude)"
    echo "📋 Versão: $(claude --version)"
else
    echo "❌ Claude CLI não encontrado"
    exit 1
fi

# Claude CLI não precisa de API key local
echo "ℹ️  Claude CLI usa autenticação integrada"

# Teste rápido
echo "🧪 Testando Claude CLI..."
TEST_RESPONSE=$(claude "Responda apenas: OK" 2>&1)

if [[ $TEST_RESPONSE == *"OK"* ]]; then
    echo "✅ Claude CLI funcionando: $TEST_RESPONSE"
else
    echo "❌ Claude CLI falhou: $TEST_RESPONSE"
    exit 1
fi

echo "🎉 Verificação completa!"
```

## ⚠️ Limitações e Considerações

### Rate Limiting Específico
```javascript
// Configurar rate limits diferentes para CLI
class SmartRateLimiter {
    constructor() {
        this.cliLimiter = new RateLimiter(5, 60000);  // 5/min para CLI
        this.apiLimiter = new RateLimiter(10, 60000); // 10/min para API
    }

    canUseCLI() {
        return this.cliLimiter.isAllowed();
    }

    canUseAPI() {
        return this.apiLimiter.isAllowed();
    }
}
```

### Monitoramento de Performance
```javascript
// src/utils/ClaudeMonitor.js
class ClaudeMonitor {
    constructor() {
        this.stats = {
            cli: { requests: 0, errors: 0, totalTime: 0 },
            api: { requests: 0, errors: 0, totalTime: 0 }
        };
    }

    recordRequest(method, startTime, success = true) {
        const duration = Date.now() - startTime;
        const stat = this.stats[method];
        
        stat.requests++;
        stat.totalTime += duration;
        
        if (!success) {
            stat.errors++;
        }
    }

    getReport() {
        return {
            cli: {
                ...this.stats.cli,
                avgTime: this.stats.cli.requests > 0 ? this.stats.cli.totalTime / this.stats.cli.requests : 0,
                errorRate: this.stats.cli.requests > 0 ? this.stats.cli.errors / this.stats.cli.requests : 0
            },
            api: {
                ...this.stats.api,
                avgTime: this.stats.api.requests > 0 ? this.stats.api.totalTime / this.stats.api.requests : 0,
                errorRate: this.stats.api.requests > 0 ? this.stats.api.errors / this.stats.api.requests : 0
            }
        };
    }
}
```

### Scripts de Manutenção
```bash
# scripts/maintenance/check-claude-services.sh
#!/bin/bash

echo "🔍 Verificando serviços Claude..."

# Verificar processo do WhatsApp Bridge
if pgrep -f "whatsapp-bridge" > /dev/null; then
    echo "✅ WhatsApp Bridge rodando"
else
    echo "❌ WhatsApp Bridge não encontrado"
fi

# Verificar Claude CLI
if claude "teste" > /dev/null 2>&1; then
    echo "✅ Claude CLI funcionando"
else
    echo "❌ Claude CLI com problemas"
fi

# Verificar logs
if [ -f "logs/app.log" ]; then
    CLAUDE_ERRORS=$(grep -c "Claude.*error" logs/app.log)
    echo "📊 Erros Claude nas últimas execuções: $CLAUDE_ERRORS"
fi

echo "✅ Verificação concluída"
```

## 🚀 Comandos Úteis

### Scripts no package.json
```json
{
  "scripts": {
    "start": "node src/index.js",
    "verify-claude": "bash scripts/verify-claude-cli.sh",
    "check-services": "bash scripts/maintenance/check-claude-services.sh",
    "test-claude": "node scripts/test-claude-integration.js"
  }
}
```

### Script de Teste
```javascript
// scripts/test-claude-integration.js
const ClaudeCLIService = require('../src/services/ClaudeCLIService');
const ClaudeAIService = require('../src/services/ClaudeAIService');

async function testIntegration() {
    console.log('🧪 Testando integração Claude...');
    
    const cliService = new ClaudeCLIService();
    const apiService = new ClaudeAIService();
    
    // Teste CLI
    if (cliService.isInitialized()) {
        try {
            const cliResponse = await cliService.processMessage('Diga olá');
            console.log('✅ CLI Response:', cliResponse);
        } catch (error) {
            console.log('❌ CLI Error:', error.message);
        }
    }
    
    // Teste API
    if (apiService.isInitialized()) {
        try {
            const apiResponse = await apiService.processMessage('Diga olá');
            console.log('✅ API Response:', apiResponse);
        } catch (error) {
            console.log('❌ API Error:', error.message);
        }
    }
    
    console.log('🎉 Teste concluído');
}

testIntegration().catch(console.error);
```

---

**🤖 Claude Code CLI Integration - Integração robusta para WhatsApp Bridge**