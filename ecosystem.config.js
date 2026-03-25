module.exports = {
  apps: [
    {
      name: 'hong-hoang-api',
      script: './dist/index.js',
      cwd: './server',
      instances: 'max', // or a specific number like 4
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
