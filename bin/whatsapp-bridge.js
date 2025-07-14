#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Set working directory to project root
const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);

// Load environment variables
require('dotenv').config();

// Check if required files exist
const requiredFiles = [
    'src/index.js',
    '.env'
];

const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
    console.error('❌ Missing required files:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    console.error('\nPlease run the installation script first:');
    console.error('bash scripts/deployment/install.sh');
    process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case 'start':
        console.log('🚀 Starting WhatsApp Bridge...');
        require('../src/index.js');
        break;
        
    case 'cleanup':
        console.log('🧹 Running cleanup...');
        require('../src/scripts/cleanup.js');
        break;
        
    case 'help':
    case '--help':
    case '-h':
        showHelp();
        break;
        
    case 'version':
    case '--version':
    case '-v':
        showVersion();
        break;
        
    default:
        if (command) {
            console.error(`❌ Unknown command: ${command}`);
            console.error('');
        }
        showHelp();
        process.exit(1);
}

function showHelp() {
    console.log('📱 WhatsApp Bridge CLI');
    console.log('');
    console.log('Usage: whatsapp-bridge [COMMAND]');
    console.log('');
    console.log('Commands:');
    console.log('  start     Start the WhatsApp Bridge service');
    console.log('  cleanup   Run cleanup tasks');
    console.log('  help      Show this help message');
    console.log('  version   Show version information');
    console.log('');
    console.log('Examples:');
    console.log('  whatsapp-bridge start');
    console.log('  whatsapp-bridge cleanup');
    console.log('');
    console.log('For service management, use:');
    console.log('  bash scripts/service/service-control.sh [start|stop|restart|status]');
    console.log('');
}

function showVersion() {
    try {
        const packageJson = require('../package.json');
        console.log(`WhatsApp Bridge v${packageJson.version}`);
    } catch (error) {
        console.log('WhatsApp Bridge (version unknown)');
    }
}