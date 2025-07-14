const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class CleanupService {
    constructor() {
        this.force = process.argv.includes('force');
        logger.info(`Cleanup service started ${this.force ? '(FORCE MODE)' : ''}`);
    }

    async cleanupLogs() {
        const logsDir = path.join(__dirname, '../../logs');
        
        if (!fs.existsSync(logsDir)) {
            logger.info('Logs directory does not exist, skipping log cleanup');
            return;
        }

        try {
            const files = fs.readdirSync(logsDir);
            const logFiles = files.filter(file => file.endsWith('.log'));
            
            for (const file of logFiles) {
                const filePath = path.join(logsDir, file);
                const stats = fs.statSync(filePath);
                const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
                
                if (daysSinceModified > 7 || this.force) {
                    fs.unlinkSync(filePath);
                    logger.info(`Deleted old log file: ${file}`);
                }
            }
            
            logger.info('Log cleanup completed');
        } catch (error) {
            logger.error('Error during log cleanup:', error);
        }
    }

    async cleanupAuthData() {
        const authDir = path.join(__dirname, '../../.wwebjs_auth');
        
        if (!fs.existsSync(authDir)) {
            logger.info('Auth directory does not exist, skipping auth cleanup');
            return;
        }

        if (this.force) {
            try {
                fs.rmSync(authDir, { recursive: true, force: true });
                logger.info('Force deleted auth directory');
            } catch (error) {
                logger.error('Error during auth cleanup:', error);
            }
        } else {
            logger.info('Auth directory exists but force mode not enabled');
        }
    }

    async cleanupTempFiles() {
        const tempDir = path.join(__dirname, '../../temp');
        
        if (!fs.existsSync(tempDir)) {
            logger.info('Temp directory does not exist, skipping temp cleanup');
            return;
        }

        try {
            const files = fs.readdirSync(tempDir);
            
            for (const file of files) {
                const filePath = path.join(tempDir, file);
                const stats = fs.statSync(filePath);
                const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
                
                if (daysSinceModified > 1 || this.force) {
                    if (stats.isDirectory()) {
                        fs.rmSync(filePath, { recursive: true, force: true });
                    } else {
                        fs.unlinkSync(filePath);
                    }
                    logger.info(`Deleted temp file/directory: ${file}`);
                }
            }
            
            logger.info('Temp cleanup completed');
        } catch (error) {
            logger.error('Error during temp cleanup:', error);
        }
    }

    async run() {
        logger.info('Starting cleanup process...');
        
        await this.cleanupLogs();
        await this.cleanupAuthData();
        await this.cleanupTempFiles();
        
        logger.info('Cleanup process completed');
    }
}

// Run cleanup if this file is executed directly
if (require.main === module) {
    const cleanup = new CleanupService();
    cleanup.run().catch(error => {
        logger.error('Cleanup failed:', error);
        process.exit(1);
    });
}

module.exports = CleanupService;