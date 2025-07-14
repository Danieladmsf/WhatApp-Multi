// Configurações centralizadas do WhatsApp Bridge

module.exports = {
    // Configurações de processo
    PROCESS: {
        GRACEFUL_SHUTDOWN_TIMEOUT: 5000, // 5 segundos
        WORKER_SCRIPT: 'src/workers/WhatsAppWorker.js',
        MAX_RESTART_ATTEMPTS: 3
    },

    // Configurações do WhatsApp
    WHATSAPP: {
        SESSION_TIMEOUT: 300000, // 5 minutos
        QR_CODE_CONFIG: {
            width: 512,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        },
        PUPPETEER_ARGS: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-ipc-flooding-protection'
        ],
        MEDIA: {
            TEMP_DIR: 'temp',
            MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
            ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
            CLEANUP_DELAY: 60000 // 1 minuto
        }
    },

    // Configurações do Firebase
    FIREBASE: {
        COLLECTIONS: {
            USER_SESSIONS: 'user_sessions',
            SESSIONS: 'sessions',
            MESSAGES: 'messages',
            CONNECTION_TEST: '_connection_test'
        },
        STATUS: {
            CREATE_REQUESTED: 'create_requested',
            NEEDS_QR: 'needs_qr',
            CONNECTED: 'connected',
            DISCONNECTED: 'disconnected',
            ERROR: 'error',
            AUTH_FAILED: 'auth_failed'
        }
    },

    // Configurações de logs
    LOGGING: {
        LEVELS: ['error', 'warn', 'info', 'debug'],
        MAX_LOG_SIZE: '50m',
        MAX_FILES: 5
    }
};