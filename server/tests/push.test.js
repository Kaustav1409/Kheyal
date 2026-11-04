const request = require('supertest');
const app = require('../src/app');
const { query, close } = require('../src/config/db');
const { SESSION_COOKIE_NAME } = require('../src/middleware/auth');
const { webpush } = require('../src/config/push');

describe('Milestone 8: Push Notification Endpoints & Test Dispatch', () => {
  const userA = {
    email: `push_user_a_${Date.now()}@college.edu`,
    password: 'Password123!',
  };

  const userB = {
    email: `push_user_b_${Date.now()}@college.edu`,
    password: 'Password123!',
  };

  let cookieA = null;
  let cookieB = null;
  let userIdA = null;
  let userIdB = null;

  beforeAll(async () => {
    // Register User A
    const resA = await request(app).post('/auth/signup').send(userA);
    cookieA = resA.headers['set-cookie'].find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`)).split(';')[0];
    userIdA = resA.body.user.id;

    // Register User B
    const resB = await request(app).post('/auth/signup').send(userB);
    cookieB = resB.headers['set-cookie'].find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`)).split(';')[0];
    userIdB = resB.body.user.id;
  });

  afterAll(async () => {
    await query('DELETE FROM users WHERE email IN ($1, $2);', [
      userA.email.toLowerCase(),
      userB.email.toLowerCase(),
    ]);
    await close();
  });

  const dummySub = {
    endpoint: `https://fcm.googleapis.com/fcm/send/test_token_${Date.now()}`,
    keys: {
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcDnVuIxqZhp0cg1bjwt30rNNoW7KGmnx5M92ubvn7G88',
      auth: 'tBHItJI5svbpez7KI4CCXg',
    },
  };

  it('GET /push/vapid-public-key returns 200 and a valid public key', async () => {
    const res = await request(app).get('/push/vapid-public-key');
    expect(res.status).toBe(200);
    expect(res.body.publicKey).toBeDefined();
    expect(res.body.publicKey.length).toBeGreaterThan(20);
  });

  it('POST /push/test rejects if user has no subscriptions', async () => {
    const res = await request(app)
      .post('/push/test')
      .set('Cookie', [cookieA]);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no active push subscriptions/i);
  });

  it('POST /push/subscribe saves subscription for User A', async () => {
    const res = await request(app)
      .post('/push/subscribe')
      .set('Cookie', [cookieA])
      .send(dummySub);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.subscriptionId).toBeDefined();
  });

  it('POST /push/test sends notification when User A has a subscription', async () => {
    // Mock webpush.sendNotification
    const originalSend = webpush.sendNotification;
    webpush.sendNotification = vi.fn().mockResolvedValue({ statusCode: 201 });

    try {
      const res = await request(app)
        .post('/push/test')
        .set('Cookie', [cookieA]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.deliveredCount).toBe(1);
      expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    } finally {
      webpush.sendNotification = originalSend;
    }
  });

  it('User B cannot see or trigger User A subscriptions', async () => {
    // User B still has 0 subscriptions
    const res = await request(app)
      .post('/push/test')
      .set('Cookie', [cookieB]);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no active push subscriptions/i);
  });

  it('DELETE /push/subscribe removes User A subscription', async () => {
    const res = await request(app)
      .delete('/push/subscribe')
      .set('Cookie', [cookieA])
      .send({ endpoint: dummySub.endpoint });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // After deleting, User A has no active subscriptions
    const testRes = await request(app)
      .post('/push/test')
      .set('Cookie', [cookieA]);

    expect(testRes.status).toBe(400);
  });
});
