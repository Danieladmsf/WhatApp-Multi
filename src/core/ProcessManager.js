const { spawn } = require('child_process');
const logger = require('../utils/logger');
const { PROCESS } = require('../constants/config');

/**
 * Gerenciador de processos isolados para usuários WhatsApp
 * Cada usuário recebe seu próprio processo Node.js com WhatsApp + Claude CLI
 */
class ProcessManager {
    constructor() {
        this.activeProcesses = new Map(); // userId -> childProcess
        this.processInfo = new Map(); // userId -> { pid, status, startTime, restartCount }
    }

    async createUserProcess(userId) {
        try {
            // Se já existe processo para este usuário, destruir primeiro
            if (this.activeProcesses.has(userId)) {
                logger.info(`🔄 Destroying existing process for user: ${userId}`);
                await this.destroyUserProcess(userId);
            }

            logger.info(`🚀 Creating new WhatsApp process for user: ${userId}`);
            
            // Spawn processo isolado para este usuário
            const childProcess = spawn('node', [PROCESS.WORKER_SCRIPT], {
                env: {
                    ...process.env,
                    WORKER_USER_ID: userId,
                    NODE_ENV: process.env.NODE_ENV || 'development'
                },
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Armazenar processo
            this.activeProcesses.set(userId, childProcess);
            this.processInfo.set(userId, {
                pid: childProcess.pid,
                status: 'starting',
                startTime: new Date(),
                restartCount: 0
            });

            // Setup event listeners
            this.setupProcessListeners(userId, childProcess);

            logger.info(`✅ Process created for user ${userId} with PID: ${childProcess.pid}`);
            return childProcess;

        } catch (error) {
            logger.error(`❌ Error creating process for user ${userId}:`, error);
            throw error;
        }
    }

    setupProcessListeners(userId, childProcess) {
        // Handle stdout (logs normais) - filtrar logs já formatados
        childProcess.stdout.on('data', (data) => {
            const message = data.toString().trim();
            if (message && !message.includes('[2025-') && !message.includes('📋')) {
                // Apenas logs simples, sem timestamp já formatado
                logger.info(`[${userId}] ${message}`);
            }
        });

        // Handle stderr (logs de erro)
        childProcess.stderr.on('data', (data) => {
            const message = data.toString().trim();
            if (message) {
                logger.error(`[${userId}] ERROR: ${message}`);
            }
        });

        // Handle process exit
        childProcess.on('exit', (code, signal) => {
            logger.warn(`[${userId}] Process exited with code ${code}, signal ${signal}`);
            this.activeProcesses.delete(userId);
            this.processInfo.delete(userId);
        });

        // Handle errors
        childProcess.on('error', (error) => {
            logger.error(`[${userId}] Process error:`, error);
            this.activeProcesses.delete(userId);
            this.processInfo.delete(userId);
        });

        // Update status
        this.updateProcessStatus(userId, 'running');
    }

    async destroyUserProcess(userId) {
        try {
            const childProcess = this.activeProcesses.get(userId);
            if (childProcess) {
                logger.info(`🛑 Destroying process for user: ${userId} (PID: ${childProcess.pid})`);
                
                // Graceful shutdown primeiro
                childProcess.kill('SIGTERM');
                
                // Se não morrer no timeout configurado, força
                setTimeout(() => {
                    if (this.activeProcesses.has(userId)) {
                        logger.warn(`⚡ Force killing process for user: ${userId}`);
                        childProcess.kill('SIGKILL');
                    }
                }, PROCESS.GRACEFUL_SHUTDOWN_TIMEOUT);

                this.activeProcesses.delete(userId);
                this.processInfo.delete(userId);
            }
        } catch (error) {
            logger.error(`❌ Error destroying process for user ${userId}:`, error);
        }
    }

    updateProcessStatus(userId, status) {
        const info = this.processInfo.get(userId);
        if (info) {
            info.status = status;
            info.lastUpdate = new Date();
            this.processInfo.set(userId, info);
        }
    }

    getProcessInfo(userId) {
        return this.processInfo.get(userId);
    }

    getAllProcesses() {
        return Array.from(this.processInfo.entries()).map(([userId, info]) => ({
            userId,
            ...info
        }));
    }

    isUserProcessActive(userId) {
        return this.activeProcesses.has(userId);
    }

    async cleanup() {
        logger.info('🧹 Cleaning up all user processes...');
        
        const destroyPromises = Array.from(this.activeProcesses.keys()).map(userId => 
            this.destroyUserProcess(userId)
        );
        
        await Promise.all(destroyPromises);
        logger.info('✅ All processes cleaned up');
    }
}

module.exports = ProcessManager;