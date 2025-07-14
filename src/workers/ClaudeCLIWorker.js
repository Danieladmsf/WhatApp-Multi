#!/usr/bin/env node

/**
 * Claude CLI Worker - Wrapper isolado para cada usuário
 * Este script executa o Claude CLI em um processo separado para evitar conflitos
 */

const { spawn } = require('child_process');
const path = require('path');

class ClaudeCLIWorker {
    constructor(userId) {
        this.userId = userId;
        this.claudeProcess = null;
        this.isReady = false;
    }

    async start() {
        console.log(`[${this.userId}] 🤖 Starting isolated Claude CLI worker`);
        
        try {
            // Iniciar Claude CLI em processo separado
            this.claudeProcess = spawn('claude', [], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    // Garantir que cada processo tenha seu próprio ambiente
                    CLAUDE_USER_ID: this.userId,
                    CLAUDE_SESSION_ID: `session_${this.userId}_${Date.now()}`
                },
                detached: false,
                windowsHide: true
            });

            console.log(`[${this.userId}] ✅ Claude CLI worker started with PID: ${this.claudeProcess.pid}`);

            // Setup dos handlers
            this.setupHandlers();

            // Aguardar processo estar pronto
            await this.waitForReady();
            
            console.log(`[${this.userId}] 🎉 Claude CLI worker ready and listening`);
            
            // Processar mensagens do stdin
            this.processMessages();

        } catch (error) {
            console.error(`[${this.userId}] ❌ Failed to start Claude CLI worker:`, error.message);
            process.exit(1);
        }
    }

    setupHandlers() {
        // Handler de saída
        this.claudeProcess.stdout.on('data', (data) => {
            const response = data.toString();
            // Enviar resposta de volta para o processo pai via stdout
            process.stdout.write(`CLAUDE_RESPONSE:${this.userId}:${response}\n`);
        });

        // Handler de erro
        this.claudeProcess.stderr.on('data', (data) => {
            console.error(`[${this.userId}] Claude CLI stderr:`, data.toString());
        });

        // Handler de fechamento
        this.claudeProcess.on('close', (code) => {
            console.log(`[${this.userId}] Claude CLI process closed with code: ${code}`);
            process.exit(code || 0);
        });

        // Handler de erro do processo
        this.claudeProcess.on('error', (error) => {
            console.error(`[${this.userId}] Claude CLI process error:`, error.message);
            process.exit(1);
        });
    }

    async waitForReady() {
        return new Promise((resolve) => {
            // Aguardar um tempo para o Claude CLI inicializar
            setTimeout(() => {
                this.isReady = true;
                resolve();
            }, 8000); // 8 segundos como configurado anteriormente
        });
    }

    processMessages() {
        // Processar mensagens do stdin
        process.stdin.on('data', (data) => {
            const message = data.toString().trim();
            if (message && this.claudeProcess && this.isReady) {
                console.log(`[${this.userId}] 📤 Sending message to Claude CLI`);
                this.claudeProcess.stdin.write(message + '\n');
            }
        });

        // Handler de fechamento do stdin
        process.stdin.on('end', () => {
            console.log(`[${this.userId}] 📥 Input stream ended, closing Claude CLI`);
            if (this.claudeProcess) {
                this.claudeProcess.kill();
            }
        });
    }

    cleanup() {
        if (this.claudeProcess) {
            console.log(`[${this.userId}] 🧹 Cleaning up Claude CLI worker`);
            this.claudeProcess.kill();
        }
    }
}

// Handler de sinais para cleanup
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, cleaning up...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, cleaning up...');
    process.exit(0);
});

// Inicializar worker
const userId = process.argv[2];
if (!userId) {
    console.error('Usage: node ClaudeCLIWorker.js <userId>');
    process.exit(1);
}

const worker = new ClaudeCLIWorker(userId);
worker.start().catch((error) => {
    console.error('Failed to start Claude CLI worker:', error);
    process.exit(1);
});