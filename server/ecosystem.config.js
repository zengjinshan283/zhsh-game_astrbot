module.exports = {
  apps: [{
    name: 'zhsh-game',
    script: 'src/app.js',
    cwd: '/www/wwwroot/zhsh.xinanc.cn/server',
    exec_mode: 'fork',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      WS_PORT: 8282
    },
    autorestart: true,
    max_memory_restart: '200M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/error.log',
    out_file: './logs/out.log'
  }]
};
