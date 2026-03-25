module.exports = {
  apps: [
    {
      name: 'erp_backend',
      script: './backend/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        DB_SERVER: '127.0.0.1'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'erp_frontend',
      script: 'node',
      args: './node_modules/serve/build/main.js -s dist -l 5173',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
