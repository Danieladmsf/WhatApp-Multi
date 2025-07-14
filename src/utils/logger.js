const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, service }) => {
            const levelIcon = {
                'info': '📋',
                'warn': '⚠️',
                'error': '❌',
                'debug': '🔍'
            };
            
            return `[${timestamp}] ${levelIcon[level] || '📋'} ${level.toUpperCase().padEnd(5)} | ${message}`;
        })
    ),
    defaultMeta: { service: 'whatsapp-bridge' },
    transports: [
        // Write all logs with importance level of `error` or less to `error.log`
        new winston.transports.File({ 
            filename: path.join(logsDir, 'error.log'), 
            level: 'error' 
        }),
        // Write all logs to `app.log`
        new winston.transports.File({ 
            filename: path.join(logsDir, 'app.log') 
        }),
        // Write all logs to `out.log`
        new winston.transports.File({ 
            filename: path.join(logsDir, 'out.log') 
        })
    ]
});

// Always log to console with nice formatting
logger.add(new winston.transports.Console({
    format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(({ timestamp, level, message }) => {
            const levelIcon = {
                'info': '📋',
                'warn': '⚠️',
                'error': '❌',
                'debug': '🔍'
            };
            
            return `[${timestamp}] ${levelIcon[level.replace(/\x1b\[[0-9;]*m/g, '')] || '📋'} ${level.toUpperCase().padEnd(15)} | ${message}`;
        })
    )
}));

module.exports = logger;