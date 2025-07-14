const admin = require('firebase-admin');
const logger = require('../utils/logger');

class FirebaseService {
    constructor() {
        this.db = null;
        this.initialized = false;
        this.init();
    }

    async init() {
        try {
            if (!admin.apps.length) {
                const serviceAccount = require('../../config/firebase/firebase-service-account.json');
                
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    databaseURL: process.env.FIREBASE_DATABASE_URL
                });
            }

            this.db = admin.firestore();
            this.initialized = true;
            logger.info('Firebase service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Firebase:', error);
            this.initialized = false;
        }
    }

    async storeMessage(messageData) {
        if (!this.initialized) {
            logger.warn('Firebase not initialized, skipping message storage');
            return null;
        }

        try {
            const docRef = await this.db.collection('messages').add({
                ...messageData,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            logger.info('Message stored in Firebase:', docRef.id);
            return docRef.id;
        } catch (error) {
            logger.error('Error storing message:', error);
            return null;
        }
    }

    async getMessages(limit = 50) {
        if (!this.initialized) {
            logger.warn('Firebase not initialized');
            return [];
        }

        try {
            const snapshot = await this.db
                .collection('messages')
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            const messages = [];
            snapshot.forEach(doc => {
                messages.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return messages;
        } catch (error) {
            logger.error('Error getting messages:', error);
            return [];
        }
    }

    async storeSession(sessionData) {
        if (!this.initialized) {
            logger.warn('Firebase not initialized, skipping session storage');
            return null;
        }

        try {
            const docRef = await this.db.collection('sessions').add({
                ...sessionData,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            logger.info('Session stored in Firebase:', docRef.id);
            return docRef.id;
        } catch (error) {
            logger.error('Error storing session:', error);
            return null;
        }
    }

    // Método para escutar mudanças em user_sessions
    listenToUserSessions(callback) {
        if (!this.initialized) {
            logger.warn('Firebase not initialized, cannot listen to user_sessions');
            return null;
        }

        try {
            const unsubscribe = this.db.collection('user_sessions')
                .where('status', '==', 'create_requested')
                .onSnapshot(callback);
            
            logger.info('✅ Firebase: Listening to user_sessions for create_requested status');
            return unsubscribe;
        } catch (error) {
            logger.error('❌ Firebase: Error listening to user_sessions:', error);
            return null;
        }
    }

    // Método para atualizar status da sessão do usuário
    async updateUserSession(userId, updateData) {
        if (!this.initialized) {
            logger.warn('Firebase not initialized, cannot update user session');
            return false;
        }

        try {
            await this.db.collection('user_sessions').doc(userId).update({
                ...updateData,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            logger.info(`✅ Firebase: Updated user session ${userId} with status: ${updateData.status}`);
            return true;
        } catch (error) {
            logger.error(`❌ Firebase: Error updating user session ${userId}:`, error);
            return false;
        }
    }

    // Método para buscar sessões conectadas ativas
    async getActiveUserSessions() {
        if (!this.initialized) {
            logger.warn('Firebase not initialized, cannot get active sessions');
            return [];
        }

        try {
            // Buscar usuários com status que indicam sessão ativa
            const snapshot = await this.db.collection('user_sessions')
                .where('status', 'in', ['connected', 'needs_qr', 'qr_generated'])
                .get();
            
            const activeSessions = [];
            
            // Verificar cada sessão para confirmar se tem dados locais válidos
            for (const doc of snapshot.docs) {
                const userId = doc.id;
                const data = doc.data();
                
                // Verificar se tem sessão local válida
                const hasLocalSession = await this.checkLocalWhatsAppSession(userId);
                
                if (hasLocalSession) {
                    activeSessions.push({
                        userId: userId,
                        ...data
                    });
                    logger.info(`✅ Found active session for user: ${userId} (status: ${data.status})`);
                } else {
                    logger.warn(`⚠️ User ${userId} has Firebase status '${data.status}' but no local session - skipping recovery`);
                }
            }
            
            logger.info(`✅ Firebase: Found ${activeSessions.length} active user sessions with valid local data`);
            return activeSessions;
        } catch (error) {
            logger.error('❌ Firebase: Error getting active sessions:', error);
            return [];
        }
    }

    // Método para verificar se usuário tem sessão WhatsApp local
    async checkLocalWhatsAppSession(userId) {
        const fs = require('fs');
        const path = require('path');
        
        try {
            // Verificar ambos os formatos de sessão (novo e antigo)
            const newSessionPath = path.join(__dirname, '../../.wwebjs_auth', `session-${userId}`);
            const oldSessionPath = path.join(__dirname, '../../.wwebjs_auth', `session-whatsapp-bridge-${userId}`);
            
            // Verificar novo formato primeiro
            if (fs.existsSync(newSessionPath)) {
                const sessionFiles = fs.readdirSync(newSessionPath);
                if (sessionFiles.length > 0) {
                    return true;
                }
            }
            
            // Verificar formato antigo
            if (fs.existsSync(oldSessionPath)) {
                const sessionFiles = fs.readdirSync(oldSessionPath);
                if (sessionFiles.length > 0) {
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            logger.warn(`⚠️ Error checking local session for user ${userId}:`, error.message);
            return false;
        }
    }

    isInitialized() {
        return this.initialized;
    }
}

module.exports = FirebaseService;