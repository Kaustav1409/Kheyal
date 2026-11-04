const request = require('supertest');
const app = require('../src/app');
const { pool, query, close } = require('../src/config/db');
const { SESSION_COOKIE_NAME } = require('../src/middleware/auth');

describe('Authentication API & Database-Backed Sessions', () => {
  const userA = {
    email: `student_a_${Date.now()}@college.edu`,
    password: 'Password123!',
    timezone: 'Asia/Kolkata',
  };

  const userB = {
    email: `student_b_${Date.now()}@college.edu`,
    password: 'Password456!',
    timezone: 'Asia/Kolkata',
  };

  let userACookie = null;
  let userBCookie = null;

  afterAll(async () => {
    // Clean up test users and close pool
    await query('DELETE FROM users WHERE email IN ($1, $2, $3);', [
      userA.email.toLowerCase(),
      userB.email.toLowerCase(),
      'google_student@college.edu',
    ]);
    await close();
  });

  describe('GET /health', () => {
    it('returns 200 and server status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
    });
  });

  describe('POST /auth/signup', () => {
    it('rejects invalid inputs with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send({ email: 'not-an-email', password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toHaveLength(2);
    });

    it('creates a new user and returns HttpOnly session cookie', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send(userA);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Account created successfully');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe(userA.email.toLowerCase());
      expect(res.body.user).not.toHaveProperty('password_hash');

      // Check cookie header
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const sessionCookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain('HttpOnly');

      userACookie = sessionCookie.split(';')[0];
    });

    it('rejects duplicate email with 409 Conflict', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send(userA);

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });
  });

  describe('POST /auth/login', () => {
    it('rejects unknown email with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nonexistent@college.edu', password: 'Password123!' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password.');
    });

    it('rejects incorrect password with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: userA.email, password: 'WrongPassword999!' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password.');
    });

    it('authenticates user and returns fresh session cookie', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: userA.email, password: userA.password });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged in successfully');
      expect(res.body.user.email).toBe(userA.email.toLowerCase());

      const cookies = res.headers['set-cookie'];
      const sessionCookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain('HttpOnly');

      userACookie = sessionCookie.split(';')[0];
    });
  });

  describe('GET /auth/me (Protected Route)', () => {
    it('rejects unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Authentication required');
    });

    it('rejects invalid/tampered cookie with 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Cookie', [`${SESSION_COOKIE_NAME}=invalid_tampered_token_string_here`]);

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Session has expired or is invalid');
    });

    it('returns user profile when authenticated with valid session cookie', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Cookie', [userACookie]);

      expect(res.status).toBe(200);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe(userA.email.toLowerCase());
      expect(res.body.user).not.toHaveProperty('password_hash');
    });
  });

  describe('Two-User Isolation & Multi-Session Support', () => {
    it('allows User B to register and maintains independent session', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send(userB);

      expect(res.status).toBe(201);
      const cookies = res.headers['set-cookie'];
      const sessionCookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
      userBCookie = sessionCookie.split(';')[0];

      // Verify User A profile is User A
      const resA = await request(app).get('/auth/me').set('Cookie', [userACookie]);
      expect(resA.body.user.email).toBe(userA.email.toLowerCase());

      // Verify User B profile is User B
      const resB = await request(app).get('/auth/me').set('Cookie', [userBCookie]);
      expect(resB.body.user.email).toBe(userB.email.toLowerCase());

      // Verify IDs are distinct
      expect(resA.body.user.id).not.toBe(resB.body.user.id);
    });
  });

  describe('Google OAuth (/auth/google)', () => {
    it('authenticates with verified Google token and provisions session', async () => {
      const res = await request(app)
        .post('/auth/google')
        .send({ idToken: 'mock_test_token_google_student@college.edu' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Google');
      expect(res.body.user.email).toBe('google_student@college.edu');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });
  });

  describe('POST /auth/logout & Server-Side Revocation', () => {
    it('revokes the session in database and clears cookie', async () => {
      // Logout User A
      const res = await request(app)
        .post('/auth/logout')
        .set('Cookie', [userACookie]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');

      // Check cookie was cleared
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();

      // Subsequent request with the same cookie must fail (server-side revocation)
      const checkRes = await request(app)
        .get('/auth/me')
        .set('Cookie', [userACookie]);

      expect(checkRes.status).toBe(401);

      // Verify User B's session remains completely valid and unaffected
      const checkUserB = await request(app)
        .get('/auth/me')
        .set('Cookie', [userBCookie]);

      expect(checkUserB.status).toBe(200);
      expect(checkUserB.body.user.email).toBe(userB.email.toLowerCase());
    });
  });
});

