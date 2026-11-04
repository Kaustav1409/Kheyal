const authService = require('../services/authService');
const { SESSION_COOKIE_NAME } = require('../middleware/auth');

const isProduction = process.env.NODE_ENV === 'production';

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: authService.SESSION_DURATION_MS,
    path: '/',
  });
}

async function signup(req, res, next) {
  try {
    const { email, password, timezone } = req.body;
    const { user, token } = await authService.signup({ email, password, timezone });

    setSessionCookie(res, token);
    return res.status(201).json({
      message: 'Account created successfully',
      user,
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.login({ email, password });

    setSessionCookie(res, token);
    return res.status(200).json({
      message: 'Logged in successfully',
      user,
    });
  } catch (err) {
    next(err);
  }
}

async function googleAuth(req, res, next) {
  try {
    const { idToken } = req.body;
    const { user, token } = await authService.googleAuth(idToken);

    setSessionCookie(res, token);
    return res.status(200).json({
      message: 'Authenticated with Google successfully',
      user,
    });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    return res.status(200).json({
      user: req.user,
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    if (req.session && req.session.id) {
      await authService.logout(req.session.id);
    }
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });
    return res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signup,
  login,
  googleAuth,
  getMe,
  logout,
};

