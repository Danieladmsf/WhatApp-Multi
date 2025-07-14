const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');
const logger = require('../utils/logger');
const RateLimiter = require('../utils/RateLimiter');

class ClaudeCLIService {
    constructor(userId = null) {
        this.userId = userId;
        this.enabled = process.env.CLAUDE_CLI_ENABLED !== 'false'; // Habilitado por padrão
        // Usar Claude CLI em modo não-interativo (--print) para evitar conflitos
        this.command = process.env.CLAUDE_CLI_COMMAND || 'claude';
        this.useRealClaude = process.env.USE_REAL_CLAUDE !== 'false';
        this.timeout = parseInt(process.env.CLAUDE_CLI_TIMEOUT) || 120000; // 2 minutos
        
        // Rate limiter para CLI
        this.rateLimiter = new RateLimiter(
            parseInt(process.env.CLAUDE_CLI_MAX_REQUESTS) || 10,
            parseInt(process.env.CLAUDE_CLI_WINDOW_MS) || 60000
        );
        
        // Processo Claude CLI interativo
        this.claudeProcess = null;
        this.isProcessReady = false;
        this.isStarting = false; // Flag para prevenir inicializações simultâneas
        this.messageQueue = [];
        this.currentMessageCallback = null;
        this.conversationSummary = '';
        
        // Histórico de conversa para janela de contexto
        this.conversationHistory = [];
        
        // Inicializar Firebase (se já não estiver)
        this.db = admin.firestore();
        
        // Verificar se Claude CLI está disponível
        this.initialized = this.checkClaudeCLI();
        
        if (!this.initialized) {
            if (this.userId) {
                console.log('❌ Claude CLI service not initialized - CLI not available');
                console.log('Please install Claude CLI: npm install -g @anthropic-ai/claude-code');
            } else {
                logger.error('Claude CLI service not initialized - CLI not available');
                logger.info('Please install Claude CLI: npm install -g @anthropic-ai/claude-code');
            }
        } else {
            if (this.userId) {
                console.log(`Claude CLI service initialized successfully for user: ${userId}`);
            } else {
                logger.info(`Claude CLI service initialized successfully for user: ${userId || 'system'}`);
            }
            this.startInteractiveProcess();
        }
    }

