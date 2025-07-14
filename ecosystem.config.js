module.exports = {
  apps: [
    {
      name: 'whatsapp-bridge',
      script: 'src/index.js',
      cwd: '/workspaces/WhatApp-Multi',
      instances: 1,
      exec_mode: 'fork',
      
      // Environment
      env: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'info'
      },
      env_production: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'warn'
      },
      
      // Restart policy
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Logs
      log_file: './logs/pm2-combined.log',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Monitoring
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        '.wwebjs_auth',
        'temp'
      ],
      
      // Advanced settings
      source_map_support: true,
      instance_var: 'INSTANCE_ID',
      
      // Auto restart settings
      max_memory_restart: '1G',
      
      // Graceful shutdown
      kill_timeout: 5000,
      
      // Additional PM2 settings
      node_args: '--max-old-space-size=1024'
    },
    {
      name: 'keep-alive',
      script: 'scripts/keep-alive.js',
      cwd: '/workspaces/WhatApp-Multi',
      instances: 1,
      exec_mode: 'fork',
      
      // Environment
      env: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'info'
      },
      env_production: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'warn'
      },
      
      // Restart policy
      restart_delay: 10000,
      max_restarts: 5,
      min_uptime: '30s',
      
      // Logs
      log_file: './logs/keep-alive-combined.log',
      out_file: './logs/keep-alive-out.log',
      error_file: './logs/keep-alive-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Monitoring
      watch: false,
      max_memory_restart: '100M',
      
      // Graceful shutdown
      kill_timeout: 3000
    }
  ],
  
  deploy: {
    production: {
      user: 'ubuntu',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/whatsapp-bridge.git',
      path: '/opt/whatsapp-bridge',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install git -y'
    },
    staging: {
      user: 'ubuntu',
      host: ['staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:yourusername/whatsapp-bridge.git',
      path: '/opt/whatsapp-bridge-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging'
    }
  }
};