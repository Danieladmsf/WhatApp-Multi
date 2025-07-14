const logger = require('../utils/logger');

class SessionManager {
    constructor(client) {
        this.client = client;
        this.sessions = new Map();
        this.setupSessionHandlers();
    }

    setupSessionHandlers() {
        this.client.on('authenticated', () => {
            logger.info('Authentication successful');
        });

        this.client.on('auth_failure', (msg) => {
            logger.error('Authentication failed:', msg);
        });

        this.client.on('ready', () => {
            const sessionInfo = {
                id: this.client.info.wid._serialized,
                pushname: this.client.info.pushname,
                timestamp: Date.now()
            };
            
            this.sessions.set(sessionInfo.id, sessionInfo);
            logger.info('Session established:', sessionInfo);
        });

        this.client.on('disconnected', (reason) => {
            logger.warn('Session disconnected:', reason);
            this.clearSessions();
        });
    }

    getActiveSession() {
        return Array.from(this.sessions.values())[0] || null;
    }

    getAllSessions() {
        return Array.from(this.sessions.values());
    }

    clearSessions() {
        this.sessions.clear();
        logger.info('Sessions cleared');
    }

    async getSessionStats() {
        try {
            const state = await this.client.getState();
            const info = this.client.info;
            
            return {
                state: state,
                info: info,
                activeSessions: this.sessions.size,
                timestamp: Date.now()
            };
        } catch (error) {
            logger.error('Error getting session stats:', error);
            return null;
        }
    }
}

module.exports = SessionManager;