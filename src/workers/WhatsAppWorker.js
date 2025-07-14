const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const admin = require('firebase-admin');
const { WHATSAPP, FIREBASE } = require('../constants/config');

// Use console.log simples para evitar duplicação de logs formatados

/**
 * Worker isolado para cada usuário
 * Cada instância gerencia uma conexão WhatsApp + Claude CLI independente
 */
class WhatsAppWorker {
    constructor(userId) {
        this.userId = userId;
        this.client = null;
        this.db = null;
        this.claudeService = null;
        this.isReady = false;
        
        this.init();
    }

    async init() {
        try {
            console.log(`🚀 WhatsApp Worker starting for user: ${this.userId}`);
            
            // Inicializar Firebase para este worker
            await this.initFirebase();
            
            // Claude CLI será inicializado sob demanda quando primeira mensagem chegar
            // await this.initClaude(); // ← REMOVIDO!
            
            // Criar cliente WhatsApp isolado
            await this.createWhatsAppClient();
            
            console.log(`✅ Worker initialized for user: ${this.userId}`);
            
        } catch (error) {
            console.error(`❌ Error initializing worker for ${this.userId}:`, error.message);
            
            // Aguardar um pouco antes de tentar novamente em caso de conflito
            setTimeout(() => {
                console.log(`🔄 Retrying initialization for user: ${this.userId}`);
                this.init();
            }, 5000);
        }
    }

    async initFirebase() {
        try {
            // Usar Firebase Admin já inicializado ou inicializar
            if (!admin.apps.length) {
                const serviceAccount = require('../../config/firebase/firebase-service-account.json');
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            }
            
            this.db = admin.firestore();
            console.log(`🔥 Firebase initialized for user: ${this.userId}`);
            
        } catch (error) {
            console.error(`❌ Firebase init error for ${this.userId}:`, error);
            throw error;
        }
    }

    async initClaude() {
        try {
            // Importar e inicializar Claude CLI Service com userId para processo dedicado
            const ClaudeCLIService = require('../services/ClaudeCLIService');
            this.claudeService = new ClaudeCLIService(this.userId);
            
            console.log(`🤖 Claude CLI initialized for user: ${this.userId}`);
            
        } catch (error) {
            console.error(`❌ Claude CLI init error for ${this.userId}:`, error);
            throw error;
        }
    }

    async createWhatsAppClient() {
        try {
            // Criar cliente isolado com clientId e diretório únicos
            this.client = new Client({
                authStrategy: new LocalAuth({
                    clientId: `whatsapp-bridge-${this.userId}`,
                    dataPath: `.wwebjs_auth/session-whatsapp-bridge-${this.userId}`
                }),
                puppeteer: {
                    headless: true,
                    args: [
                        ...WHATSAPP.PUPPETEER_ARGS,
                        `--user-data-dir=/tmp/chrome-${this.userId}`,
                        '--remote-debugging-port=0' // Porta automática
                    ]
                }
            });

            this.setupEventListeners();
            
            // Inicializar cliente
            await this.client.initialize();
            
        } catch (error) {
            console.error(`❌ WhatsApp client error for ${this.userId}:`, error.message);
            
            // Limpar diretório temporário Chrome em caso de erro
            try {
                const fs = require('fs');
                const path = `/tmp/chrome-${this.userId}`;
                if (fs.existsSync(path)) {
                    fs.rmSync(path, { recursive: true, force: true });
                    console.log(`🧹 Cleaned Chrome temp dir for user: ${this.userId}`);
                }
            } catch (cleanupError) {
                console.warn(`⚠️ Failed to cleanup Chrome dir: ${cleanupError.message}`);
            }
            
            throw error;
        }
    }

