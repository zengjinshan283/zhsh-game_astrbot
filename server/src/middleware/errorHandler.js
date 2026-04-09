/**
 * 全局错误处理
 */
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${new Date().toISOString()} ${req.method} ${req.url}:`, err.message);
  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

module.exports = errorHandler;
