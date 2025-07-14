require('dotenv').config();

const WhatsAppBridge = require('./core/WhatsAppBridge');
const logger = require('./utils/logger');

// Start the application
const app = new WhatsAppBridge();
app.start();

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('🛑 Received SIGINT - shutting down gracefully...');
    await app.cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('🛑 Received SIGTERM - shutting down gracefully...');
    await app.cleanup();
    process.exit(0);
});

module.exports = WhatsAppBridge;