    checkClaudeCLI() {
        try {
            const { execSync } = require('child_process');
            execSync('which claude', { stdio: 'ignore' });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Helper para logs - usa console.log para workers, logger para sistema principal
     */
    log(message, level = 'info') {
        if (this.userId) {
            // Worker process - usa console.log simples
            console.log(message);
        } else {
            // Sistema principal - usa logger formatado
            logger[level](message);
        }
    }

    /**
     * Inicia processo Claude CLI interativo
     */
    async startInteractiveProcess() {
        if (!this.initialized) {
            return;
        }
        
        // Prevenir múltiplos processos e inicializações simultâneas
        if (this.isStarting) {
            logger.warn(`Claude CLI already starting for user: ${this.userId}`);
            return;
        }
        
        if (this.claudeProcess && !this.claudeProcess.killed) {
            this.log(`Claude CLI process already running (PID: ${this.claudeProcess.pid}) for user: ${this.userId}`, 'warn');
            return;
        }
        
        if (this.isStarting) {
            this.log(`Claude CLI already starting for user: ${this.userId}`, 'warn');
            return;
        }
        
        this.isStarting = true;

        try {
            this.log(`🤖 Starting interactive Claude CLI process for user: ${this.userId} (PID will be assigned)`);
            
            // Criar diretórios temporários para isolamento
            const tmpDir = `/tmp/claude_${this.userId}`;
            const configDir = `/tmp/claude_config_${this.userId}`;
            const homeDir = `/tmp/claude_home_${this.userId}`;
            
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            if (!fs.existsSync(homeDir)) {
                fs.mkdirSync(homeDir, { recursive: true });
            }
            
            // Iniciar Mock Claude CLI para desenvolvimento
            this.claudeProcess = spawn(this.command, [this.mockScript], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    // Criar ambiente TTY isolado
                    TERM: 'xterm-256color',
                    // Usar diretório temporário específico por usuário para isolamento
                    TMPDIR: `/tmp/claude_${this.userId}`,
                    HOME: `/tmp/claude_home_${this.userId}`,
                    CLAUDE_USER_ID: this.userId,
                    CLAUDE_SESSION_ID: `session_${this.userId}_${Date.now()}`,
                    // Evitar conflitos com sessão principal
                    CLAUDE_CONFIG_PATH: `/tmp/claude_config_${this.userId}`,
                    // Forçar nova sessão
                    SHLVL: '1'
                },
                cwd: process.cwd(),
                detached: false
            });
            
            this.log(`[${this.userId}] Claude CLI spawned with PID: ${this.claudeProcess.pid}`);

            let responseBuffer = '';
            this.waitingForResponse = false;

            // Processar saída do Claude CLI
            this.claudeProcess.stdout.on('data', (data) => {
                const text = data.toString();
                responseBuffer += text;
                
                logger.debug(`[${this.userId}] Claude CLI stdout chunk: ${JSON.stringify(text.slice(0, 100))}`);
                
                // Detectar fim da resposta (Claude CLI termina com prompt ou linha vazia)
                if (text.includes('\n\n') || text.includes('> ') || text.endsWith('\n')) {
                    if (this.waitingForResponse && this.currentMessageCallback) {
                        this.waitingForResponse = false;
                        const response = responseBuffer.trim();
                        
                        logger.info(`[${this.userId}] Claude CLI response ready, length: ${response.length}`);
                        
                        // Verificar se atingiu limite de contexto
                        if (this.isContextLimitReached(response)) {
                            this.handleContextLimit().then(() => {
                                this.currentMessageCallback(response);
                                this.currentMessageCallback = null;
                            });
                        } else {
                            this.currentMessageCallback(response);
                            this.currentMessageCallback = null;
                        }
                        
                        responseBuffer = '';
                    }
                }
            });

            // Processar erros
            this.claudeProcess.stderr.on('data', (data) => {
                const error = data.toString();
                logger.warn(`Claude CLI stderr: ${error}`);
                
                // Verificar limite de contexto nos erros também
                if (this.isContextLimitReached(error)) {
                    this.handleContextLimit();
                }
            });

            // Processo encerrado
            this.claudeProcess.on('close', (code) => {
                const pid = this.claudeProcess ? this.claudeProcess.pid : 'unknown';
                this.log(`🔴 Claude CLI process (PID: ${pid}) closed with code: ${code} for user: ${this.userId}`, 'error');
                this.claudeProcess = null;
                this.isProcessReady = false;
                this.isStarting = false; // Reset da flag quando processo fecha
                
                // Reiniciar processo se necessário
                if (code !== 0) {
                    this.log(`🔄 Process closed with error, will restart in 2s`, 'warn');
                    setTimeout(() => this.startInteractiveProcess(), 2000);
                } else {
                    this.log(`✅ Process closed cleanly`, 'info');
                }
            });

            // Aguardar processo estar pronto (tempo suficiente para Claude CLI inicializar)
            setTimeout(() => {
                this.isProcessReady = true;
                this.isStarting = false; // Reset da flag de inicialização
                this.log(`✅ Interactive Claude CLI ready for user: ${this.userId}`);
                
                // Enviar resumo se existir
                if (this.conversationSummary) {
                    this.sendContextSummary();
                }
                
                // Processar mensagens na fila
                this.processMessageQueue();
            }, 8000); // Aumentado para 8s para Claude CLI inicializar completamente

        } catch (error) {
            this.isStarting = false; // Reset da flag em caso de erro
            this.log(`❌ Error starting Claude CLI process for user ${this.userId}: ${error.message}`, 'error');
        }
    }

    /**
     * Testa se Claude CLI está respondendo
     */
    async testClaude() {
        return new Promise((resolve, reject) => {
            if (!this.claudeProcess) {
                reject(new Error('No Claude process'));
                return;
            }

            const testMessage = "hi\n";
            let responseReceived = false;
            
            const timeout = setTimeout(() => {
                if (!responseReceived) {
                    reject(new Error('Claude CLI test timeout'));
                }
            }, 8000); // 8s timeout para teste

            const onData = (data) => {
                const response = data.toString().toLowerCase();
                // Qualquer resposta indica que o processo está funcionando
                if (response.length > 3) {
                    responseReceived = true;
                    clearTimeout(timeout);
                    this.claudeProcess.stdout.removeListener('data', onData);
                    resolve(true);
                }
            };

            this.claudeProcess.stdout.on('data', onData);
            this.claudeProcess.stdin.write(testMessage);
        });
    }

