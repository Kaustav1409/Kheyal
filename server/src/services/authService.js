const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const userRepository = require('../repositories/userRepository');
const sessionRepository = require('../repositories/sessionRepository');

const SALT_ROUNDS = 10;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const RENEW_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes throttle for renewal writes

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function createSessionForUser(userId) {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const session = await sessionRepository.create({
    userId,
    tokenHash,
    expiresAt,
  });

  return { token, session, expiresAt };
}

async function signup({ email, password, timezone = 'Asia/Kolkata' }) {
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await userRepository.findByEmail(normalizedEmail);
  if (existingUser) {
    const error = new Error('An account with this email already exists.');
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await userRepository.create({
    email: normalizedEmail,
    passwordHash,
    timezone,
  });

  const { token, expiresAt } = await createSessionForUser(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      timezone: user.timezone,
      createdAt: user.created_at,
    },
    token,
    expiresAt,
  };
}

async function login({ email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await userRepository.findByEmail(normalizedEmail);
  if (!user || !user.password_hash) {
    const error = new Error('Invalid email or password.');
    error.status = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password.');
    error.status = 401;
    throw error;
  }

  const { token, expiresAt } = await createSessionForUser(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      timezone: user.timezone,
      createdAt: user.created_at,
    },
    token,
    expiresAt,
  };
}

async function verifyGoogleToken(idToken) {
  if (process.env.NODE_ENV === 'test' && idToken.startsWith('mock_test_token_')) {
    // Allows testing the Google OAuth flow cleanly in unit tests
    const email = idToken.replace('mock_test_token_', '');
    return { email, emailVerified: true };
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    const error = new Error('Google OAuth is not configured on this server.');
    error.status = 500;
    throw error;
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return {
    email: payload.email,
    emailVerified: payload.email_verified,
  };
}

async function googleAuth(idToken) {
  const { email, emailVerified } = await verifyGoogleToken(idToken);
  if (!emailVerified) {
    const error = new Error('Google email is not verified.');
    error.status = 401;
    throw error;
  }

  const normalizedEmail = email.toLowerCase().trim();
  let user = await userRepository.findByEmail(normalizedEmail);

  if (!user) {
    user = await userRepository.create({
      email: normalizedEmail,
      passwordHash: null,
      timezone: 'Asia/Kolkata',
    });
  }

  const { token, expiresAt } = await createSessionForUser(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      timezone: user.timezone,
      createdAt: user.created_at,
    },
    token,
    expiresAt,
  };
}

async function authenticateSession(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const activeSession = await sessionRepository.findActiveByTokenHash(tokenHash);
  if (!activeSession) {
    return null;
  }

  // Sliding expiry renewal throttled to RENEW_THRESHOLD_MS (15m)
  const lastActiveTime = new Date(activeSession.last_activity_at).getTime();
  const timeSinceLastActivity = Date.now() - lastActiveTime;

  if (timeSinceLastActivity > RENEW_THRESHOLD_MS) {
    const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await sessionRepository.renew(activeSession.session_id, newExpiresAt);
    activeSession.expires_at = newExpiresAt;
  }

  return {
    session: {
      id: activeSession.session_id,
      expiresAt: activeSession.expires_at,
    },
    user: {
      id: activeSession.user_id,
      email: activeSession.email,
      timezone: activeSession.timezone,
      createdAt: activeSession.user_created_at,
    },
  };
}

async function logout(sessionId) {
  if (sessionId) {
    await sessionRepository.revoke(sessionId);
  }
}

module.exports = {
  signup,
  login,
  googleAuth,
  authenticateSession,
  logout,
  hashToken,
  SESSION_DURATION_MS,
};
