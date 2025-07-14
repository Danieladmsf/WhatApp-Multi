require('dotenv').config();

const WhatsAppBridge = require('./core/WhatsAppBridge');
const logger = require('./utils/logger');

// Health check endpoint for Render
const http = require('http');
const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'whatsapp-bridge' }));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    logger.info(`🌐 Health check server running on port ${PORT}`);
});

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