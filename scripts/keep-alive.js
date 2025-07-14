#!/usr/bin/env node

/**
 * 🔄 Codespace Keep-Alive System
 * Mantém o GitHub Codespace ativo simulando atividade real de usuário
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../src/utils/logger');

class CodespaceKeepAlive {
    constructor() {
        // Configurações do ambiente
        this.codespace = process.env.CODESPACE_NAME || 'automatic-waffle-pjp946wvg4w4297w6';
        this.domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev';
        this.port = process.env.PORT || 3000;
        
        // Configurações do keep-alive
        this.interval = 3 * 60 * 1000; // 3 minutos
        this.running = false;
        this.intervalId = null;
        
        // URLs para fazer ping
        this.urls = [
            `https://${this.codespace}-${this.port}.${this.domain}/health`,
            `https://${this.codespace}-${this.port}.${this.domain}/`
        ];
        
        // User agents para simular diferentes navegadores
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
        ];
    }

    /**
     * 🌐 Simula requisição HTTP de usuário real
     */
    async simulateUserRequest(url) {
        return new Promise((resolve, reject) => {
            const randomUserAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
            
            const options = {
                method: 'GET',
                headers: {
                    'User-Agent': randomUserAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Cache-Control': 'max-age=0',
                    'DNT': '1'
                },
                timeout: 15000
            };

            const req = https.request(url, options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        size: data.length,
                        url: url
                    });
                });
            });

            req.on('error', (error) => reject(error));
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    /**
     * 💻 Simula atividade de CPU
     */
    simulateCPUActivity() {
        const start = Date.now();
        let iterations = 0;
        
        // 200ms de atividade de CPU
        while (Date.now() - start < 200) {
            iterations++;
            Math.random() * Math.random() * Date.now();
        }
        
        return iterations;
    }

    /**
     * 📁 Simula atividade do sistema de arquivos
     */
    async simulateFileSystemActivity() {
        try {
            const tempDir = path.join(__dirname, '../temp');
            const tempFile = path.join(tempDir, 'keepalive.tmp');
            const timestamp = new Date().toISOString();
            
            // Criar diretório se não existir
            try {
                await fs.mkdir(tempDir, { recursive: true });
            } catch (err) {
                // Diretório já existe
            }
            
            // Escrever arquivo temporário
            await fs.writeFile(tempFile, `Keep-alive: ${timestamp}\n`, { flag: 'a' });
            
            // Limpar arquivo se ficar muito grande
            const stats = await fs.stat(tempFile);
            if (stats.size > 5000) { // 5KB
                await fs.writeFile(tempFile, `Keep-alive restarted: ${timestamp}\n`);
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 🧠 Simula atividade de memória
     */
    simulateMemoryActivity() {
        // Criar array temporário para simular uso de memória
        const tempArray = new Array(5000).fill(0).map(() => ({
            id: Math.random(),
            timestamp: Date.now(),
            data: Math.random().toString(36)
        }));
        
        // Fazer algumas operações
        const filtered = tempArray.filter(item => item.id > 0.5);
        const mapped = filtered.map(item => item.timestamp);
        
        // Limpar memória
        tempArray.length = 0;
        
        return { processed: filtered.length, memory: mapped.length };
    }

    /**
     * 🔄 Executa um ciclo completo de keep-alive
     */
    async runKeepAliveCycle() {
        const cycleStart = Date.now();
        
        try {
            logger.info('🔄 Keep-alive cycle starting...');
            
            // 1. Atividade de CPU
            const cpuIterations = this.simulateCPUActivity();
            
            // 2. Atividade de memória
            const memoryActivity = this.simulateMemoryActivity();
            
            // 3. Atividade do sistema de arquivos
            const fileActivity = await this.simulateFileSystemActivity();
            
            // 4. Requisições HTTP com delays realistas
            let successfulRequests = 0;
            for (const url of this.urls) {
                try {
                    const response = await this.simulateUserRequest(url);
                    logger.info(`✅ Keep-alive ping: ${response.statusCode} - ${response.size}b`);
                    successfulRequests++;
                    
                    // Delay entre requisições (simula navegação humana)
                    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
                    
                } catch (error) {
                    logger.warn(`⚠️ Keep-alive ping failed: ${error.message}`);
                }
            }
            
            const cycleTime = Date.now() - cycleStart;
            const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
            
            logger.info(`📊 Keep-alive cycle completed: ${cycleTime}ms | CPU: ${cpuIterations} ops | Memory: ${memoryUsage}MB | Requests: ${successfulRequests}/${this.urls.length} | FS: ${fileActivity ? '✅' : '❌'}`);
            
            return {
                success: true,
                duration: cycleTime,
                requests: successfulRequests,
                cpuActivity: cpuIterations,
                memoryActivity: memoryActivity.processed,
                fileSystem: fileActivity
            };
            
        } catch (error) {
            logger.error('❌ Keep-alive cycle failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 🚀 Inicia o sistema keep-alive
     */
    async start() {
        if (this.running) {
            logger.warn('Keep-alive already running');
            return;
        }
        
        this.running = true;
        
        logger.info('🚀 Starting Codespace Keep-Alive System');
        logger.info(`🌐 Target URLs: ${this.urls.join(', ')}`);
        logger.info(`⏱️ Cycle interval: ${this.interval / 1000}s`);
        logger.info(`🖥️ Codespace: ${this.codespace}`);
        
        // Executar primeiro ciclo imediatamente
        await this.runKeepAliveCycle();
        
        // Configurar execução periódica
        this.intervalId = setInterval(async () => {
            if (this.running) {
                await this.runKeepAliveCycle();
            }
        }, this.interval);
        
        logger.info('✅ Keep-alive system active - Codespace will stay alive 24/7!');
    }

    /**
     * 🛑 Para o sistema keep-alive
     */
    stop() {
        if (!this.running) {
            logger.warn('Keep-alive not running');
            return;
        }
        
        this.running = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        logger.info('🛑 Keep-alive system stopped');
    }

    /**
     * 📊 Retorna status atual
     */
    getStatus() {
        return {
            running: this.running,
            urls: this.urls,
            interval: this.interval,
            codespace: this.codespace,
            uptime: process.uptime(),
            memory: process.memoryUsage()
        };
    }
}

// Se executado diretamente
if (require.main === module) {
    const keepAlive = new CodespaceKeepAlive();
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        logger.info('🛑 Received SIGINT - stopping keep-alive...');
        keepAlive.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        logger.info('🛑 Received SIGTERM - stopping keep-alive...');
        keepAlive.stop();
        process.exit(0);
    });
    
    // Iniciar sistema
    keepAlive.start().catch(error => {
        logger.error('❌ Failed to start keep-alive:', error);
        process.exit(1);
    });
}

module.exports = CodespaceKeepAlive;