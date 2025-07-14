require('dotenv').config();

const ProcessManager = require('./ProcessManager');
const FirebaseService = require('../services/FirebaseService');
const logger = require('../utils/logger');
const { FIREBASE } = require('../constants/config');

/**
 * WhatsApp Multi-Process Bridge
 * Gerencia múltiplos processos isolados para conexões WhatsApp simultâneas
 */
class WhatsAppBridge {
    constructor() {
        this.processManager = new ProcessManager();
        this.firebaseService = new FirebaseService();
        this.userSessionsListener = null;
    }

    /**
     * Inicializa a bridge multi-processo
     */
    async start() {
        try {
            logger.info('=== WhatsApp Multi-Process Bridge Starting ===');
            
            await this._initializeFirebase();
            await this._setupUserSessionsListener();
            await this._recoverActiveConnections();
            await this._displaySystemStatus();
            
        } catch (error) {
            logger.error('❌ Failed to start WhatsApp Bridge:', error);
            process.exit(1);
        }
    }

    /**
     * Inicializa e testa conexão com Firebase
     * @private
     */
    async _initializeFirebase() {
        logger.info('✓ Step 1: Checking Firebase connection...');
        
        if (!this.firebaseService.isInitialized()) {
            logger.error('❌ Firebase: Connection failed');
            process.exit(1);
        }
        
        logger.info('✅ Firebase: Connected successfully');
        await this._testFirebaseConnection();
    }

    /**
     * Testa operações de leitura/escrita no Firebase
     * @private
     */
    async _testFirebaseConnection() {
        try {
            const testDoc = await this.firebaseService.db
                .collection(FIREBASE.COLLECTIONS.CONNECTION_TEST)
                .add({
                    timestamp: new Date(),
                    test: true
                });
            
            await this.firebaseService.db
                .collection(FIREBASE.COLLECTIONS.CONNECTION_TEST)
                .doc(testDoc.id)
                .delete();
            
            logger.info('✅ Firebase: Read/Write operations working');
        } catch (error) {
            logger.error('❌ Firebase: Connection test failed:', error.message);
            throw error;
        }
    }

    /**
     * Configura listener para mudanças em user_sessions
     * @private
     */
    async _setupUserSessionsListener() {
        logger.info('✓ Step 2: Setting up user_sessions listener...');
        
        this.userSessionsListener = this.firebaseService.listenToUserSessions((snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added' || change.type === 'modified') {
                    const userId = change.doc.id;
                    const userData = change.doc.data();
                    
                    if (userData.status === FIREBASE.STATUS.CREATE_REQUESTED) {
                        logger.info(`🔔 New connection request from user: ${userId}`);
                        await this._handleUserConnectionRequest(userId);
                    }
                }
            });
        });
    }

    /**
     * Recupera conexões ativas após restart
     * @private
     */
    async _recoverActiveConnections() {
        logger.info('✓ Step 3: Checking for active connections to recover...');
        
        try {
            // Buscar sessões conectadas no Firebase
            const activeSessions = await this.firebaseService.getActiveUserSessions();
            
            if (activeSessions.length === 0) {
                logger.info('📊 No active sessions found - starting fresh');
                return;
            }
            
            logger.info(`🔄 Found ${activeSessions.length} active session(s) to recover`);
            
            // Recuperar sessões sequencialmente para evitar conflitos do Puppeteer
            for (const session of activeSessions) {
                await this._recoverUserSession(session);
                // Aguardar um pouco entre as conexões para evitar conflitos
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
        } catch (error) {
            logger.error('❌ Error during connection recovery:', error);
        }
    }

    /**
     * Recupera sessão específica do usuário
     * @private
     * @param {Object} session - Dados da sessão do Firebase
     */
    async _recoverUserSession(session) {
        const { userId } = session;
        
        try {
            logger.info(`🔄 Attempting to recover session for user: ${userId}`);
            
            // Verificar se tem sessão WhatsApp local
            const hasLocalSession = await this.firebaseService.checkLocalWhatsAppSession(userId);
            
            if (!hasLocalSession) {
                logger.warn(`⚠️ No local WhatsApp session found for user: ${userId}`);
                // Marcar como desconectado no Firebase
                await this.firebaseService.updateUserSession(userId, {
                    status: FIREBASE.STATUS.DISCONNECTED,
                    disconnectedAt: new Date(),
                    reason: 'Local session not found after restart'
                });
                return;
            }
            
            // Verificar se processo já existe
            if (this.processManager.isUserProcessActive(userId)) {
                logger.info(`✅ Process already active for user: ${userId}`);
                return;
            }
            
            // Criar processo para reconectar
            logger.info(`🚀 Recreating process for user: ${userId}`);
            await this.processManager.createUserProcess(userId);
            
            logger.info(`✅ Successfully recovered session for user: ${userId}`);
            
        } catch (error) {
            logger.error(`❌ Failed to recover session for user ${userId}:`, error);
            
            // Marcar como erro no Firebase
            await this.firebaseService.updateUserSession(userId, {
                status: FIREBASE.STATUS.ERROR,
                error: `Recovery failed: ${error.message}`,
                errorAt: new Date()
            });
        }
    }

    /**
     * Exibe status do sistema
     * @private
     */
    async _displaySystemStatus() {
        logger.info('✓ Step 4: Multi-Process Bridge ready and listening...');
        logger.info('🎯 Waiting for user_sessions with status "create_requested"');
        logger.info('🔥 Each user will get their own isolated WhatsApp + Claude CLI process');
        
        const activeProcesses = this.processManager.getAllProcesses();
        if (activeProcesses.length > 0) {
            logger.info(`📊 Active processes: ${activeProcesses.length}`);
            activeProcesses.forEach(proc => {
                logger.info(`   - User: ${proc.userId}, PID: ${proc.pid}, Status: ${proc.status}`);
            });
        } else {
            logger.info('📊 No active processes - ready for new connections');
        }
    }

    /**
     * Processa solicitação de conexão do usuário
     * @private
     * @param {string} userId - ID do usuário
     */
    async _handleUserConnectionRequest(userId) {
        try {
            logger.info(`🚀 Processing connection request for user: ${userId}`);
            
            // Verificar se já existe processo para este usuário
            if (this.processManager.isUserProcessActive(userId)) {
                logger.warn(`⚠️ Process already exists for user: ${userId}, destroying old one`);
                await this.processManager.destroyUserProcess(userId);
            }
            
            // Criar novo processo isolado para este usuário
            await this.processManager.createUserProcess(userId);
            
            logger.info(`✅ Process created successfully for user: ${userId}`);
            
        } catch (error) {
            logger.error(`❌ Error processing connection request for user ${userId}:`, error);
            
            // Marcar como erro no Firebase
            await this.firebaseService.updateUserSession(userId, {
                status: FIREBASE.STATUS.ERROR,
                error: error.message,
                errorAt: new Date()
            });
        }
    }

    /**
     * Cleanup graceful - para todos os processos e listeners
     */
    async cleanup() {
        logger.info('🧹 Shutting down WhatsApp Multi-Process Bridge...');
        
        // Cleanup all user processes
        await this.processManager.cleanup();
        
        // Stop Firebase listener
        if (this.userSessionsListener) {
            this.userSessionsListener();
            logger.info('✅ Firebase listener stopped');
        }
        
        logger.info('✅ Cleanup completed');
    }
}

module.exports = WhatsAppBridge;