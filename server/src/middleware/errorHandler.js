function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';

  if (status >= 500) {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);
  }

  res.status(status).json({
    error: status >= 500 && isProd ? 'Internal server error' : err.message || 'An error occurred',
    ...(isProd ? {} : { stack: err.stack }),
  });
}

module.exports = { errorHandler };
