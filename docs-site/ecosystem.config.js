module.exports = {
  apps: [
    {
      name: 'asi-docs',
      script: 'npm',
      args: 'run serve',
      cwd: '/var/www/docs',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/asi-docs-error.log',
      out_file: '/var/log/pm2/asi-docs-out.log',
      log_file: '/var/log/pm2/asi-docs-combined.log',
      time: true,
      merge_logs: true,
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Health check
      min_uptime: '10s',
      max_restarts: 10,
      
      // Monitoring
      instance_var: 'INSTANCE_ID',
      
      // Environment-specific settings
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3002,
        watch: true,
      },
    },
  ],
  
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'docs.asi-chain.io',
      ref: 'origin/main',
      repo: 'git@github.com:asi-alliance/asi-chain.git',
      path: '/var/www/docs',
      'post-deploy': 'cd docs-site && npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': 'echo "Deploying to production..."',
    },
    staging: {
      user: 'ubuntu',
      host: 'staging.docs.asi-chain.io',
      ref: 'origin/feature/documentation-site',
      repo: 'git@github.com:asi-alliance/asi-chain.git',
      path: '/var/www/docs-staging',
      'post-deploy': 'cd docs-site && npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      'pre-deploy-local': 'echo "Deploying to staging..."',
    },
  },
};