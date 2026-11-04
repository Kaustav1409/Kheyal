const authService = require('../services/authService');

const SESSION_COOKIE_NAME = 'kheyal_session';

async function requireAuth(req, res, next) {
  try {
    // 1. Read token from cookie (preferred) or Authorization header
    let token = req.cookies ? req.cookies[SESSION_COOKIE_NAME] : null;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7);
    }

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required. Please log in.',
      });
    }

    // 2. Authenticate session token and perform sliding renewal
    const authResult = await authService.authenticateSession(token);
    if (!authResult) {
      // Clear invalid/expired cookie
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      return res.status(401).json({
        error: 'Session has expired or is invalid. Please log in again.',
      });
    }

    req.user = authResult.user;
    req.session = authResult.session;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  requireAuth,
  SESSION_COOKIE_NAME,
};