    /**
     * Processa mensagem via Claude CLI não-interativo (--print)
     */
    async processMessage(message, attachments = []) {
        if (!this.initialized) {
            logger.error('Claude CLI not available');
            return 'Desculpe, Claude CLI não está disponível.';
        }

        if (!this.rateLimiter.isAllowed()) {
            logger.warn('Rate limit exceeded for Claude CLI requests');
            return 'Muitas solicitações. Aguarde um momento antes de tentar novamente.';
        }

        // Validar mensagem
        if (!message || message.trim().length === 0) {
            logger.warn('Empty message received, providing default response');
            return 'Olá! Como posso ajudá-lo hoje?';
        }

        // Usar Claude CLI em modo --print (não-interativo)
        return this.processWithClaudePrint(message, attachments);
    }

    /**
     * Novo método que usa claude --print para evitar conflitos
     */
    async processWithClaudePrint(message, attachments = []) {
        this.log(`[${this.userId}] 📤 Enviando mensagem para Claude CLI --print`);
        
        // Construir mensagem com contexto manual (já que UUID complica)
        const finalMessage = await this.buildSimpleContext(message, attachments);
        
        return new Promise((resolve, reject) => {
            // Executar claude --print simples (sem sessão por agora)
            const claudeProcess = spawn(this.command, ['--print'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    CLAUDE_USER_ID: this.userId,
                    TMPDIR: `/tmp/claude_${this.userId}`
                }
            });

            let response = '';
            let errorOutput = '';
            
            const timeoutId = setTimeout(() => {
                claudeProcess.kill('SIGTERM');
                reject(new Error(`Claude CLI timeout for user: ${this.userId}`));
            }, this.timeout);

            // Handlers para stdout, stderr e close
            claudeProcess.stdout.on('data', (data) => {
                response += data.toString();
            });

            claudeProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            claudeProcess.on('close', async (code) => {
                clearTimeout(timeoutId);
                
                if (code === 0) {
                    const finalResponse = response.trim();
                    this.log(`[${this.userId}] ✅ Claude CLI --print sucesso: ${finalResponse.length} chars`);
                    
                    // Salvar no histórico de conversa para contexto manual
                    this.addToConversationHistory(message, finalResponse);
                    
                    resolve(finalResponse);
                } else {
                    this.log(`[${this.userId}] ❌ Claude CLI --print erro: código ${code}`, 'error');
                    reject(new Error(`Claude CLI failed with code ${code}: ${errorOutput}`));
                }
            });

            claudeProcess.on('error', (error) => {
                clearTimeout(timeoutId);
                reject(new Error(`Claude CLI spawn error: ${error.message}`));
            });

            // Enviar mensagem via stdin
            claudeProcess.stdin.write(finalMessage);
            claudeProcess.stdin.end();
        });
    }

    /**
     * Constrói contexto com janela de conversa (últimas mensagens)
     */
    async buildSimpleContext(message, attachments = []) {
        let fullMessage = '';
        
        // Adicionar contexto básico
        fullMessage += `Você está conversando com o usuário ${this.userId} via WhatsApp. `;
        fullMessage += `Mantenha um tom amigável e responda de forma útil.\n\n`;
        
        // Buscar últimas mensagens do contexto
        const recentContext = await this.getRecentMessages();
        if (recentContext) {
            fullMessage += `CONVERSA ANTERIOR:\n${recentContext}\n\n`;
        }
        
        // Adicionar mensagem atual
        fullMessage += `NOVA MENSAGEM:\nUser: ${message}`;
        
        // Adicionar informações sobre anexos se houver
        if (attachments && attachments.length > 0) {
            fullMessage += `\n\nAnexos: `;
            attachments.forEach((attachment, index) => {
                fullMessage += `${attachment.filename} `;
            });
        }
        
        return fullMessage;
    }

    /**
     * Adiciona mensagem ao histórico de conversa
     */
    addToConversationHistory(userMessage, claudeResponse) {
        try {
            // Adicionar mensagem do usuário
            this.conversationHistory.push({
                role: 'User',
                content: userMessage.trim(),
                timestamp: new Date()
            });
            
            // Adicionar resposta do Claude
            this.conversationHistory.push({
                role: 'Claude',
                content: claudeResponse.trim(),
                timestamp: new Date()
            });
            
            // Manter apenas últimas 10 mensagens (5 trocas User/Claude)
            if (this.conversationHistory.length > 10) {
                this.conversationHistory = this.conversationHistory.slice(-10);
            }
            
            this.log(`[${this.userId}] 💾 Histórico atualizado: ${this.conversationHistory.length} mensagens`);
            
        } catch (error) {
            this.log(`[${this.userId}] ⚠️ Erro ao salvar no histórico: ${error.message}`, 'warn');
        }
    }

    /**
     * Busca últimas mensagens para contexto (janela deslizante)
     */
    async getRecentMessages() {
        try {
            if (!this.conversationHistory || this.conversationHistory.length === 0) {
                return null;
            }
            
            // Retornar últimas 6 mensagens (3 trocas User/Claude)
            const recentMessages = this.conversationHistory.slice(-6);
            
            // Formatar para contexto
            return recentMessages.map(msg => {
                return `${msg.role}: ${msg.content}`;
            }).join('\n');
            
        } catch (error) {
            this.log(`[${this.userId}] ⚠️ Erro ao buscar contexto: ${error.message}`, 'warn');
            return null;
        }
    }

    /**
     * Constrói mensagem com contexto da conversa
     */
    buildMessageWithContext(message, attachments = []) {
        let fullMessage = '';
        
        // Adicionar contexto/resumo se existir
        if (this.conversationSummary) {
            fullMessage += `CONTEXTO DA CONVERSA ANTERIOR:\n${this.conversationSummary}\n\n`;
        }
        
        // Adicionar instrução para manter contexto
        fullMessage += `INSTRUÇÕES: Você está conversando com o usuário ${this.userId}. Mantenha o contexto da conversa. Se há um resumo acima, use-o como referência da conversa anterior.\n\n`;
        
        // Adicionar mensagem atual
        fullMessage += `NOVA MENSAGEM DO USUÁRIO:\n${message}`;
        
        // Adicionar informações sobre anexos se houver
        if (attachments && attachments.length > 0) {
            fullMessage += `\n\nANEXOS:\n`;
            attachments.forEach((attachment, index) => {
                fullMessage += `${index + 1}. ${attachment.filename} (${attachment.mimetype})\n`;
            });
        }
        
        return fullMessage;
    }

    /**
     * Salva contexto da conversa no Firebase
     */
    async saveConversationContext(userMessage, claudeResponse) {
        try {
            if (!this.db) return;
            
            const conversationRef = this.db.collection('conversations').doc(this.userId);
            const timestamp = new Date();
            
            // Adicionar nova troca à conversa
            await conversationRef.collection('messages').add({
                userMessage: userMessage,
                claudeResponse: claudeResponse,
                timestamp: timestamp,
                messageLength: userMessage.length + claudeResponse.length
            });
            
            // Atualizar estatísticas da conversa
            const conversationDoc = await conversationRef.get();
            const currentData = conversationDoc.exists ? conversationDoc.data() : {};
            
            await conversationRef.set({
                lastMessage: timestamp,
                totalMessages: (currentData.totalMessages || 0) + 1,
                totalLength: (currentData.totalLength || 0) + userMessage.length + claudeResponse.length,
                lastActivity: timestamp
            }, { merge: true });
            
            this.log(`[${this.userId}] 💾 Contexto salvo no Firebase`);
            
        } catch (error) {
            logger.error(`Error saving conversation context for user ${this.userId}:`, error);
        }
    }

    /**
     * Verifica se deve criar resumo da conversa
     */
    shouldCreateSummary() {
        // Criar resumo a cada 10 mensagens ou quando atingir 8000 caracteres
        // TODO: Implementar lógica baseada no Firebase
        return false; // Por enquanto desabilitar resumo automático
    }

    /**
     * Gera resumo inteligente da conversa
     */
    async generateConversationSummary() {
        try {
            this.log(`[${this.userId}] 🧠 Gerando resumo inteligente da conversa`);
            
            // TODO: Buscar últimas mensagens do Firebase e gerar resumo
            // Por enquanto, manter summary vazio
            
        } catch (error) {
            logger.error(`Error generating conversation summary for user ${this.userId}:`, error);
        }
    }

    /**
     * Formata mensagem com anexos
     */
    formatMessage(message, attachments = []) {
        let formattedMessage = message.trim();
        
        // TODO: Quando Claude CLI suportar imagens, adicionar aqui
        if (attachments && attachments.length > 0) {
            formattedMessage += '\n\n[Usuário enviou anexos que não podem ser processados no momento]';
        }
        
        return formattedMessage;
    }

    /**
     * Verifica se atingiu limite de contexto
     */
    isContextLimitReached(text) {
        const contextLimitIndicators = [
            'context limit',
            'too long',
            'maximum context',
            'context window',
            'token limit',
            'conversation too long'
        ];
        
        return contextLimitIndicators.some(indicator => 
            text.toLowerCase().includes(indicator)
        );
    }

    /**
     * Gerencia limite de contexto com resumo inteligente
     */
    async handleContextLimit() {
        logger.warn(`🔄 Context limit reached for user: ${this.userId}, requesting summary...`);
        
        try {
            // Pedir resumo da conversa ao próprio Claude
            const summaryPrompt = 'Por favor, faça um resumo conciso desta conversa, mantendo os pontos principais e o contexto atual. Limite a 3-4 parágrafos.';
            
            return new Promise((resolve) => {
                this.currentMessageCallback = (summary) => {
                    this.conversationSummary = summary;
                    logger.info(`✅ Conversation summary generated for user: ${this.userId}`);
                    
                    // Reiniciar processo com resumo
                    this.restartWithSummary();
                    resolve();
                };
                
                this.claudeProcess.stdin.write(summaryPrompt + '\n');
            });
            
        } catch (error) {
            logger.error(`❌ Error handling context limit for user ${this.userId}:`, error);
            // Fallback: reiniciar sem resumo
            this.restartProcess();
        }
    }

    /**
     * Reinicia processo Claude CLI com resumo
     */
    async restartWithSummary() {
        logger.info(`🔄 Restarting Claude CLI with summary for user: ${this.userId}`);
        
        // Encerrar processo atual
        if (this.claudeProcess) {
            this.claudeProcess.kill('SIGTERM');
            this.claudeProcess = null;
        }
        
        this.isProcessReady = false;
        
        // Aguardar um pouco e reiniciar
        setTimeout(() => {
            this.startInteractiveProcess();
        }, 1000);
    }

    /**
     * Envia resumo como contexto inicial
     */
    async sendContextSummary() {
        if (!this.conversationSummary || !this.claudeProcess) {
            return;
        }
        
        logger.info(`📋 Sending conversation summary to Claude CLI for user: ${this.userId}`);
        
        const contextMessage = `Contexto da conversa anterior:\n${this.conversationSummary}\n\nContinue a partir deste contexto.`;
        
        this.claudeProcess.stdin.write(contextMessage + '\n');
        
        // Aguardar resposta de confirmação
        setTimeout(() => {
            logger.info(`✅ Context summary sent for user: ${this.userId}`);
        }, 1000);
    }

    /**
     * Processa fila de mensagens
     */
    async processMessageQueue() {
        while (this.messageQueue.length > 0 && this.isProcessReady) {
            const { message, resolve, reject, timeoutId } = this.messageQueue.shift();
            
            try {
                const response = await this.processMessage(message);
                clearTimeout(timeoutId);
                resolve(response);
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        }
    }

    /**
     * Reinicia processo (fallback)
     */
    async restartProcess() {
        logger.warn(`🔄 Restarting Claude CLI process for user: ${this.userId}`);
        
        if (this.claudeProcess) {
            this.claudeProcess.kill('SIGTERM');
            this.claudeProcess = null;
        }
        
        this.isProcessReady = false;
        this.conversationSummary = ''; // Reset summary
        
        setTimeout(() => {
            this.startInteractiveProcess();
        }, 1000);
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
            processReady: this.isProcessReady,
            hasProcess: !!this.claudeProcess,
            queueLength: this.messageQueue.length,
            hasSummary: !!this.conversationSummary,
            rateLimit: this.getRateLimitStatus()
        };
    }

    /**
     * Cleanup - encerra processo Claude CLI
     */
    async cleanup() {
        logger.info(`🧹 Cleaning up Claude CLI service for user: ${this.userId}`);
        
        if (this.claudeProcess) {
            try {
                this.claudeProcess.kill('SIGTERM');
                // Aguardar um pouco para o processo terminar graciosamente
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                if (!this.claudeProcess.killed) {
                    // Force kill se não terminou
                    this.claudeProcess.kill('SIGKILL');
                }
            } catch (error) {
                logger.warn(`Warning killing Claude CLI process for user ${this.userId}:`, error.message);
            }
            this.claudeProcess = null;
        }
        
        // Reset de todos os estados
        this.isProcessReady = false;
        this.isStarting = false;
        this.waitingForResponse = false;
        this.messageQueue = [];
        this.currentMessageCallback = null;
        
        logger.info(`✅ Claude CLI cleanup completed for user: ${this.userId}`);
    }
}

module.exports = ClaudeCLIService;