    setupEventListeners() {
        // QR Code
        this.client.on('qr', async (qr) => {
            try {
                console.log(`📱 QR Code generated for user: ${this.userId}`);
                
                // Converter para imagem usando configuração centralizada
                const qrCodeImageBase64 = await QRCode.toDataURL(qr, WHATSAPP.QR_CODE_CONFIG);
                
                // Atualizar no Firebase
                await this.db.collection(FIREBASE.COLLECTIONS.USER_SESSIONS).doc(this.userId).update({
                    status: FIREBASE.STATUS.NEEDS_QR,
                    qrCode: qrCodeImageBase64,
                    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                console.log(`✅ QR Code sent to Firebase for user: ${this.userId}`);
                
            } catch (error) {
                console.error(`❌ QR Code error for ${this.userId}:`, error);
            }
        });

        // Pronto
        this.client.on('ready', async () => {
            try {
                console.log(`🎉 WhatsApp ready for user: ${this.userId}`);
                this.isReady = true;
                
                const sessionInfo = this.client.info;
                
                // Atualizar status no Firebase
                await this.db.collection(FIREBASE.COLLECTIONS.USER_SESSIONS).doc(this.userId).update({
                    status: FIREBASE.STATUS.CONNECTED,
                    qrCode: null,
                    connectedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    whatsappInfo: {
                        wid: sessionInfo.wid._serialized,
                        pushname: sessionInfo.pushname,
                        platform: sessionInfo.platform
                    },
                    processId: process.pid
                });
                
                // Salvar informações da sessão (histórico)
                await this.db.collection(FIREBASE.COLLECTIONS.SESSIONS).add({
                    userId: this.userId,
                    wid: sessionInfo.wid._serialized,
                    pushname: sessionInfo.pushname,
                    platform: sessionInfo.platform,
                    status: 'connected',
                    processId: process.pid,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                console.log(`✅ Session established for user: ${this.userId} (${sessionInfo.pushname})`);
                
            } catch (error) {
                console.error(`❌ Ready event error for ${this.userId}:`, error);
            }
        });

        // Mensagem recebida
        this.client.on('message', async (message) => {
            await this.handleMessage(message);
        });

        // Autenticação bem-sucedida
        this.client.on('authenticated', () => {
            console.log(`✅ Authentication successful for user: ${this.userId}`);
        });

        // Falha de autenticação
        this.client.on('auth_failure', async (msg) => {
            console.error(`❌ Authentication failed for user ${this.userId}:`, msg);
            
            await this.db.collection('user_sessions').doc(this.userId).update({
                status: 'auth_failed',
                error: msg,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        // Desconectado
        this.client.on('disconnected', async (reason) => {
            console.warn(`❌ Disconnected for user ${this.userId}:`, reason);
            this.isReady = false;
            
            // Encerrar Claude CLI para evitar acúmulo de terminais
            if (this.claudeService) {
                console.log(`🧹 Cleaning up Claude CLI for disconnected user: ${this.userId}`);
                await this.claudeService.cleanup();
                this.claudeService = null;
            }
            
            await this.db.collection('user_sessions').doc(this.userId).update({
                status: 'disconnected',
                disconnectedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
    }

    /**
     * Cleanup completo do worker - encerra WhatsApp e Claude CLI
     */
    async cleanup() {
        console.log(`🧹 Starting cleanup for user: ${this.userId}`);
        
        try {
            // Encerrar Claude CLI primeiro
            if (this.claudeService) {
                console.log(`🤖 Cleaning up Claude CLI for user: ${this.userId}`);
                await this.claudeService.cleanup();
                this.claudeService = null;
            }
            
            // Encerrar cliente WhatsApp
            if (this.client) {
                console.log(`📱 Destroying WhatsApp client for user: ${this.userId}`);
                await this.client.destroy();
                this.client = null;
            }
            
            // Limpar diretório temporário Chrome
            try {
                const fs = require('fs');
                const path = `/tmp/chrome-${this.userId}`;
                if (fs.existsSync(path)) {
                    fs.rmSync(path, { recursive: true, force: true });
                    console.log(`🧹 Cleaned Chrome temp dir for user: ${this.userId}`);
                }
            } catch (cleanupError) {
                console.warn(`⚠️ Failed to cleanup Chrome dir: ${cleanupError.message}`);
            }
            
            console.log(`✅ Cleanup completed for user: ${this.userId}`);
            
        } catch (error) {
            console.error(`❌ Error during cleanup for user ${this.userId}:`, error.message);
        }
    }

    async handleMessage(message) {
        try {
            // Ignorar status broadcasts
            if (message.from === 'status@broadcast') return;
            
            console.log(`📥 Message received for user ${this.userId} from ${message.from}: ${message.body ? message.body.substring(0, 50) : '[media]'}...`);
            
            let messageText = message.body || '';
            let attachments = [];
            
            // Processar anexos (imagens, documentos, etc.)
            if (message.hasMedia) {
                try {
                    console.log(`📎 Processing media for user ${this.userId}`);
                    const media = await message.downloadMedia();
                    
                    if (media) {
                        // Salvar mídia temporariamente
                        const fs = require('fs');
                        const path = require('path');
                        const tempDir = path.join(__dirname, '../../temp', this.userId);
                        
                        // Criar diretório temporário se não existir
                        if (!fs.existsSync(tempDir)) {
                            fs.mkdirSync(tempDir, { recursive: true });
                        }
                        
                        // Gerar nome único para o arquivo
                        const timestamp = Date.now();
                        const extension = media.mimetype.split('/')[1] || 'bin';
                        const filename = `media_${timestamp}.${extension}`;
                        const filepath = path.join(tempDir, filename);
                        
                        // Salvar arquivo
                        fs.writeFileSync(filepath, media.data, 'base64');
                        
                        attachments.push({
                            path: filepath,
                            mimetype: media.mimetype,
                            filename: filename
                        });
                        
                        console.log(`💾 Media saved for user ${this.userId}: ${filename}`);
                        
                        // Se não há texto, adicionar descrição da mídia
                        if (!messageText.trim()) {
                            messageText = `Usuário enviou uma ${media.mimetype.includes('image') ? 'imagem' : 'mídia'}. Por favor, analise o conteúdo.`;
                        }
                    }
                } catch (mediaError) {
                    console.error(`❌ Error processing media for user ${this.userId}:`, mediaError);
                    messageText += ' [Erro ao processar mídia anexada]';
                }
            }
            
            // Se ainda não há texto, fornecer mensagem padrão
            if (!messageText.trim()) {
                messageText = 'Olá! Recebi sua mensagem.';
            }
            
            // Inicializar Claude CLI sob demanda (só quando primeira mensagem chegar)
            if (!this.claudeService) {
                console.log(`🎯 Primeira mensagem recebida! Inicializando Claude CLI para user: ${this.userId}`);
                await this.initClaude();
            }
            
            // Processar com Claude CLI (incluindo anexos se houver)
            const response = await this.claudeService.processMessage(messageText, attachments);
            
            // Limpar arquivos temporários
            if (attachments.length > 0) {
                attachments.forEach(attachment => {
                    try {
                        const fs = require('fs');
                        if (fs.existsSync(attachment.path)) {
                            fs.unlinkSync(attachment.path);
                            console.log(`🗑️ Temporary file cleaned: ${attachment.filename}`);
                        }
                    } catch (cleanupError) {
                        console.warn(`⚠️ Failed to cleanup file ${attachment.filename}:`, cleanupError);
                    }
                });
            }
            
            // Armazenar no Firebase
            await this.db.collection(FIREBASE.COLLECTIONS.MESSAGES).add({
                userId: this.userId,
                from: message.from,
                body: messageText,
                hasMedia: message.hasMedia,
                mediaCount: attachments.length,
                response: response,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Enviar resposta
            if (response) {
                await message.reply(response);
                console.log(`✅ Response sent for user ${this.userId}`);
            }
            
        } catch (error) {
            console.error(`❌ Message handling error for user ${this.userId}:`, error);
            
            // Enviar resposta de erro para o usuário
            try {
                await message.reply('Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.');
            } catch (replyError) {
                console.error(`❌ Failed to send error reply for user ${this.userId}:`, replyError);
            }
        }
    }

    async destroy() {
        try {
            console.log(`🛑 Destroying worker for user: ${this.userId}`);
            
            // Usar método cleanup completo
            await this.cleanup();
            
            console.log(`✅ Worker destroyed for user: ${this.userId}`);
            
        } catch (error) {
            console.error(`❌ Destroy error for user ${this.userId}:`, error);
        }
    }
}

// Inicializar worker com userId do environment
const userId = process.env.WORKER_USER_ID;
if (!userId) {
    console.error('❌ WORKER_USER_ID environment variable is required');
    process.exit(1);
}

const worker = new WhatsAppWorker(userId);

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log(`🛑 Received SIGTERM for user: ${userId}`);
    await worker.destroy();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log(`🛑 Received SIGINT for user: ${userId}`);
    await worker.destroy();
    process.exit(0);
});

module.exports = WhatsAppWorker;